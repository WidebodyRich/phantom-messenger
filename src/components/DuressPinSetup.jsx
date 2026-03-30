import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldOff, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import client from '../api/client';
import toast from 'react-hot-toast';

export default function DuressPinSetup() {
  const [hasPin, setHasPin] = useState(false);
  const [step, setStep] = useState('idle'); // 'idle' | 'setup' | 'remove'
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    client.get('/api/auth/duress-pin/status').then(res => {
      if (res.success) setHasPin(res.data.hasPin);
    }).catch(() => {});
  }, []);

  const handleSetPin = async () => {
    setError('');
    if (pin.length < 4) { setError('PIN must be at least 4 digits'); return; }
    if (!/^\d+$/.test(pin)) { setError('PIN must be numbers only'); return; }
    if (pin !== confirmPin) { setError('PINs do not match'); return; }

    setLoading(true);
    try {
      const res = await client.post('/api/auth/duress-pin', { pin });
      if (res.success) {
        toast.success('Duress PIN set');
        setHasPin(true);
        setStep('idle');
        setPin('');
        setConfirmPin('');
      } else {
        setError(res.error || 'Failed to set PIN');
      }
    } catch (err) {
      setError(err.message || 'Failed to set PIN');
    }
    setLoading(false);
  };

  const handleRemovePin = async () => {
    setLoading(true);
    try {
      const res = await client.delete('/api/auth/duress-pin');
      if (res.success) {
        toast.success('Duress PIN removed');
        setHasPin(false);
        setStep('idle');
      }
    } catch (err) {
      setError(err.message || 'Failed to remove');
    }
    setLoading(false);
  };

  if (step === 'idle') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-phantom-gray-50">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-phantom-charcoal">Duress PIN</p>
            <p className="text-xs text-phantom-gray-400">
              {hasPin ? 'Active — entering this PIN silently wipes your data' : 'Set a decoy PIN that triggers a silent wipe'}
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            hasPin ? 'bg-amber-100 text-amber-600' : 'bg-phantom-gray-100 text-phantom-gray-400'
          }`}>
            {hasPin ? 'ON' : 'OFF'}
          </span>
        </div>

        {hasPin ? (
          <button
            onClick={() => { setStep('remove'); setError(''); }}
            className="w-full py-2.5 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
          >
            Remove Duress PIN
          </button>
        ) : (
          <button
            onClick={() => { setStep('setup'); setPin(''); setConfirmPin(''); setError(''); }}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" /> Set Duress PIN
          </button>
        )}
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>How it works:</strong> If you're forced to unlock the app, enter this PIN instead of your password. The app will silently wipe all encryption keys, wallet data, and messages — while appearing to log in normally to an empty account.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-phantom-charcoal mb-2">Duress PIN (4-8 digits)</label>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
              placeholder="Enter PIN"
              className="input-field text-center text-lg font-mono tracking-[0.3em] pr-10"
              autoFocus
            />
            <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-phantom-gray-400">
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-phantom-charcoal mb-2">Confirm PIN</label>
          <input
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={8}
            value={confirmPin}
            onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '')); setError(''); }}
            placeholder="Re-enter PIN"
            className="input-field text-center text-lg font-mono tracking-[0.3em]"
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
          <button onClick={handleSetPin} disabled={loading || pin.length < 4} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set PIN'}
          </button>
        </div>
      </motion.div>
    );
  }

  if (step === 'remove') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <p className="text-sm text-phantom-gray-500">Are you sure you want to remove the duress PIN?</p>
        <div className="flex gap-2">
          <button onClick={() => setStep('idle')} className="flex-1 py-2.5 text-sm font-medium text-phantom-gray-500 bg-phantom-gray-50 hover:bg-phantom-gray-100 rounded-xl">
            Cancel
          </button>
          <button onClick={handleRemovePin} disabled={loading} className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl flex items-center justify-center">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
          </button>
        </div>
      </motion.div>
    );
  }
}
