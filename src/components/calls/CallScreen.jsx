import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function CallScreen({ call, onEnd }) {
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(call?.type === 'video');
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-phantom-charcoal flex flex-col items-center justify-center"
    >
      {/* Remote video (if video call) */}
      {call?.type === 'video' && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-between h-full py-16 px-6">
        {/* User info */}
        <div className="text-center">
          <Avatar name={call?.username || 'User'} size="xl" className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-1">{call?.username || 'Unknown'}</h2>
          <p className="text-white/60 text-sm">
            {call?.status === 'ringing' ? 'Calling...' : formatDuration(duration)}
          </p>
        </div>

        {/* Local video (PiP) */}
        {call?.type === 'video' && videoEnabled && (
          <div className="absolute top-20 right-6 w-32 h-44 bg-phantom-charcoal rounded-2xl overflow-hidden shadow-elevated">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setMuted(!muted)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              muted ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {muted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>

          {call?.type === 'video' && (
            <button
              onClick={() => setVideoEnabled(!videoEnabled)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                !videoEnabled ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {videoEnabled ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
            </button>
          )}

          <button className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
            <Volume2 className="w-6 h-6 text-white" />
          </button>

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
