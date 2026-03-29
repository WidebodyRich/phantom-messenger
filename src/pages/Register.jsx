import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ArrowRight, AlertCircle, CheckCircle2, Shield, Copy, Check, AlertTriangle, Mail, Phone, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { generateWallet, saveWalletToSession } from '../crypto/btcWallet';
import { initializeEncryption } from '../crypto/signalProtocol';
import client from '../api/client';
import toast from 'react-hot-toast';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('username'); // 'username' | 'seedPhrase' | 'success'
  const [wallet, setWallet] = useState(null);
  const [seedSaved, setSeedSaved] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const validateUsername = (name) => {
    if (name.length < 3) return 'Username must be at least 3 characters';
    if (name.length > 20) return 'Username must be 20 characters or less';
    if (!/^[a-zA-Z0-9_.]+$/.test(name)) return 'Only letters, numbers, underscores, and periods';
    return null;
  };

  const validateForm = () => {
    const nameErr = validateUsername(username.trim());
    if (nameErr) return nameErr;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email address';
    if (password && password.length < 8) return 'Password must be at least 8 characters';
    if (email && !password) return 'Password required when adding an email';
    if (phone && !/^\+?[0-9]{10,15}$/.test(phone.replace(/[\s()-]/g, ''))) return 'Invalid phone number';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      // Generate Bitcoin wallet
      const newWallet = generateWallet();
      setWallet(newWallet);

      // Generate Signal Protocol keys
      const signalKeys = await initializeEncryption();

      // Register with backend (unified endpoint)
      const res = await register({
        username: username.trim(),
        email: email.trim() || null,
        phone: phone.replace(/[\s()-]/g, '').trim() || null,
        password: password || null,
        identityKeyPublic: signalKeys.identityKeyPublic,
        signedPreKeyPublic: signalKeys.signedPreKeyPublic,
        signedPreKeySignature: signalKeys.signedPreKeySignature,
        preKeys: signalKeys.preKeys.map((pk) => ({
          index: pk.keyId,
          publicKey: pk.publicKey,
        })),
      });

      if (res.success) {
        // Save wallet to session
        saveWalletToSession({
          mnemonic: newWallet.mnemonic,
          address: newWallet.address,
          privateKey: newWallet.privateKey,
          publicKey: newWallet.publicKey,
        });

        // Store BTC address mapping for seed login (local cache)
        const addrMap = JSON.parse(localStorage.getItem('phantom_addr_map') || '{}');
        addrMap[newWallet.address] = username.trim();
        localStorage.setItem('phantom_addr_map', JSON.stringify(addrMap));

        // Save BTC address to backend for cross-device recovery
        try {
          await client.post('/api/wallet/address', { btcAddress: newWallet.address });
        } catch (e) {
          console.warn('Failed to save BTC address to server:', e.message);
        }

        // Show seed phrase backup screen
        setStep('seedPhrase');
      } else {
        setError(res.error || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
    setLoading(false);
  };

  const handleCopySeed = () => {
    if (wallet) {
      navigator.clipboard.writeText(wallet.mnemonic);
      setCopiedSeed(true);
      toast.success('Seed phrase copied!');
      setTimeout(() => setCopiedSeed(false), 3000);
    }
  };

  const handleContinue = () => {
    setStep('success');
    toast.success('Account created!');
    setTimeout(() => navigate('/chat'), 1500);
  };

  const seedWords = wallet?.mnemonic?.split(' ') || [];

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
          <AnimatePresence mode="wait">
            {step === 'username' && (
              <motion.div key="title1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="text-2xl font-bold text-phantom-charcoal">Create your account</h1>
                <p className="text-phantom-gray-500 mt-1">Get started with Phantom Messenger</p>
              </motion.div>
            )}
            {step === 'seedPhrase' && (
              <motion.div key="title2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="text-2xl font-bold text-phantom-charcoal">Save Your Recovery Phrase</h1>
                <p className="text-phantom-gray-500 mt-1">This is the only way to recover your wallet</p>
              </motion.div>
            )}
            {step === 'success' && (
              <motion.div key="title3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="text-2xl font-bold text-phantom-charcoal">You're all set!</h1>
                <p className="text-phantom-gray-500 mt-1">Redirecting to messenger...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card */}
        <div className="card">
          <AnimatePresence mode="wait">
            {/* Step 1: Username + Optional Fields */}
            {step === 'username' && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Username (required) */}
                <div>
                  <label className="block text-sm font-medium text-phantom-charcoal mb-2">
                    Choose a username <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(''); }}
                    placeholder="phantom_user"
                    className="input-field"
                    autoFocus
                    maxLength={20}
                    autoComplete="username"
                  />
                  <p className="mt-1.5 text-xs text-phantom-gray-400">3-20 characters, letters, numbers, underscores, periods</p>
                </div>

                {/* Optional fields toggle */}
                <button
                  type="button"
                  onClick={() => setShowOptional(!showOptional)}
                  className="w-full flex items-center justify-between py-2 px-1 text-sm font-medium text-phantom-green hover:text-phantom-green/80 transition-colors"
                >
                  <span>Add email, phone, or password (optional)</span>
                  {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {/* Optional fields */}
                <AnimatePresence>
                  {showOptional && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      {/* Email */}
                      <div>
                        <label className="block text-xs font-medium text-phantom-gray-500 mb-1.5">
                          <Mail className="w-3.5 h-3.5 inline mr-1" />
                          Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setError(''); }}
                          placeholder="you@example.com"
                          className="input-field text-sm"
                          autoComplete="email"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-xs font-medium text-phantom-gray-500 mb-1.5">
                          <Phone className="w-3.5 h-3.5 inline mr-1" />
                          Phone number
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => { setPhone(e.target.value); setError(''); }}
                          placeholder="+1 (555) 123-4567"
                          className="input-field text-sm"
                          autoComplete="tel"
                        />
                      </div>

                      {/* Password */}
                      <div>
                        <label className="block text-xs font-medium text-phantom-gray-500 mb-1.5">
                          Password {email && <span className="text-red-400">*</span>}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            placeholder="Min 8 characters"
                            className="input-field text-sm pr-10"
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-phantom-gray-400 hover:text-phantom-gray-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {email && !password && (
                          <p className="mt-1 text-xs text-amber-500">Password required with email</p>
                        )}
                      </div>

                      <p className="text-[11px] text-phantom-gray-400 leading-relaxed">
                        Adding email or phone gives you extra login options. Your recovery phrase always works regardless.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="bg-phantom-gray-50 rounded-xl p-4 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-phantom-green mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-phantom-gray-500 leading-relaxed">
                    <p className="font-medium text-phantom-charcoal mb-1">End-to-end encrypted</p>
                    Signal Protocol keys and a Bitcoin wallet are generated automatically. No email or phone number required.
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
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Generating keys...</span>
                    </div>
                  ) : (
                    <>Create Account <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </motion.form>
            )}

            {/* Step 2: Seed Phrase Backup */}
            {step === 'seedPhrase' && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800 leading-relaxed">
                    <p className="font-semibold mb-1">Write these words down!</p>
                    This recovery phrase is the ONLY way to recover your wallet and account. Store it somewhere safe. We cannot recover it for you.
                  </div>
                </div>

                {/* Seed Phrase Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {seedWords.map((word, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-phantom-gray-50 rounded-lg px-3 py-2 text-center"
                    >
                      <span className="text-xs text-phantom-gray-400 mr-1">{i + 1}.</span>
                      <span className="text-sm font-medium text-phantom-charcoal">{word}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Copy Button */}
                <button
                  onClick={handleCopySeed}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-phantom-gray-600 bg-phantom-gray-50 hover:bg-phantom-gray-100 rounded-xl transition-colors"
                >
                  {copiedSeed ? (
                    <><Check className="w-4 h-4 text-phantom-green" /> Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy recovery phrase</>
                  )}
                </button>

                {/* BTC Address */}
                <div className="bg-phantom-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-phantom-gray-400 mb-1">Your Bitcoin Testnet Address</p>
                  <p className="text-xs font-mono text-phantom-charcoal break-all">{wallet?.address}</p>
                </div>

                {/* Checkbox + Continue */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seedSaved}
                    onChange={(e) => setSeedSaved(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-phantom-gray-300 text-phantom-green focus:ring-phantom-green"
                  />
                  <span className="text-sm text-phantom-gray-600">
                    I have saved my recovery phrase in a safe place
                  </span>
                </label>

                <button
                  onClick={handleContinue}
                  disabled={!seedSaved}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  Continue to Messenger <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 'success' && (
              <motion.div
                key="step3"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-phantom-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-phantom-green" />
                </div>
                <h3 className="text-xl font-bold text-phantom-charcoal mb-2">You're in!</h3>
                <p className="text-phantom-gray-500">Redirecting to messenger...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step === 'username' && (
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
