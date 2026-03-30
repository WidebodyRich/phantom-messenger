import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { getTurnCredentials } from '../api/webrtc';
import toast from 'react-hot-toast';

const WebRTCContext = createContext(null);

export function WebRTCProvider({ children }) {
  const { send, on } = useSocket();
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle, calling, ringing, connected
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const ringtoneRef = useRef(null);

  // Clean up a call completely
  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    setCallState('idle');
    setActiveCall(null);
    setMuted(false);
    setVideoEnabled(true);
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current = null;
    }
  }, []);

  // Create RTCPeerConnection with TURN/STUN
  const createPeerConnection = useCallback(async () => {
    let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    try {
      const turnRes = await getTurnCredentials();
      if (turnRes.success && turnRes.data?.iceServers) {
        iceServers = turnRes.data.iceServers;
      }
    } catch (err) {
      console.warn('[WebRTC] TURN credentials fetch failed, using STUN fallback:', err.message);
    }

    const pc = new RTCPeerConnection({ iceServers });
    peerConnectionRef.current = pc;

    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received');
      remoteStreamRef.current = event.streams[0];
      // Force re-render for stream consumers
      setActiveCall((prev) => prev ? { ...prev, remoteStream: event.streams[0] } : prev);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const targetId = activeCall?.userId || incomingCall?.userId;
        if (targetId) {
          send('CALL_SIGNAL', {
            targetUserId: targetId,
            signalType: 'ice_candidate',
            candidate: event.candidate,
          });
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState('connected');
        setActiveCall((prev) => prev ? { ...prev, status: 'connected' } : prev);
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        toast.error('Call disconnected');
        endCall();
      }
    };

    return pc;
  }, [send, activeCall?.userId, incomingCall?.userId]);

  // Get local media stream
  const getLocalStream = useCallback(async (type = 'audio') => {
    const constraints = {
      audio: true,
      video: type === 'video' ? { facingMode: 'user', width: 640, height: 480 } : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    return stream;
  }, []);

  // Start an outgoing call
  const startCall = useCallback(async (userId, username, type = 'audio') => {
    if (activeCall || callState !== 'idle') {
      toast.error('Already in a call');
      return;
    }

    try {
      setCallState('calling');
      setVideoEnabled(type === 'video');
      setActiveCall({ userId, username, type, status: 'calling' });

      const stream = await getLocalStream(type);
      const pc = await createPeerConnection();

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      send('CALL_SIGNAL', {
        targetUserId: userId,
        signalType: 'offer',
        sdp: offer.sdp,
        callType: type,
        callerUsername: user?.username,
      });

      console.log('[WebRTC] Offer sent to', userId);
    } catch (err) {
      console.error('[WebRTC] Start call error:', err);
      toast.error(err.name === 'NotAllowedError' ? 'Microphone/camera permission denied' : 'Failed to start call');
      cleanup();
    }
  }, [activeCall, callState, getLocalStream, createPeerConnection, send, user?.username, cleanup]);

  // Accept an incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      setCallState('connected');
      setVideoEnabled(incomingCall.type === 'video');
      setActiveCall({ ...incomingCall, status: 'connecting' });

      const stream = await getLocalStream(incomingCall.type);
      const pc = await createPeerConnection();

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Set the remote offer
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: incomingCall.sdp,
      }));

      // Add any queued ICE candidates
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      send('CALL_SIGNAL', {
        targetUserId: incomingCall.userId,
        signalType: 'answer',
        sdp: answer.sdp,
      });

      setIncomingCall(null);
      console.log('[WebRTC] Answer sent');
    } catch (err) {
      console.error('[WebRTC] Accept call error:', err);
      toast.error('Failed to accept call');
      cleanup();
    }
  }, [incomingCall, getLocalStream, createPeerConnection, send, cleanup]);

  // Decline an incoming call
  const declineCall = useCallback(() => {
    if (incomingCall) {
      send('CALL_SIGNAL', {
        targetUserId: incomingCall.userId,
        signalType: 'hangup',
      });
    }
    setIncomingCall(null);
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current = null;
    }
  }, [incomingCall, send]);

  // End current call
  const endCall = useCallback(() => {
    const targetId = activeCall?.userId || incomingCall?.userId;
    if (targetId) {
      send('CALL_SIGNAL', {
        targetUserId: targetId,
        signalType: 'hangup',
      });
    }
    cleanup();
  }, [activeCall?.userId, incomingCall?.userId, send, cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // Listen for incoming WebRTC signals
  useEffect(() => {
    const unsubscribe = on('CALL_SIGNAL', (data) => {
      const { signalType, senderId, senderUsername } = data;
      console.log('[WebRTC] Received signal:', signalType, 'from', senderId);

      switch (signalType) {
        case 'offer': {
          // Incoming call
          if (activeCall || callState !== 'idle') {
            // Already in a call — auto-decline
            send('CALL_SIGNAL', { targetUserId: senderId, signalType: 'hangup' });
            return;
          }
          setIncomingCall({
            userId: senderId,
            username: senderUsername || data.callerUsername || 'Unknown',
            type: data.callType || 'audio',
            sdp: data.sdp,
          });
          setCallState('ringing');
          break;
        }

        case 'answer': {
          // Our call was accepted
          const pc = peerConnectionRef.current;
          if (pc && pc.signalingState === 'have-local-offer') {
            pc.setRemoteDescription(new RTCSessionDescription({
              type: 'answer',
              sdp: data.sdp,
            })).then(() => {
              // Add any queued ICE candidates
              for (const candidate of pendingCandidatesRef.current) {
                pc.addIceCandidate(new RTCIceCandidate(candidate));
              }
              pendingCandidatesRef.current = [];
            }).catch((err) => {
              console.error('[WebRTC] Set remote description error:', err);
            });
          }
          break;
        }

        case 'ice_candidate': {
          const pc = peerConnectionRef.current;
          if (pc && pc.remoteDescription) {
            pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch((err) => {
              console.error('[WebRTC] Add ICE candidate error:', err);
            });
          } else {
            // Queue candidates until remote description is set
            pendingCandidatesRef.current.push(data.candidate);
          }
          break;
        }

        case 'hangup': {
          if (incomingCall?.userId === senderId) {
            setIncomingCall(null);
            setCallState('idle');
            toast('Call cancelled', { icon: '📞' });
          } else if (activeCall?.userId === senderId) {
            toast('Call ended', { icon: '📞' });
            cleanup();
          }
          break;
        }
      }
    });

    return unsubscribe;
  }, [on, send, activeCall, incomingCall, callState, cleanup]);

  return (
    <WebRTCContext.Provider
      value={{
        activeCall,
        incomingCall,
        callState,
        muted,
        videoEnabled,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
        toggleVideo,
        localStream: localStreamRef,
        remoteStream: remoteStreamRef,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
}

export function useCallContext() {
  const ctx = useContext(WebRTCContext);
  if (!ctx) throw new Error('useCallContext must be used within WebRTCProvider');
  return ctx;
}
