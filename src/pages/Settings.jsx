import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, Bell, Shield, Palette, Info, LogOut, ChevronRight, Lock, Bitcoin, Copy, Check, Mail, Phone, Key, Eye, EyeOff, X, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validatePassword } from '../utils/passwordValidation';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import { loadWalletFromSession } from '../crypto/btcWallet';
import { getPreKeyCount } from '../crypto/signalProtocol';
import * as authApi from '../api/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Settings({ onBack }) {
  const { user, logout, fetchUser } = useAuth();
  const navigate = useNavigate();
  const [wallet] = useState(() => loadWalletFromSession());
  const [copied, setCopied] = useState(false);
  const [activePanel, setActivePanel] = useState(null); // null | 'email' | 'phone' | 'password'
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [panelError, setPanelError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await authApi.getProfile();
      if (res.success) setProfile(res.data);
    } catch {}
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleCopyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Email Management ──
  const handleSaveEmail = async () => {
    setPanelError('');
    if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      setPanelError('Enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.updateProfile({ email: emailInput });
      if (res.success) {
        toast.success('Email updated!');
        await loadProfile();
        setActivePanel(null);
      } else {
        setPanelError(res.error || 'Failed to update email');
      }
    } catch (err) {
      setPanelError(err.message || 'Failed to update email');
    }
    setLoading(false);
  };

  const handleRemoveEmail = async () => {
    setLoading(true);
    try {
      const res = await authApi.removeEmail();
      if (res.success) {
        toast.success('Email removed');
        await loadProfile();
        setActivePanel(null);
      }
    } catch (err) {
      setPanelError(err.message || 'Failed to remove');
    }
    setLoading(false);
  };

  // ── Phone Management ──
  const handleSavePhone = async () => {
    setPanelError('');
    const clean = phoneInput.replace(/[\s()-]/g, '');
    if (!clean || !/^\+?[0-9]{10,15}$/.test(clean)) {
      setPanelError('Enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.updateProfile({ phone: phoneInput });
      if (res.success) {
        toast.success('Phone updated!');
        await loadProfile();
        setActivePanel(null);
      } else {
        setPanelError(res.error || 'Failed to update phone');
      }
    } catch (err) {
      setPanelError(err.message || 'Failed to update phone');
    }
    setLoading(false);
  };

  const handleRemovePhone = async () => {
    setLoading(true);
    try {
      const res = await authApi.removePhone();
      if (res.success) {
        toast.success('Phone removed');
        await loadProfile();
        setActivePanel(null);
      }
    } catch (err) {
      setPanelError(err.message || 'Failed to remove');
    }
    setLoading(false);
  };

  // ── Password Management ──
  const handleSavePassword = async () => {
    setPanelError('');
    const pwErr = validatePassword(newPasswordInput);
    if (pwErr) {
      setPanelError(pwErr);
      return;
    }
    setLoading(true);
    try {
      const data = { password: newPasswordInput };
      if (profile?.hasPassword) {
        if (!currentPassword) { setPanelError('Current password required'); setLoading(false); return; }
        data.currentPassword = currentPassword;
      }
      const res = await authApi.updateProfile(data);
      if (res.success) {
        toast.success(profile?.hasPassword ? 'Password changed!' : 'Password set!');
        await loadProfile();
        setActivePanel(null);
        setCurrentPassword('');
        setNewPasswordInput('');
      } else {
        setPanelError(res.error || 'Failed to update password');
      }
    } catch (err) {
      setPanelError(err.message || 'Failed to update password');
    }
    setLoading(false);
  };

  let preKeyCount = 0;
  try { preKeyCount = getPreKeyCount(); } catch {}

  const sections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile', desc: `@${user?.username || 'unknown'}`, onClick: () => {} },
        {
          icon: Mail,
          label: 'Email',
          desc: profile?.emailMasked || 'Not set — add for email login',
          onClick: () => { setActivePanel('email'); setEmailInput(''); setPanelError(''); },
          badge: profile?.emailMasked ? 'Set' : 'Add',
          badgeColor: profile?.emailMasked ? 'green' : 'gray',
        },
        {
          icon: Phone,
          label: 'Phone',
          desc: profile?.phoneMasked || 'Not set — add for SMS login',
          onClick: () => { setActivePanel('phone'); setPhoneInput(''); setPanelError(''); },
          badge: profile?.phoneMasked ? 'Set' : 'Add',
          badgeColor: profile?.phoneMasked ? 'green' : 'gray',
        },
        {
          icon: Lock,
          label: 'Password',
          desc: profile?.hasPassword ? 'Password set — click to change' : 'No password — set one for email login',
          onClick: () => { setActivePanel('password'); setCurrentPassword(''); setNewPasswordInput(''); setPanelError(''); },
          badge: profile?.hasPassword ? 'Set' : 'Add',
          badgeColor: profile?.hasPassword ? 'green' : 'gray',
        },
      ],
    },
    {
      title: 'Security',
      items: [
        { icon: Shield, label: 'Privacy', desc: 'End-to-end encrypted messaging', onClick: () => {} },
        { icon: Key, label: 'Encryption', desc: `Signal Protocol active — ${preKeyCount} pre-keys remaining`, onClick: () => {} },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: Bell, label: 'Notifications', desc: 'Push notifications, sounds', onClick: () => {} },
        { icon: Palette, label: 'Appearance', desc: 'Light theme', onClick: () => {} },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: Info, label: 'About Phantom', desc: 'Version 2.0.0 — Signal Protocol E2EE', onClick: () => {} },
      ],
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full flex flex-col bg-white">
      <div className="px-5 pt-5 pb-3 flex items-center gap-3 border-b border-phantom-gray-200">
        <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-phantom-gray-500" />
        </button>
        <h2 className="text-lg font-bold text-phantom-charcoal">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {/* User card */}
        <div className={`flex items-center gap-4 p-4 rounded-2xl ${user?.role === 'owner' ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/50' : 'bg-phantom-gray-50'}`}>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${user?.role === 'owner' ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : 'bg-phantom-green/10'}`}>
            <span className={`font-bold text-xl ${user?.role === 'owner' ? 'text-white' : 'text-phantom-green'}`}>{(user?.username || '?')[0].toUpperCase()}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-phantom-charcoal">{user?.username}</p>
              {user?.role === 'owner' && (
                <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Owner</span>
              )}
              {user?.role === 'admin' && (
                <span className="bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
              )}
            </div>
            <p className="text-sm text-phantom-gray-400">
              {user?.tier === 'phantom_elite' ? 'Phantom Elite' : `${(user?.tier || 'Free').charAt(0).toUpperCase()}${(user?.tier || 'free').slice(1)}`} Plan
              {user?.isExemptFromBilling && <span className="ml-1.5 text-emerald-500 text-xs font-medium">(Complimentary)</span>}
            </p>
            <p className="text-xs text-phantom-gray-300 mt-0.5">
              Auth: {profile?.authMethod || user?.authMethod || 'seed'}
            </p>
          </div>
        </div>

        {/* BTC Wallet Card */}
        {wallet?.address && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bitcoin className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-phantom-charcoal">Bitcoin Wallet</span>
              <span className="bg-amber-200/50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">TESTNET</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono text-phantom-gray-500 truncate flex-1">{wallet.address}</p>
              <button onClick={handleCopyAddress} className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-amber-500" />}
              </button>
            </div>
          </div>
        )}

        {/* Settings Sections */}
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-phantom-gray-400 uppercase tracking-wider mb-2 px-1">{section.title}</h3>
            <div className="space-y-1">
              {section.items.map(({ icon: Icon, label, desc, onClick, badge, badgeColor }) => (
                <button key={label} onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-phantom-gray-50 transition-colors text-left">
                  <div className="w-9 h-9 bg-phantom-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-phantom-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-phantom-charcoal">{label}</p>
                    <p className="text-xs text-phantom-gray-400 truncate">{desc}</p>
                  </div>
                  {badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      badgeColor === 'green' ? 'bg-green-100 text-green-600' : 'bg-phantom-gray-100 text-phantom-gray-400'
                    }`}>
                      {badge}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-phantom-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Logout */}
        <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors text-left group">
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-sm font-medium text-red-500">Sign Out</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* Slide-up Panels */}
      {/* ══════════════════════════════════════════ */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 z-50 flex items-end"
            onClick={() => setActivePanel(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-phantom-charcoal">
                  {activePanel === 'email' && 'Manage Email'}
                  {activePanel === 'phone' && 'Manage Phone'}
                  {activePanel === 'password' && (profile?.hasPassword ? 'Change Password' : 'Set Password')}
                </h3>
                <button onClick={() => setActivePanel(null)} className="p-2 hover:bg-phantom-gray-100 rounded-xl">
                  <X className="w-5 h-5 text-phantom-gray-400" />
                </button>
              </div>

              {/* ── Email Panel ── */}
              {activePanel === 'email' && (
                <div className="space-y-4">
                  {profile?.emailMasked && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-phantom-charcoal">Current email</p>
                        <p className="text-xs text-phantom-gray-500">{profile.emailMasked}</p>
                      </div>
                      <button onClick={handleRemoveEmail} disabled={loading} className="p-2 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-phantom-charcoal mb-2">
                      {profile?.emailMasked ? 'Update email' : 'Add email'}
                    </label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => { setEmailInput(e.target.value); setPanelError(''); }}
                      placeholder="you@example.com"
                      className="input-field"
                      autoFocus
                    />
                  </div>
                  {panelError && (
                    <p className="flex items-center gap-2 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" /> {panelError}
                    </p>
                  )}
                  <button onClick={handleSaveEmail} disabled={loading || !emailInput} className="btn-primary w-full">
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Save Email'}
                  </button>
                </div>
              )}

              {/* ── Phone Panel ── */}
              {activePanel === 'phone' && (
                <div className="space-y-4">
                  {profile?.phoneMasked && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-phantom-charcoal">Current phone</p>
                        <p className="text-xs text-phantom-gray-500">{profile.phoneMasked}</p>
                      </div>
                      <button onClick={handleRemovePhone} disabled={loading} className="p-2 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-phantom-charcoal mb-2">
                      {profile?.phoneMasked ? 'Update phone' : 'Add phone number'}
                    </label>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => { setPhoneInput(e.target.value); setPanelError(''); }}
                      placeholder="+1 (555) 123-4567"
                      className="input-field"
                      autoFocus
                    />
                  </div>
                  {panelError && (
                    <p className="flex items-center gap-2 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" /> {panelError}
                    </p>
                  )}
                  <button onClick={handleSavePhone} disabled={loading || !phoneInput} className="btn-primary w-full">
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Save Phone'}
                  </button>
                </div>
              )}

              {/* ── Password Panel ── */}
              {activePanel === 'password' && (
                <div className="space-y-4">
                  {profile?.hasPassword && (
                    <div>
                      <label className="block text-sm font-medium text-phantom-charcoal mb-2">Current password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => { setCurrentPassword(e.target.value); setPanelError(''); }}
                        placeholder="Enter current password"
                        className="input-field"
                        autoComplete="current-password"
                        autoFocus
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-phantom-charcoal mb-2">
                      {profile?.hasPassword ? 'New password' : 'Set a password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPasswordInput}
                        onChange={(e) => { setNewPasswordInput(e.target.value); setPanelError(''); }}
                        placeholder="Min 12 chars, upper, lower, number, symbol"
                        className="input-field pr-10"
                        autoComplete="new-password"
                        autoFocus={!profile?.hasPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-phantom-gray-400"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordStrengthIndicator password={newPasswordInput} />
                    <p className="mt-1 text-xs text-phantom-gray-400">Password enables email+password login</p>
                  </div>
                  {panelError && (
                    <p className="flex items-center gap-2 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" /> {panelError}
                    </p>
                  )}
                  <button onClick={handleSavePassword} disabled={loading || !newPasswordInput} className="btn-primary w-full">
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : (profile?.hasPassword ? 'Change Password' : 'Set Password')}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
