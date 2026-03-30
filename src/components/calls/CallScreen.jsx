import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';

export default function CallScreen({ call, localStream, remoteStream, muted, videoEnabled, onToggleMute, onToggleVideo, onEnd }) {
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Duration timer — only count when connected
  useEffect(() => {
    if (call?.status !== 'connected') return;
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, [call?.status]);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream?.current) {
      localVideoRef.current.srcObject = localStream.current;
    }
  }, [localStream, localStream?.current, videoEnabled]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream?.current) {
      remoteVideoRef.current.srcObject = remoteStream.current;
    }
  }, [remoteStream, remoteStream?.current, call?.remoteStream]);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const statusText = () => {
    switch (call?.status) {
      case 'calling': return 'Calling...';
      case 'connecting': return 'Connecting...';
      case 'connected': return formatDuration(duration);
      default: return 'Calling...';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-phantom-charcoal flex flex-col items-center justify-center"
    >
      {/* Remote video (full screen for video calls) */}
      {call?.type === 'video' && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* Overlay content */}
      <div className="relative z-10 flex flex-col items-center justify-between h-full py-16 px-6">
        {/* User info */}
        <div className="text-center">
          <div className="w-24 h-24 bg-phantom-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-phantom-green font-bold text-3xl">
              {(call?.username || '?')[0].toUpperCase()}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{call?.username || 'Unknown'}</h2>
          <p className="text-white/60 text-sm">{statusText()}</p>
          {call?.type === 'video' && call?.status !== 'connected' && (
            <p className="text-white/40 text-xs mt-1">Face to Face call</p>
          )}
        </div>

        {/* Local video PiP (small corner view) */}
        {call?.type === 'video' && videoEnabled && (
          <div className="absolute top-20 right-6 w-32 h-44 bg-phantom-charcoal rounded-2xl overflow-hidden shadow-elevated border border-white/10">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              muted ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {muted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>

          {call?.type === 'video' && (
            <button
              onClick={onToggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                !videoEnabled ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {videoEnabled ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
            </button>
          )}

          <button
            onClick={onEnd}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
