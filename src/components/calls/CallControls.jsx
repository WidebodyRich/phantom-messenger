import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2 } from 'lucide-react';

export default function CallControls({ muted, videoEnabled, onToggleMute, onToggleVideo, onEndCall }) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onToggleMute}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          muted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
        }`}
      >
        {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      <button
        onClick={onToggleVideo}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          !videoEnabled ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
        }`}
      >
        {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
      </button>

      <button
        onClick={onEndCall}
        className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all"
      >
        <PhoneOff className="w-6 h-6" />
      </button>
    </div>
  );
}
