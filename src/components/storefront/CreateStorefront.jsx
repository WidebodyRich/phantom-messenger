import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Store, Upload, Globe, Lock } from 'lucide-react';
import { createStorefront } from '../../api/storefronts';
import { uploadAttachment } from '../../api/attachments';
import toast from 'react-hot-toast';

const CATEGORIES = ['general', 'digital', 'physical', 'services', 'stickers', 'premium'];

export default function CreateStorefront({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [isPublic, setIsPublic] = useState(true);
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [creating, setCreating] = useState(false);

  const handleFile = (file, setFile, setPreview) => {
    if (!file) return;
    setFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Store name is required'); return; }
    setCreating(true);
    try {
      let avatarUrl = null;
      let bannerUrl = null;

      // Upload images if provided
      if (avatarFile) {
        const res = await uploadAttachment(avatarFile);
        avatarUrl = res.data?.url || res.url;
      }
      if (bannerFile) {
        const res = await uploadAttachment(bannerFile);
        bannerUrl = res.data?.url || res.url;
      }

      const res = await createStorefront({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        isPublic,
        avatarUrl,
        bannerUrl,
      });

      onCreated?.(res.data || res);
    } catch (e) {
      toast.error(e.message || 'Failed to create storefront');
    }
    setCreating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-phantom-charcoal flex items-center gap-2">
            <Store className="w-5 h-5 text-phantom-green" /> Create Storefront
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-phantom-gray-50 flex items-center justify-center">
            <X className="w-5 h-5 text-phantom-gray-400" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Banner Upload */}
          <label className="block cursor-pointer">
            <div className="h-24 rounded-xl bg-phantom-gray-50 border-2 border-dashed border-phantom-gray-200 overflow-hidden flex items-center justify-center hover:border-phantom-green/30 transition-colors">
              {bannerPreview ? (
                <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Upload className="w-5 h-5 text-phantom-gray-300 mx-auto" />
                  <span className="text-[10px] text-phantom-gray-400">Upload banner</span>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0], setBannerFile, setBannerPreview)} />
          </label>

          {/* Avatar Upload */}
          <div className="flex items-center gap-3">
            <label className="cursor-pointer flex-shrink-0">
              <div className="w-16 h-16 rounded-xl bg-phantom-gray-50 border-2 border-dashed border-phantom-gray-200 overflow-hidden flex items-center justify-center hover:border-phantom-green/30 transition-colors">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-6 h-6 text-phantom-gray-300" />
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0], setAvatarFile, setAvatarPreview)} />
            </label>
            <div className="flex-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Store name *"
                maxLength={100}
                className="w-full bg-phantom-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:border-phantom-green/30"
              />
            </div>
          </div>

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your store..."
            maxLength={2000}
            rows={3}
            className="w-full bg-phantom-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:border-phantom-green/30 resize-none"
          />

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-phantom-charcoal mb-1.5 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    category === cat
                      ? 'bg-phantom-green text-white'
                      : 'bg-phantom-gray-50 text-phantom-gray-500 hover:bg-phantom-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Public / Private */}
          <div>
            <label className="text-xs font-semibold text-phantom-charcoal mb-1.5 block">Visibility</label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPublic(true)}
                className={`flex-1 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  isPublic ? 'bg-phantom-green text-white' : 'bg-phantom-gray-50 text-phantom-gray-500'
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> Public
              </button>
              <button
                onClick={() => setIsPublic(false)}
                className={`flex-1 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  !isPublic ? 'bg-phantom-green text-white' : 'bg-phantom-gray-50 text-phantom-gray-500'
                }`}
              >
                <Lock className="w-3.5 h-3.5" /> Private
              </button>
            </div>
            {!isPublic && (
              <p className="text-[10px] text-phantom-gray-400 mt-1">An invite code will be generated. Only people with the code can join.</p>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={creating || !name.trim()}
            className="w-full py-3.5 bg-phantom-green text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-phantom-green-dark transition-colors disabled:opacity-50"
          >
            {creating ? <span className="animate-spin">◌</span> : <Store className="w-4 h-4" />}
            {creating ? 'Creating...' : 'Create Storefront'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
