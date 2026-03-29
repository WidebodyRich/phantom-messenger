import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Lock, Zap, Bitcoin, MessageCircle, Phone, Eye, EyeOff } from 'lucide-react';

const GhostLogo = () => (
  <svg viewBox="0 0 200 260" className="w-32 h-40 md:w-40 md:h-52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ghostGrad" x1="100" y1="0" x2="100" y2="260" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00E676" />
        <stop offset="100%" stopColor="#00C853" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="8" result="coloredBlur" />
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

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-6 hover:border-phantom-green/30 transition-all duration-300 hover:shadow-green-glow/20"
  >
    <div className="w-12 h-12 bg-phantom-green/10 rounded-xl flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-phantom-green" />
    </div>
    <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
  </motion.div>
);

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-[#1E1E2E]/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-phantom-green rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">Phantom</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-gray-400 hover:text-white transition-colors px-4 py-2 text-sm font-medium">
              Sign In
            </Link>
            <Link to="/register" className="bg-phantom-green hover:bg-phantom-green-dark text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:shadow-green-glow">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-phantom-green/5 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="flex justify-center mb-8">
            <GhostLogo />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            Messages that<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-phantom-green to-phantom-green-light">disappear.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }} className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Maximum-security encrypted messaging with a built-in Bitcoin economy. Your conversations. Your money. Your rules.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-phantom-green hover:bg-phantom-green-dark text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all duration-200 hover:shadow-green-glow inline-flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" /> Launch Messenger
            </Link>
            <a href="#features" className="bg-[#12121A] border border-[#1E1E2E] hover:border-phantom-green/30 text-white px-8 py-4 rounded-2xl text-lg font-medium transition-all duration-200 inline-flex items-center justify-center gap-2">
              Learn More
            </a>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for absolute privacy</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Every feature designed with one goal: keeping your communications truly private.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon={Lock} title="End-to-End Encryption" description="Signal Protocol with Double Ratchet. Not even we can read your messages." delay={0} />
            <FeatureCard icon={EyeOff} title="Disappearing Messages" description="Messages auto-delete after delivery. No traces, no logs, no metadata." delay={0.1} />
            <FeatureCard icon={Shield} title="Zero Knowledge" description="No phone number required. No IP logging. We can't give up what we don't have." delay={0.2} />
            <FeatureCard icon={Bitcoin} title="Built-in Bitcoin Wallet" description="Send and receive BTC directly in chat. Your keys, your coins." delay={0.3} />
            <FeatureCard icon={Phone} title="Encrypted Calls" description="Voice and video calls with end-to-end encryption through our own TURN servers." delay={0.4} />
            <FeatureCard icon={Zap} title="Lightning Fast" description="Built on modern infrastructure with WebSocket real-time delivery." delay={0.5} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-gradient-to-b from-[#12121A] to-[#0A0A0F] border border-[#1E1E2E] rounded-3xl p-12 md:p-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to go ghost?</h2>
            <p className="text-gray-400 text-lg mb-8">Join the most secure messenger on the internet. Free to start.</p>
            <Link to="/register" className="bg-phantom-green hover:bg-phantom-green-dark text-white px-10 py-4 rounded-2xl text-lg font-bold transition-all duration-200 hover:shadow-green-glow inline-flex items-center gap-2">
              Create Account <span className="text-xl">→</span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1E1E2E] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="w-5 h-5 bg-phantom-green rounded flex items-center justify-center">
              <MessageCircle className="w-3 h-3 text-white" />
            </div>
            Phantom Messenger &copy; {new Date().getFullYear()}
          </div>
          <div className="flex gap-6 text-gray-500 text-sm">
            <span>Privacy-first</span>
            <span>Open protocol</span>
            <span>Helsinki, FI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
