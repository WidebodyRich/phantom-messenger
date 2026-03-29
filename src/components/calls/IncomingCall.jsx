import { motion } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function IncomingCall({ call, onAccept, onDecline }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-elevated border border-phantom-gray-200 p-4 w-80"
    >
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={call?.username || 'User'} size="md" />
        <div className="flex-1">
          <p className="font-semibold text-phantom-charcoal">{call?.username || 'Unknown'}</p>
          <p className="text-sm text-phantom-gray-400">
            Incoming {call?.type === 'video' ? 'video' : 'voice'} call...
          </p>
        </div>
        {call?.type === 'video' && <Video className="w-5 h-5 text-phantom-gray-400" />}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onDecline}
          className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <PhoneOff className="w-4 h-4" /> Decline
        </button>
        <button
          onClick={onAccept}
          className="flex-1 bg-phantom-green hover:bg-phantom-green-dark text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Phone className="w-4 h-4" /> Accept
        </button>
      </div>
    </motion.div>
  );
}
