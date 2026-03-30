import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, ShieldOff, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import client from '../api/client';
import toast from 'react-hot-toast';

export default function TwoFactorSetup({ enabled, onStatusChange }) {
  const [step, setStep] = useState('idle'); // 'idle' | 'setup' | 'disable'
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const handleStartSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.post('/api/auth/2fa/setup');
      if (res.success) {
        setQrCode(res.data.qrCode);
        setSecret(res.data.secret);
        setStep('setup');
      } else {
        setError(res.error || 'Failed to start 2FA setup');
      }
    } catch (err) {
      setError(err.message || 'Failed to start 2FA setup');
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (code.length !== 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await client.post('/api/auth/2fa/verify', { code });
      if (res.success) {
        toast.success('2FA enabled!');
        onStatusChange(true);
        setStep('idle');
        setCode('');
      } else {
        setError(res.error || 'Invalid code');
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    if (code.length !== 6) { setError('Enter your 6-digit code to disable'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await client.post('/api/auth/2fa/disable', { code });
      if (res.success) {
        toast.success('2FA disabled');
        onStatusChange(false);
        setStep('idle');
        setCode('');
      } else {
        setError(res.error || 'Invalid code');
      }
    } catch (err) {
      setError(err.message || 'Failed to disable 2FA');
    }
    setLoading(false);
  };

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  // ── Idle state ──
  if (step === 'idle') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-phantom-gray-50">
          {enabled ? (
            <ShieldCheck className="w-5 h-5 text-green-500" />
          ) : (
            <Shield className="w-5 h-5 text-phantom-gray-400" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-phantom-charcoal">Two-Factor Authentication</p>
            <p className="text-xs text-phantom-gray-400">
              {enabled ? 'Enabled — your account is protected' : 'Add an extra layer of security'}
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            enabled ? 'bg-green-100 text-green-600' : 'bg-phantom-gray-100 text-phantom-gray-400'
          }`}>
            {enabled ? 'ON' : 'OFF'}
          </span>
        </div>

        {enabled ? (
          <button
            onClick={() => { setStep('disable'); setCode(''); setError(''); }}
            className="w-full py-2.5 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
          >
            Disable 2FA
          </button>
        ) : (
          <button
            onClick={handleStartSetup}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Enable 2FA
          </button>
        )}
      </div>
    );
  }

  // ── Setup flow: show QR + verify ──
  if (step === 'setup') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <p className="text-sm font-medium text-phantom-charcoal">Scan this QR code with your authenticator app</p>
        <p className="text-xs text-phantom-gray-400">Google Authenticator, Authy, or any TOTP app</p>

        {qrCode && (
          <div className="flex justify-center">
            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-xl border border-phantom-gray-200" />
          </div>
        )}

        {secret && (
          <div className="bg-phantom-gray-50 rounded-xl p-3">
            <p className="text-[11px] text-phantom-gray-400 mb-1">Or enter this key manually:</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-phantom-charcoal flex-1 break-all">{secret}</code>
              <button onClick={handleCopySecret} className="p-1.5 hover:bg-phantom-gray-100 rounded-lg">
                {copiedSecret ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-phantom-gray-400" />}
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-phantom-charcoal mb-2">Enter 6-digit code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
            placeholder="000000"
            className="input-field text-center text-lg font-mono tracking-[0.3em]"
            autoFocus
          />
        </div>

        {error && (
          <p className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={() => setStep('idle')} className="flex-1 py-2.5 text-sm font-medium text-phantom-gray-500 bg-phantom-gray-50 hover:bg-phantom-gray-100 rounded-xl">
            Cancel
          </button>
          <button onClick={handleVerify} disabled={loading || code.length !== 6} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Enable'}
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Disable flow: enter code to confirm ──
  if (step === 'disable') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <ShieldOff className="w-4 h-4 text-amber-500 mt-0.5" />
          <p className="text-xs text-amber-800">Enter your authenticator code to disable 2FA. This will remove the extra security layer from your account.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-phantom-charcoal mb-2">Enter 6-digit code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
            placeholder="000000"
            className="input-field text-center text-lg font-mono tracking-[0.3em]"
            autoFocus
          />
        </div>

        {error && (
          <p className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={() => setStep('idle')} className="flex-1 py-2.5 text-sm font-medium text-phantom-gray-500 bg-phantom-gray-50 hover:bg-phantom-gray-100 rounded-xl">
            Cancel
          </button>
          <button onClick={handleDisable} disabled={loading || code.length !== 6} className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disable 2FA'}
          </button>
        </div>
      </motion.div>
    );
  }
}
