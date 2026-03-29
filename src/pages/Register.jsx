import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, ArrowRight, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function generateMockKeys() {
  // Generate pseudo-random keys for registration
  // In production, these would be real Signal Protocol keys
  const randomHex = (len) => {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  };
  const randomBase64 = (len) => {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr));
  };

  return {
    identityKeyPublic: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE' + randomHex(32),
    signedPreKeyPublic: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE' + randomHex(32),
    signedPreKeySignature: 'MEUCIQD' + randomHex(32),
    preKeys: Array.from({ length: 20 }, (_, i) => ({
      index: i + 1,
      publicKey: 'pk_' + randomHex(16),
    })),
  };
}

export default function Register() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const validateUsername = (name) => {
    if (name.length < 3) return 'Username must be at least 3 characters';
    if (name.length > 32) return 'Username must be 32 characters or less';
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return 'Only letters, numbers, and underscores';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateUsername(username.trim());
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const keys = generateMockKeys();
      const res = await register({
        username: username.trim(),
        ...keys,
      });

      if (res.success) {
        setSuccess(true);
        toast.success('Account created!');
        setTimeout(() => navigate('/chat'), 1500);
      } else {
        setError(res.error || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
    setLoading(false);
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
          <h1 className="text-2xl font-bold text-phantom-charcoal">Create your account</h1>
          <p className="text-phantom-gray-500 mt-1">Get started with Phantom Messenger</p>
        </div>

        {/* Card */}
        <div className="card">
          {success ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
              <div className="w-16 h-16 bg-phantom-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-phantom-green" />
              </div>
              <h3 className="text-xl font-bold text-phantom-charcoal mb-2">You're in!</h3>
              <p className="text-phantom-gray-500">Redirecting to messenger...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-phantom-charcoal mb-2">Choose a username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  placeholder="phantom_user"
                  className="input-field"
                  autoFocus
                  maxLength={32}
                  autoComplete="username"
                />
                <p className="mt-1.5 text-xs text-phantom-gray-400">3-32 characters, letters, numbers, underscores</p>
              </div>

              {/* Security info */}
              <div className="bg-phantom-gray-50 rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-phantom-green mt-0.5 flex-shrink-0" />
                <div className="text-xs text-phantom-gray-500 leading-relaxed">
                  <p className="font-medium text-phantom-charcoal mb-1">End-to-end encrypted</p>
                  Encryption keys are generated automatically. No email or phone number required.
                </div>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Create Account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          )}
        </div>

        {!success && (
          <p className="text-center mt-6 text-phantom-gray-500 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-phantom-green font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
