import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as authApi from '../api/auth';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { fetchUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    setLoading(true);
    try {
      // Step 1: Get challenge
      const challengeRes = await authApi.loginWithSeedChallenge(username.trim());
      if (!challengeRes.success) {
        setError(challengeRes.error || 'User not found');
        setLoading(false);
        return;
      }
      // Step 2: For web client, we'll sign the challenge with stored seed
      // For now, show a message that seed-based login requires the mobile app
      // TODO: Implement seed phrase input for web login
      toast.error('Seed-based login coming soon. Please register a new account.');
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-phantom-gray-50 flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-phantom-green rounded-2xl flex items-center justify-center shadow-green-glow">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-phantom-charcoal">Welcome back</h1>
          <p className="text-phantom-gray-500 mt-1">Sign in to Phantom Messenger</p>
        </div>

        {/* Card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-phantom-charcoal mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder="Enter your username"
                className="input-field"
                autoFocus
                autoComplete="username"
              />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-phantom-gray-500 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-phantom-green font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}
