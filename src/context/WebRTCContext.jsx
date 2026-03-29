import { createContext, useContext, useState, useCallback } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';

const WebRTCContext = createContext(null);

export function WebRTCProvider({ children }) {
  const webrtc = useWebRTC();
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  const startCall = useCallback(
    async (userId, username, type = 'audio') => {
      try {
        await webrtc.initCall(type);
        setActiveCall({ userId, username, type, status: 'calling' });
      } catch (err) {
        console.error('Start call error:', err);
      }
    },
    [webrtc]
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    try {
      await webrtc.initCall(incomingCall.type);
      setActiveCall({ ...incomingCall, status: 'connected' });
      setIncomingCall(null);
    } catch (err) {
      console.error('Accept call error:', err);
    }
  }, [incomingCall, webrtc]);

  const declineCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  const endCall = useCallback(() => {
    webrtc.endCall();
    setActiveCall(null);
  }, [webrtc]);

  return (
    <WebRTCContext.Provider
      value={{
        activeCall,
        incomingCall,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute: webrtc.toggleMute,
        toggleVideo: webrtc.toggleVideo,
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
