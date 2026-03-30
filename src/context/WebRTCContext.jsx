import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { getTurnCredentials } from '../api/webrtc';
import toast from 'react-hot-toast';

const WebRTCContext = createContext(null);

// ── HD Audio Constraints (48kHz, noise-suppressed) ────
const HD_AUDIO = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  sampleSize: 16,
  channelCount: 1,
};

// ── HD Video Constraints (up to 1080p @ 30fps) ────────
const HD_VIDEO = {
  width: { min: 640, ideal: 1920, max: 1920 },
  height: { min: 480, ideal: 1080, max: 1080 },
  frameRate: { min: 24, ideal: 30, max: 60 },
  facingMode: 'user',
  aspectRatio: { ideal: 16 / 9 },
};

// ── Fallback ICE Servers ──────────────────────────────
const FALLBACK_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// ── SDP Enhancement for max audio quality ─────────────
function enhanceSDP(sdp) {
  // Boost Opus to 128kbps with FEC and no DTX
  let enhanced = sdp.replace(
    /a=fmtp:111 /g,
    'a=fmtp:111 maxaveragebitrate=128000;stereo=0;sprop-stereo=0;useinbandfec=1;usedtx=0;'
  );
  return enhanced;
}

// ── Set HD bitrates on senders ────────────────────────
function setHDBitrates(pc) {
  const senders = pc.getSenders();
  senders.forEach((sender) => {
    if (!sender.track) return;
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }

    if (sender.track.kind === 'audio') {
      params.encodings[0].maxBitrate = 128000; // 128 kbps Opus
    } else if (sender.track.kind === 'video') {
      params.encodings[0].maxBitrate = 2500000; // 2.5 Mbps HD video
      params.encodings[0].maxFramerate = 30;
      params.encodings[0].scaleResolutionDownBy = 1.0; // Full resolution
    }

    sender.setParameters(params).catch((err) => {
      console.warn('[WebRTC] Failed to set bitrate:', err.message);
    });
  });
}

// ── Adaptive quality monitor ──────────────────────────
function startQualityMonitor(pc) {
  const interval = setInterval(async () => {
    if (pc.connectionState !== 'connected') {
      clearInterval(interval);
      return;
    }

    try {
      const stats = await pc.getStats();
      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.nominated) {
          const rtt = report.currentRoundTripTime;
          if (typeof rtt !== 'number') return;

          pc.getSenders().forEach((sender) => {
            if (sender.track?.kind !== 'video') return;
            const params = sender.getParameters();
            if (!params.encodings?.[0]) return;

            if (rtt < 0.1) {
              // Excellent — full HD
              params.encodings[0].maxBitrate = 2500000;
              params.encodings[0].scaleResolutionDownBy = 1.0;
            } else if (rtt < 0.3) {
              // Good — slightly reduce
              params.encodings[0].maxBitrate = 1500000;
              params.encodings[0].scaleResolutionDownBy = 1.0;
            } else {
              // Poor — lower to stay smooth
              params.encodings[0].maxBitrate = 800000;
              params.encodings[0].scaleResolutionDownBy = 1.5;
            }
            sender.setParameters(params).catch(() => {});
          });
        }
      });
    } catch {}
  }, 5000);

  return interval;
}

// ── User-friendly permission error messages ───────────
function handleMediaError(err, type) {
  const isVideo = type === 'video';
  const device = isVideo ? 'camera and microphone' : 'microphone';

  switch (err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      toast.error(
        `${isVideo ? 'Camera & Mic' : 'Microphone'} access denied. Please allow ${device} access in your browser settings to make ${isVideo ? 'Face to Face' : 'voice'} calls.`,
        { duration: 6000 }
      );
      break;
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      toast.error(
        `No ${isVideo ? 'camera or microphone' : 'microphone'} detected. Please connect a device and try again.`,
        { duration: 5000 }
      );
      break;
    case 'NotReadableError':
    case 'TrackStartError':
      toast.error(
        'Your mic/camera is being used by another app. Close it and try again.',
        { duration: 5000 }
      );
      break;
    case 'OverconstrainedError':
      toast.error(
        'Your camera does not support the requested resolution. Trying with lower quality...',
        { duration: 4000 }
      );
      break;
    default:
      toast.error(
        `Could not start ${isVideo ? 'Face to Face' : 'voice'} call. ${err.message || 'Please try again.'}`,
        { duration: 5000 }
      );
  }
}

