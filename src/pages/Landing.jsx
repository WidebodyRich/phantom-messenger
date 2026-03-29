import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const GhostLogo = () => (
  <svg viewBox="0 0 200 260" className="w-36 h-44 md:w-44 md:h-56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ghostGrad" x1="100" y1="0" x2="100" y2="260" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00E676" />
        <stop offset="100%" stopColor="#00C853" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="12" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#glow)">
      <path
        d="M100 10C55.8 10 20 45.8 20 90V200C20 210 25 215 30 210L50 190C55 185 60 185 65 190L85 210C90 215 95 215 100 210L120 190C125 185 130 185 135 190L155 210C160 215 165 215 170 210L180 200V90C180 45.8 144.2 10 100 10Z"
        fill="url(#ghostGrad)"
        opacity="0.95"
      />
      <ellipse cx="72" cy="95" rx="16" ry="20" fill="#0A0A0F" />
      <ellipse cx="128" cy="95" rx="16" ry="20" fill="#0A0A0F" />
      <ellipse cx="75" cy="90" rx="6" ry="7" fill="white" opacity="0.9" />
      <ellipse cx="131" cy="90" rx="6" ry="7" fill="white" opacity="0.9" />
    </g>
  </svg>
);

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Subtle green glow behind logo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-phantom-green/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Ghost Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 mb-8"
      >
        <GhostLogo />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-white text-4xl md:text-5xl font-bold tracking-tight relative z-10 mb-3 text-center"
      >
        Phantom Messenger
      </motion.h1>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-gray-500 text-lg md:text-xl font-light relative z-10 mb-10 text-center"
      >
        Private by Architecture
      </motion.p>

      {/* Subtle enter link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="relative z-10"
      >
        <Link
          to="/chat"
          className="text-gray-500 hover:text-phantom-green text-sm font-medium border border-gray-800 hover:border-phantom-green/40 rounded-full px-6 py-2.5 transition-all duration-300"
        >
          Open Messenger →
        </Link>
      </motion.div>
    </div>
  );
}
