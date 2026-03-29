import { useState, useRef, useCallback } from 'react';
import { getTurnCredentials } from '../api/webrtc';

export function useWebRTC() {
  const [callState, setCallState] = useState('idle'); // idle, calling, ringing, connected, ended
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const initCall = useCallback(async (type = 'audio') => {
    try {
      // Get TURN credentials
      const turnRes = await getTurnCredentials();
      const iceServers = turnRes.success ? turnRes.data.iceServers : [{ urls: 'stun:stun.l.google.com:19302' }];

      // Get local media
      const constraints = {
        audio: true,
        video: type === 'video' ? { facingMode: 'user', width: 640, height: 480 } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // TODO: Send ICE candidate via signaling
          console.log('ICE candidate:', event.candidate);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setCallState('connected');
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') endCall();
      };

      setCallState('calling');
      return pc;
    } catch (err) {
      console.error('WebRTC init error:', err);
      setCallState('idle');
      throw err;
    }
  }, []);

  const endCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    remoteStreamRef.current = null;
    setCallState('idle');
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
    }
  }, []);

  return {
    callState,
    initCall,
    endCall,
    toggleMute,
    toggleVideo,
    localStream: localStreamRef,
    remoteStream: remoteStreamRef,
  };
}
