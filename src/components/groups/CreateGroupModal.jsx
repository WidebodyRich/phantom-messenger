import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Users } from 'lucide-react';
import * as groupsApi from '../../api/groups';
import { useChat } from '../../context/ChatContext';
import toast from 'react-hot-toast';

export default function CreateGroupModal({ onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { fetchGroups } = useChat();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await groupsApi.createGroup({ name: name.trim(), description: description.trim() });
      if (res.success) {
        toast.success('Group created!');
        await fetchGroups();
        onClose();
      } else {
        toast.error(res.error || 'Failed to create group');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create group');
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl shadow-elevated w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-phantom-green/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-phantom-green" />
            </div>
            <h2 className="text-lg font-bold text-phantom-charcoal">Create Group</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-phantom-gray-50 flex items-center justify-center">
            <X className="w-5 h-5 text-phantom-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-phantom-charcoal mb-2">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Project Alpha"
              className="input-field"
              autoFocus
              maxLength={64}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-phantom-charcoal mb-2">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              className="input-field resize-none"
              rows={3}
              maxLength={256}
            />
          </div>
          <button type="submit" disabled={loading || !name.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Users className="w-4 h-4" /> Create Group</>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
