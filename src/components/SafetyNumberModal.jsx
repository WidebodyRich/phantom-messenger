import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, X, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { getIdentityKeyPublic, getRemoteIdentityKey, generateSafetyNumber } from '../crypto/signalProtocol';
import toast from 'react-hot-toast';

export default function SafetyNumberModal({ open, onClose, userId, username }) {
  const [safetyNumber, setSafetyNumber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('phantom_verified_contacts') || '{}');
      return !!stored[userId];
    } catch { return false; }
  });

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const ourKey = await getIdentityKeyPublic();
        const theirKey = await getRemoteIdentityKey(userId);

        if (!ourKey || !theirKey) {
          setError('No shared session yet — send a message first to establish encryption.');
          setLoading(false);
          return;
        }

        const number = await generateSafetyNumber(ourKey, theirKey);
        setSafetyNumber(number);
      } catch (err) {
        setError('Failed to generate safety number');
        console.error('[SafetyNumber]', err);
      }
      setLoading(false);
    })();
  }, [open, userId]);

  const handleCopy = () => {
    if (safetyNumber) {
      navigator.clipboard.writeText(safetyNumber);
      setCopied(true);
      toast.success('Safety number copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMarkVerified = () => {
    const stored = JSON.parse(localStorage.getItem('phantom_verified_contacts') || '{}');
    if (verified) {
      delete stored[userId];
      setVerified(false);
      toast('Contact unverified');
    } else {
      stored[userId] = Date.now();
      setVerified(true);
      toast.success('Contact marked as verified!');
    }
    localStorage.setItem('phantom_verified_contacts', JSON.stringify(stored));
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-phantom-green" />
              <h3 className="text-lg font-bold text-phantom-charcoal">Safety Number</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-phantom-gray-100 rounded-xl">
              <X className="w-5 h-5 text-phantom-gray-400" />
            </button>
          </div>

          <p className="text-xs text-phantom-gray-400">
            Compare this number with <span className="font-medium text-phantom-charcoal">@{username}</span> in person or over a trusted channel. If the numbers match, your conversation is securely encrypted end-to-end.
          </p>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-phantom-green animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">{error}</p>
            </div>
          )}

          {safetyNumber && !loading && (
            <>
              {/* Safety number grid */}
              <div className="bg-phantom-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-4 gap-x-4 gap-y-1.5 text-center">
                  {safetyNumber.split(' ').map((group, i) => (
                    <span key={i} className="font-mono text-sm text-phantom-charcoal tracking-wider">
                      {group}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-phantom-gray-600 bg-phantom-gray-50 hover:bg-phantom-gray-100 rounded-xl transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={handleMarkVerified}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    verified
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-phantom-green text-white hover:bg-phantom-green/90'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {verified ? 'Verified' : 'Mark Verified'}
                </button>
              </div>

              {verified && (
                <p className="text-xs text-green-600 text-center">
                  You have verified this contact's identity.
                </p>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