export function WebRTCProvider({ children }) {
  const { send, on } = useSocket();
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callState, setCallState] = useState('idle');
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const qualityMonitorRef = useRef(null);
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
    if (qualityMonitorRef.current) {
      clearInterval(qualityMonitorRef.current);
      qualityMonitorRef.current = null;
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
    let iceServers = FALLBACK_ICE_SERVERS;
    try {
      const turnRes = await getTurnCredentials();
      if (turnRes.success && turnRes.data?.iceServers) {
        iceServers = turnRes.data.iceServers;
      }
    } catch (err) {
      console.warn('[WebRTC] TURN credentials fetch failed, using STUN fallback:', err.message);
    }

    const pc = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 5,
    });
    peerConnectionRef.current = pc;

    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received:', event.track.kind);
      remoteStreamRef.current = event.streams[0];
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
        // Set HD bitrates once connected
        setHDBitrates(pc);
        // Start adaptive quality monitoring
        qualityMonitorRef.current = startQualityMonitor(pc);
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        toast.error('Call disconnected');
        endCall();
      }
    };

    return pc;
  }, [send, activeCall?.userId, incomingCall?.userId]);

  // Get local media stream with HD constraints + fallback
  const getLocalStream = useCallback(async (type = 'audio') => {
    const constraints = {
      audio: HD_AUDIO,
      video: type === 'video' ? HD_VIDEO : false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      // If HD video fails due to OverconstrainedError, try lower resolution
      if (type === 'video' && (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError')) {
        console.warn('[WebRTC] HD video not supported, falling back to SD');
        toast('Camera doesn\'t support HD — using standard quality', { icon: 'i', duration: 3000 });
        const fallback = {
          audio: HD_AUDIO,
          video: { facingMode: 'user', width: 640, height: 480, frameRate: 30 },
        };
        const stream = await navigator.mediaDevices.getUserMedia(fallback);
        localStreamRef.current = stream;
        return stream;
      }
      throw err; // Re-throw for caller to handle
    }
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
      offer.sdp = enhanceSDP(offer.sdp);
      await pc.setLocalDescription(offer);

      send('CALL_SIGNAL', {
        targetUserId: userId,
        signalType: 'offer',
        sdp: offer.sdp,
        callType: type,
        callerUsername: user?.username,
      });

      console.log('[WebRTC] HD offer sent to', userId);
    } catch (err) {
      console.error('[WebRTC] Start call error:', err);
      handleMediaError(err, type);
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

      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: incomingCall.sdp,
      }));

      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      answer.sdp = enhanceSDP(answer.sdp);
      await pc.setLocalDescription(answer);

      send('CALL_SIGNAL', {
        targetUserId: incomingCall.userId,
        signalType: 'answer',
        sdp: answer.sdp,
      });

      setIncomingCall(null);
      console.log('[WebRTC] HD answer sent');
    } catch (err) {
      console.error('[WebRTC] Accept call error:', err);
      handleMediaError(err, incomingCall?.type || 'audio');
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
    setCallState('idle');
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
          if (activeCall || callState !== 'idle') {
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
          const pc = peerConnectionRef.current;
          if (pc && pc.signalingState === 'have-local-offer') {
            pc.setRemoteDescription(new RTCSessionDescription({
              type: 'answer',
              sdp: data.sdp,
            })).then(() => {
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
