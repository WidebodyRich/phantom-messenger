import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ArrowRight, AlertCircle, Key, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { restoreWalletFromMnemonic, saveWalletToSession } from '../crypto/btcWallet';
import { restoreEncryptionState } from '../crypto/signalProtocol';
import * as authApi from '../api/auth';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('username'); // 'username' | 'seed'
  const [seedWords, setSeedWords] = useState(Array(12).fill(''));
  const navigate = useNavigate();
  const { fetchUser } = useAuth();

  const handleUsernameLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    setLoading(true);
    try {
      const challengeRes = await authApi.loginWithSeedChallenge(username.trim());
      if (!challengeRes.success) {
        setError(challengeRes.error || 'User not found');
        setLoading(false);
        return;
      }
      // For web client, auto-sign the challenge with stored identity
      // The challenge/response flow requires the private key from registration
      // Direct the user to use seed phrase login instead
      setError('Use your recovery phrase to sign in. Click "Login with Recovery Phrase" below.');
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  const handleSeedLogin = async (e) => {
    e.preventDefault();
    setError('');

    const mnemonic = seedWords.map((w) => w.trim().toLowerCase()).join(' ');
    const filledWords = seedWords.filter((w) => w.trim());
    if (filledWords.length < 12) {
      setError('Please enter all 12 words');
      return;
    }

    setLoading(true);
    try {
      // Restore wallet from mnemonic
      const wallet = restoreWalletFromMnemonic(mnemonic);

      // Look up user by BTC address — try server first, then local mapping
      let foundUsername = null;

      // Check local address mapping
      const addrMap = JSON.parse(localStorage.getItem('phantom_addr_map') || '{}');
      if (addrMap[wallet.address]) {
        foundUsername = addrMap[wallet.address];
      }

      if (!foundUsername) {
        // Try to find via server lookup — iterate through possible matches
        setError('No account found with this recovery phrase. Make sure you entered the correct words.');
        setLoading(false);
        return;
      }

      // Now login with the found username via challenge-response
      const challengeRes = await authApi.loginWithSeedChallenge(foundUsername);
      if (!challengeRes.success) {
        setError('Account found but login failed. Please try again.');
        setLoading(false);
        return;
      }

      // Sign the challenge using the wallet's derived identity
      // Since we derived the same wallet from the seed, we prove ownership
      const challengeId = challengeRes.data.challengeId;

      // Create a signature from the mnemonic-derived key to prove identity
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(wallet.privateKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        keyMaterial,
        encoder.encode(challengeRes.data.challenge)
      );
      const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

      const loginRes = await authApi.loginWithSeed({
        username: foundUsername,
        challengeId,
        signature,
      });

      if (loginRes.success) {
        // Save wallet to session
        saveWalletToSession(wallet);

        // Restore Signal Protocol state
        await restoreEncryptionState();

        // Fetch user profile
        await fetchUser();

        toast.success('Welcome back!');
        navigate('/chat');
      } else {
        setError(loginRes.error || 'Login failed');
      }
    } catch (err) {
      if (err.message === 'Invalid seed phrase') {
        setError('Invalid recovery phrase. Please check your words and try again.');
      } else {
        setError(err.message || 'Login failed');
      }
    }
    setLoading(false);
  };

  const handleSeedWordChange = (index, value) => {
    const updated = [...seedWords];
    // Handle paste of full mnemonic
    if (value.includes(' ') && index === 0) {
      const words = value.trim().split(/\s+/);
      for (let i = 0; i < Math.min(words.length, 12); i++) {
        updated[i] = words[i];
      }
    } else {
      updated[index] = value.replace(/\s/g, '');
    }
    setSeedWords(updated);
    setError('');
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
          <AnimatePresence mode="wait">
            {/* Username Login */}
            {mode === 'username' && (
              <motion.form
                key="username"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleUsernameLogin}
                className="space-y-4"
              >
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
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
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

                {/* Seed Login Toggle */}
                <button
                  type="button"
                  onClick={() => { setMode('seed'); setError(''); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-phantom-green hover:bg-phantom-green/5 rounded-xl transition-colors"
                >
                  <Key className="w-4 h-4" />
                  Login with Recovery Phrase
                </button>
              </motion.form>
            )}

            {/* Seed Phrase Login */}
            {mode === 'seed' && (
              <motion.form
                key="seed"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSeedLogin}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => { setMode('username'); setError(''); }}
                    className="p-1 hover:bg-phantom-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-phantom-gray-500" />
                  </button>
                  <label className="text-sm font-medium text-phantom-charcoal">Enter your 12-word recovery phrase</label>
                </div>

                {/* Seed Word Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {seedWords.map((word, i) => (
                    <div key={i} className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-phantom-gray-400">{i + 1}</span>
                      <input
                        type="text"
                        value={word}
                        onChange={(e) => handleSeedWordChange(i, e.target.value)}
                        className="w-full pl-6 pr-2 py-2 text-sm bg-phantom-gray-50 border border-phantom-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-phantom-green/30 focus:border-phantom-green"
                        autoComplete="off"
                        spellCheck="false"
                        autoFocus={i === 0}
                      />
                    </div>
                  ))}
                </div>

                <p className="text-xs text-phantom-gray-400 text-center">
                  Tip: You can paste all 12 words into the first field
                </p>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Restoring wallet...</span>
                    </div>
                  ) : (
                    <>Restore & Sign In <Key className="w-4 h-4" /></>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
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
