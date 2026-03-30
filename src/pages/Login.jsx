import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ArrowRight, AlertCircle, Key, Mail, Phone, Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { restoreWalletFromMnemonic, saveWalletToSession } from '../crypto/btcWallet';
import { restoreEncryptionState, clearEncryptionState } from '../crypto/signalProtocol';
import { unlockVault, migrateToVault, lockVault } from '../crypto/vault';
import { clearWalletFromSession } from '../crypto/btcWallet';
import * as authApi from '../api/auth';
import toast from 'react-hot-toast';

// Silent duress wipe — destroys all local crypto material while appearing normal
const performDuressWipe = async () => {
  clearEncryptionState();
  clearWalletFromSession();
  lockVault();
  const keysToRemove = [];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k) keysToRemove.push(k);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  sessionStorage.clear();
};

const TABS = [
  { id: 'seed', label: 'Recovery Phrase', icon: Key, recommended: true },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'phone', label: 'Phone', icon: Phone },
];

export default function Login() {
  const [activeTab, setActiveTab] = useState('seed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { fetchUser, loginWithEmail, loginWithPhone } = useAuth();

  // ── Seed phrase state ──
  const [seedWords, setSeedWords] = useState(Array(12).fill(''));

  // ── Email state ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState('request'); // 'request' | 'verify'
  const [resetMessage, setResetMessage] = useState('');

  // ── Phone state ──
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [phoneStep, setPhoneStep] = useState('enter'); // 'enter' | 'verify'
  const [phoneLastFour, setPhoneLastFour] = useState('');

  // ── 2FA state ──
  const [show2FA, setShow2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [pending2FALogin, setPending2FALogin] = useState(null); // stores the retry function

  // ══════════════════════════════════════════
  // Seed Phrase Login
  // ══════════════════════════════════════════
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
      const wallet = restoreWalletFromMnemonic(mnemonic);

      // Look up user by BTC address
      let foundUsername = null;
      const addrMap = JSON.parse(localStorage.getItem('phantom_addr_map') || '{}');
      if (addrMap[wallet.address]) {
        foundUsername = addrMap[wallet.address];
      }

      if (!foundUsername) {
        try {
          const lookupRes = await authApi.lookupByAddress(wallet.address);
          if (lookupRes.success && lookupRes.data?.username) {
            foundUsername = lookupRes.data.username;
            addrMap[wallet.address] = foundUsername;
            localStorage.setItem('phantom_addr_map', JSON.stringify(addrMap));
          }
        } catch {}
      }

      if (!foundUsername) {
        setError('No account found with this recovery phrase. Check your words.');
        setLoading(false);
        return;
      }

      // Challenge-response auth
      const challengeRes = await authApi.loginWithSeedChallenge(foundUsername);
      if (!challengeRes.success) {
        setError('Account found but login failed. Please try again.');
        setLoading(false);
        return;
      }

      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(wallet.privateKey),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC', keyMaterial, encoder.encode(challengeRes.data.challenge)
      );
      const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

      const loginRes = await authApi.loginWithSeed({
        username: foundUsername,
        challengeId: challengeRes.data.challengeId,
        signature,
      });

      if (loginRes.success) {
        if (loginRes.data?.requires2FA) {
          // Store wallet for after 2FA verification
          const seedWallet = wallet;
          const seedUsername = foundUsername;
          setShow2FA(true);
          setTotpCode('');
          setPending2FALogin(() => async (code) => {
            setLoading(true);
            try {
              // Need a new challenge for the retry
              const c2 = await authApi.loginWithSeedChallenge(seedUsername);
              const km2 = await crypto.subtle.importKey(
                'raw', new TextEncoder().encode(seedWallet.privateKey),
                { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
              );
              const sig2 = await crypto.subtle.sign('HMAC', km2, new TextEncoder().encode(c2.data.challenge));
              const s2 = btoa(String.fromCharCode(...new Uint8Array(sig2)));
              const r2 = await authApi.loginWithSeed({
                username: seedUsername, challengeId: c2.data.challengeId, signature: s2, totpCode: code,
              });
              if (r2.success && !r2.data?.requires2FA) {
                await saveWalletToSession(seedWallet);
                const u = await fetchUser();
                if (u) { await unlockVault(u.username, u.id); await migrateToVault(['phantom_signal_v2', 'phantom_signal_store', 'phantom_wallet']); }
                await restoreEncryptionState();
                toast.success('Welcome back!');
                navigate('/chat');
              } else {
                setError(r2.error || 'Invalid 2FA code');
              }
            } catch (err) {
              setError(err.message || '2FA verification failed');
            }
            setLoading(false);
          });
          setLoading(false);
          return;
        }
        await saveWalletToSession(wallet);
        const u = await fetchUser();
        if (u) { await unlockVault(u.username, u.id); await migrateToVault(['phantom_signal_v2', 'phantom_signal_store', 'phantom_wallet']); }
        await restoreEncryptionState();
        toast.success('Welcome back!');
        navigate('/chat');
      } else {
        setError(loginRes.error || 'Login failed');
      }
    } catch (err) {
      if (err.message === 'Invalid seed phrase') {
        setError('Invalid recovery phrase. Please check your words.');
      } else {
        setError(err.message || 'Login failed');
      }
    }
    setLoading(false);
  };

  const handleSeedWordChange = (index, value) => {
    const updated = [...seedWords];
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

  // ══════════════════════════════════════════
  // Email + Password Login
  // ══════════════════════════════════════════
  const handleEmailLogin = async (e, totpOverride) => {
    if (e) e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithEmail({ email, password, totpCode: totpOverride || undefined });
      if (res.success) {
        if (res.data?.requires2FA) {
          setShow2FA(true);
          setTotpCode('');
          setPending2FALogin((code) => handleEmailLogin(null, code));
          setLoading(false);
          return;
        }
        // If server flagged this as a duress login, silently wipe all local data
        if (res.data?.fresh) {
          await performDuressWipe();
        }
        toast.success('Welcome back!');
        navigate('/chat');
      } else {
        setError(res.error || 'Invalid credentials');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    }
    setLoading(false);
  };

  // ── Password Reset ──
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    if (!resetEmail) { setError('Enter your email'); return; }
    setLoading(true);
    try {
      await authApi.requestPasswordReset(resetEmail);
      setResetStep('verify');
      setResetMessage('If an account exists, a reset code has been sent.');
    } catch (err) {
      setError(err.message || 'Failed to send reset code');
    }
    setLoading(false);
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError('');
    if (!resetCode || !newPassword) { setError('Code and new password are required'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const res = await authApi.confirmPasswordReset({ email: resetEmail, code: resetCode, newPassword });
      if (res.success) {
        toast.success('Password reset! Please sign in.');
        setShowForgot(false);
        setResetStep('request');
        setResetEmail('');
        setResetCode('');
        setNewPassword('');
      } else {
        setError(res.error || 'Reset failed');
      }
    } catch (err) {
      setError(err.message || 'Reset failed');
    }
    setLoading(false);
  };

  // ══════════════════════════════════════════
  // Phone + SMS Login
  // ══════════════════════════════════════════
  const handleRequestSms = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone) { setError('Enter your phone number'); return; }

    setLoading(true);
    try {
      const res = await authApi.loginWithPhone(phone.replace(/[\s()-]/g, ''));
      if (res.success) {
        setPhoneStep('verify');
        setPhoneLastFour(res.data.phoneLastFour);
        toast.success('Code sent!');
      } else {
        setError(res.error || 'No account with this phone number');
      }
    } catch (err) {
      setError(err.message || 'Failed to send code');
    }
    setLoading(false);
  };

  const handleVerifySms = async (e, totpOverride) => {
    if (e) e.preventDefault();
    setError('');
    if (!smsCode || smsCode.length !== 6) { setError('Enter the 6-digit code'); return; }

    setLoading(true);
    try {
      const res = await loginWithPhone({ phone: phone.replace(/[\s()-]/g, ''), code: smsCode, totpCode: totpOverride || undefined });
      if (res.success) {
        if (res.data?.requires2FA) {
          setShow2FA(true);
          setTotpCode('');
          setPending2FALogin(() => (code) => handleVerifySms(null, code));
          setLoading(false);
          return;
        }
        toast.success('Welcome back!');
        navigate('/chat');
      } else {
        setError(res.error || 'Invalid code');
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
    }
    setLoading(false);
  };

  // ══════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════
  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setError('');
    setShowForgot(false);
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
          {/* Tabs */}
          <div className="flex gap-1 bg-phantom-gray-50 rounded-xl p-1 mb-5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-phantom-charcoal shadow-sm'
                    : 'text-phantom-gray-400 hover:text-phantom-gray-600'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.id === 'seed' ? 'Seed' : tab.id === 'email' ? 'Email' : 'Phone'}</span>
                {tab.recommended && activeTab === tab.id && (
                  <span className="bg-phantom-green/10 text-phantom-green text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-0.5">
                    BEST
                  </span>
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── Seed Phrase Tab ── */}
            {activeTab === 'seed' && (
              <motion.form
                key="seed"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSeedLogin}
                className="space-y-4"
              >
                <label className="text-sm font-medium text-phantom-charcoal block">
                  Enter your 12-word recovery phrase
                </label>

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

            {/* ── Email Tab ── */}
            {activeTab === 'email' && !showForgot && (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleEmailLogin}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-phantom-charcoal mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com"
                    className="input-field"
                    autoFocus
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-phantom-charcoal mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      placeholder="Enter your password"
                      className="input-field pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-phantom-gray-400 hover:text-phantom-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setResetEmail(email); setError(''); }}
                  className="text-xs text-phantom-green hover:underline"
                >
                  Forgot password?
                </button>

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
              </motion.form>
            )}

            {/* ── Forgot Password Flow ── */}
            {activeTab === 'email' && showForgot && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => { setShowForgot(false); setError(''); setResetStep('request'); }}
                    className="p-1 hover:bg-phantom-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-phantom-gray-500" />
                  </button>
                  <span className="text-sm font-medium text-phantom-charcoal">Reset Password</span>
                </div>

                {resetStep === 'request' ? (
                  <form onSubmit={handleRequestReset} className="space-y-3">
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="input-field"
                      autoFocus
                    />
                    {resetMessage && <p className="text-xs text-phantom-green">{resetMessage}</p>}
                    {error && (
                      <p className="flex items-center gap-2 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4" /> {error}
                      </p>
                    )}
                    <button type="submit" disabled={loading} className="btn-primary w-full">
                      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Send Reset Code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmReset} className="space-y-3">
                    <p className="text-xs text-phantom-gray-500">Enter the 6-digit code sent to your email and choose a new password.</p>
                    <input
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      className="input-field text-center tracking-widest text-lg"
                      maxLength={6}
                      autoFocus
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password (min 8 characters)"
                      className="input-field"
                    />
                    {error && (
                      <p className="flex items-center gap-2 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4" /> {error}
                      </p>
                    )}
                    <button type="submit" disabled={loading} className="btn-primary w-full">
                      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Reset Password'}
                    </button>
                  </form>
                )}
              </motion.div>
            )}

            {/* ── Phone Tab ── */}
            {activeTab === 'phone' && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {phoneStep === 'enter' ? (
                  <form onSubmit={handleRequestSms} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-phantom-charcoal mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); setError(''); }}
                        placeholder="+1 (555) 123-4567"
                        className="input-field"
                        autoFocus
                        autoComplete="tel"
                      />
                      <p className="mt-1.5 text-xs text-phantom-gray-400">
                        We'll send a verification code to this number
                      </p>
                    </div>

                    {error && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}

                    <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Send Code <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifySms} className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        type="button"
                        onClick={() => { setPhoneStep('enter'); setError(''); setSmsCode(''); }}
                        className="p-1 hover:bg-phantom-gray-100 rounded-lg transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 text-phantom-gray-500" />
                      </button>
                      <span className="text-sm font-medium text-phantom-charcoal">
                        Enter verification code
                      </span>
                    </div>

                    <p className="text-xs text-phantom-gray-500">
                      Code sent to number ending in ****{phoneLastFour}
                    </p>

                    <input
                      type="text"
                      value={smsCode}
                      onChange={(e) => { setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                      placeholder="000000"
                      className="input-field text-center tracking-[0.5em] text-2xl font-mono"
                      maxLength={6}
                      autoFocus
                    />

                    {error && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}

                    <button type="submit" disabled={loading || smsCode.length !== 6} className="btn-primary w-full flex items-center justify-center gap-2">
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Verifying...</span>
                        </div>
                      ) : (
                        <>Verify & Sign In <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleRequestSms}
                      disabled={loading}
                      className="w-full text-center text-xs text-phantom-green hover:underline"
                    >
                      Resend code
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center mt-6 text-phantom-gray-500 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-phantom-green font-semibold hover:underline">
            Create one
          </Link>
        </p>

        {/* ── 2FA Overlay ── */}
        <AnimatePresence>
          {show2FA && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-phantom-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-phantom-green" />
                  </div>
                  <h3 className="text-lg font-bold text-phantom-charcoal">Two-Factor Authentication</h3>
                  <p className="text-xs text-phantom-gray-400 mt-1">Enter the 6-digit code from your authenticator app</p>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => { setTotpCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                  placeholder="000000"
                  className="input-field text-center text-2xl font-mono tracking-[0.4em]"
                  autoFocus
                />

                {error && (
                  <p className="flex items-center justify-center gap-2 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShow2FA(false); setTotpCode(''); setError(''); setPending2FALogin(null); }}
                    className="flex-1 py-2.5 text-sm font-medium text-phantom-gray-500 bg-phantom-gray-50 hover:bg-phantom-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (totpCode.length !== 6) { setError('Enter the 6-digit code'); return; }
                      if (pending2FALogin) pending2FALogin(totpCode);
                      setShow2FA(false);
                    }}
                    disabled={loading || totpCode.length !== 6}
                    className="btn-primary flex-1"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Verify'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
