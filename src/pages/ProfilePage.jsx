import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  Check,
  AlertCircle,
  MessageCircle,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as authApi from '../api/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const BIO_MAX = 150;

export default function ProfilePage() {
  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await authApi.getProfile();
      if (res.success) {
        setProfile(res.data);
        setBio(res.data.bio || '');
        setDisplayName(res.data.displayName || '');
      }
    } catch {}
  };

  const handleBioChange = (e) => {
    const val = e.target.value;
    if (val.length <= BIO_MAX) {
      setBio(val);
      setHasChanges(true);
      setError('');
    }
  };

  const handleDisplayNameChange = (e) => {
    setDisplayName(e.target.value);
    setHasChanges(true);
    setError('');
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await authApi.updateProfile({
        bio: bio.trim(),
        displayName: displayName.trim(),
      });
      if (res.success) {
        toast.success('Profile updated!');
        setHasChanges(false);
        if (fetchUser) await fetchUser();
      } else {
        setError(res.error || 'Failed to update profile');
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  const initial = (user?.username || '?')[0].toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full flex flex-col bg-white"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3 border-b border-phantom-gray-200">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-phantom-gray-500" />
        </button>
        <h2 className="text-lg font-bold text-phantom-charcoal">Profile</h2>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto text-sm font-semibold text-phantom-green hover:text-phantom-green/80 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar + Username Hero */}
        <div className="flex flex-col items-center pt-8 pb-6 bg-gradient-to-b from-phantom-gray-50 to-white">
          <div className="relative mb-4">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center ${
                user?.role === 'owner'
                  ? 'bg-gradient-to-br from-amber-400 to-yellow-500'
                  : 'bg-phantom-green/10'
              }`}
            >
              <span
                className={`font-bold text-4xl ${
                  user?.role === 'owner' ? 'text-white' : 'text-phantom-green'
                }`}
              >
                {initial}
              </span>
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-phantom-green rounded-full flex items-center justify-center shadow-lg hover:bg-phantom-green/90 transition-colors">
              <Camera className="w-4 h-4 text-white" />
            </button>
          </div>

          <p className="text-xl font-bold text-phantom-charcoal">
            @{user?.username || 'unknown'}
          </p>

          <div className="flex items-center gap-2 mt-1">
            {user?.role === 'owner' && (
              <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Owner
              </span>
            )}
            {user?.role === 'admin' && (
              <span className="bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Admin
              </span>
            )}
            <span className="text-sm text-phantom-gray-400">
              {user?.tier === 'phantom_elite'
                ? 'Phantom Elite'
                : `${(user?.tier || 'Free').charAt(0).toUpperCase()}${(
                    user?.tier || 'free'
                  ).slice(1)}`}{' '}
              Plan
            </span>
          </div>
        </div>

        {/* Profile Form */}
        <div className="px-5 py-5 space-y-6">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-phantom-gray-400 uppercase tracking-wider mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={handleDisplayNameChange}
              placeholder="How others see your name"
              maxLength={50}
              className="w-full bg-phantom-gray-50 border border-phantom-gray-200 text-phantom-charcoal rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-phantom-green/50 focus:border-phantom-green transition-all text-sm"
            />
            <p className="text-xs text-phantom-gray-300 mt-1">
              Leave blank to use your username
            </p>
          </div>

          {/* Bio */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-phantom-gray-400 uppercase tracking-wider">
                Bio
              </label>
              <span
                className={`text-xs font-medium ${
                  bio.length >= BIO_MAX
                    ? 'text-red-500'
                    : bio.length >= BIO_MAX * 0.8
                    ? 'text-amber-500'
                    : 'text-phantom-gray-300'
                }`}
              >
                {bio.length}/{BIO_MAX}
              </span>
            </div>
            <textarea
              value={bio}
              onChange={handleBioChange}
              placeholder="Tell the world about yourself..."
              rows={3}
              className="w-full bg-phantom-gray-50 border border-phantom-gray-200 text-phantom-charcoal rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-phantom-green/50 focus:border-phantom-green transition-all text-sm resize-none"
            />
            <div className="flex items-center gap-1.5 mt-1">
              <Globe className="w-3 h-3 text-phantom-gray-300" />
              <p className="text-xs text-phantom-gray-300">
                Visible to everyone on Phantom Messenger
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-red-500 text-sm bg-red-50 rounded-xl p-3"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="btn-primary w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                Save Profile
              </>
            )}
          </button>

          {/* Profile Preview Card */}
          <div>
            <h3 className="text-xs font-semibold text-phantom-gray-400 uppercase tracking-wider mb-3">
              Preview
            </h3>
            <div className="bg-phantom-gray-50 border border-phantom-gray-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    user?.role === 'owner'
                      ? 'bg-gradient-to-br from-amber-400 to-yellow-500'
                      : 'bg-phantom-green/10'
                  }`}
                >
                  <span
                    className={`font-bold text-lg ${
                      user?.role === 'owner'
                        ? 'text-white'
                        : 'text-phantom-green'
                    }`}
                  >
                    {initial}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-phantom-charcoal text-sm truncate">
                      {displayName || user?.username || 'unknown'}
                    </p>
                    {user?.role === 'owner' && (
                      <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                        Owner
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-phantom-gray-400">
                    @{user?.username || 'unknown'}
                  </p>
                  {bio ? (
                    <p className="text-sm text-phantom-gray-600 mt-2 leading-relaxed">
                      {bio}
                    </p>
                  ) : (
                    <p className="text-sm text-phantom-gray-300 mt-2 italic">
                      No bio yet
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-phantom-gray-200">
                <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-phantom-green text-white rounded-xl text-sm font-medium hover:bg-phantom-green/90 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  Message
                </button>
              </div>
            </div>
            <p className="text-xs text-phantom-gray-300 mt-2 text-center">
              This is how other users see your profile
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
