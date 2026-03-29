import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-14 h-14 bg-phantom-green rounded-2xl flex items-center justify-center">
          <MessageCircle className="w-8 h-8 text-white" />
        </div>
        <p className="text-phantom-gray-400 text-sm font-medium">Loading...</p>
      </motion.div>
    </div>
  );
}
