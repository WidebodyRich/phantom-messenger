import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="flex flex-col items-center gap-4"
      >
        <img
          src="/phantom-logo.png"
          alt="Phantom Messenger"
          className="w-14 h-14 object-contain"
          draggable={false}
          style={{ background: 'transparent' }}
        />
        <p className="text-phantom-gray-400 text-sm font-medium">Loading...</p>
      </motion.div>
    </div>
  );
}
