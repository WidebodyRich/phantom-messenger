import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Upload, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2, Shield } from 'lucide-react';
import { createBackup, restoreBackup } from '../crypto/backup';
import toast from 'react-hot-toast';

export default function BackupRestore() {
  const [mode, setMode] = useState('idle'); // 'idle' | 'backup' | 'restore'
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef(null);

  const reset = () => {
    setMode('idle');
    setPassphrase('');
    setConfirmPassphrase('');
    setError('');
    setSelectedFile(null);
  };

  const handleCreateBackup = async () => {
    setError('');
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }

    setLoading(true);
    try {
      const blob = await createBackup(passphrase);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `phantom-backup-${timestamp}.phbk`;

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Backup created and downloaded');
      reset();
    } catch (err) {
      setError(err.message || 'Backup failed');
    }
    setLoading(false);
  };

  const handleRestore = async () => {
    setError('');
    if (!selectedFile) {
      setError('Select a backup file');
      return;
    }
    if (!passphrase) {
      setError('Enter the backup passphrase');
      return;
    }

    setLoading(true);
    try {
      const count = await restoreBackup(selectedFile, passphrase);
      toast.success(`Restored ${count} keys — please reload the app`);
      reset();
      // Give the user a moment to see the toast, then reload
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setError(err.message || 'Restore failed');
    }
    setLoading(false);
  };

  if (mode === 'idle') {
    return (
      <div className="space-y-2">
        <button
          onClick={() => { setMode('backup'); setError(''); setPassphrase(''); setConfirmPassphrase(''); }}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-phantom-gray-50 transition-colors text-left"
        >
          <div className="w-9 h-9 bg-phantom-green/10 rounded-xl flex items-center justify-center">
            <Download className="w-4 h-4 text-phantom-green" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-phantom-charcoal">Create Backup</p>
            <p className="text-xs text-phantom-gray-400">Export encrypted backup file</p>
          </div>
        </button>
        <button
          onClick={() => { setMode('restore'); setError(''); setPassphrase(''); setSelectedFile(null); }}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-phantom-gray-50 transition-colors text-left"
        >
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
            <Upload className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-phantom-charcoal">Restore Backup</p>
            <p className="text-xs text-phantom-gray-400">Import from encrypted backup file</p>
          </div>
        </button>
      </div>
    );
  }

  if (mode === 'backup') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="bg-phantom-green/5 border border-phantom-green/20 rounded-xl p-3">
          <p className="text-xs text-phantom-charcoal leading-relaxed">
            <strong>What's backed up:</strong> Signal Protocol keys, sessions, wallet, verified contacts, and all encrypted settings. Protected with your passphrase via PBKDF2 + AES-256-GCM.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-phantom-charcoal mb-2">Backup Passphrase</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={passphrase}
              onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
              placeholder="At least 8 characters"
              className="input-field pr-10"
              autoFocus
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-phantom-gray-400">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-phantom-charcoal mb-2">Confirm Passphrase</label>
          <input
            type={showPass ? 'text' : 'password'}
            value={confirmPassphrase}
            onChange={(e) => { setConfirmPassphrase(e.target.value); setError(''); }}
            placeholder="Re-enter passphrase"
            className="input-field"
          />
        </div>

        {error && (
          <p className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={reset} className="flex-1 py-2.5 text-sm font-medium text-phantom-gray-500 bg-phantom-gray-50 hover:bg-phantom-gray-100 rounded-xl">
            Cancel
          </button>
          <button
            onClick={handleCreateBackup}
            disabled={loading || passphrase.length < 8}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4" /> Download Backup</>}
          </button>
        </div>
      </motion.div>
    );
  }

  if (mode === 'restore') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Warning:</strong> Restoring will replace all current local crypto keys and sessions. Make sure you have a backup of your current data if needed.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-phantom-charcoal mb-2">Backup File (.phbk)</label>
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-3 px-4 border-2 border-dashed border-phantom-gray-200 rounded-xl text-sm text-phantom-gray-400 hover:border-phantom-green/50 hover:text-phantom-green transition-colors"
          >
            {selectedFile ? (
              <span className="flex items-center justify-center gap-2 text-phantom-charcoal">
                <CheckCircle2 className="w-4 h-4 text-phantom-green" />
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            ) : (
              'Click to select backup file'
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".phbk"
            className="hidden"
            onChange={(e) => { setSelectedFile(e.target.files?.[0] || null); setError(''); }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-phantom-charcoal mb-2">Backup Passphrase</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={passphrase}
              onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
              placeholder="Enter backup passphrase"
              className="input-field pr-10"
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-phantom-gray-400">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={reset} className="flex-1 py-2.5 text-sm font-medium text-phantom-gray-500 bg-phantom-gray-50 hover:bg-phantom-gray-100 rounded-xl">
            Cancel
          </button>
          <button
            onClick={handleRestore}
            disabled={loading || !selectedFile || !passphrase}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4" /> Restore</>}
          </button>
        </div>
      </motion.div>
    );
  }
}
