import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Search, UserPlus } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import * as authApi from '../../api/auth';
import toast from 'react-hot-toast';

export default function NewChatModal({ onClose }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { setActiveConversation, setConversations } = useChat();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await authApi.lookupUser(username.trim());
      if (res.success) {
        setResult(res.data);
      } else {
        toast.error('User not found');
      }
    } catch {
      toast.error('User not found');
    }
    setLoading(false);
  };

  const startChat = () => {
    if (!result) return;
    const conv = {
      id: result.id || result.userId,
      username: result.username,
      lastMessage: null,
      lastMessageAt: null,
      unread: 0,
    };
    setConversations((prev) => {
      if (prev.find((c) => c.id === conv.id)) return prev;
      return [conv, ...prev];
    });
    setActiveConversation(conv);
    onClose();
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
          <h2 className="text-lg font-bold text-phantom-charcoal">New Chat</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-phantom-gray-50 flex items-center justify-center">
            <X className="w-5 h-5 text-phantom-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-phantom-gray-400" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Search by username..."
              className="input-field pl-10"
              autoFocus
            />
          </div>
          <button type="submit" disabled={loading || !username.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Search className="w-4 h-4" /> Find User</>
            )}
          </button>
        </form>

        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 bg-phantom-gray-50 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-phantom-green/10 rounded-full flex items-center justify-center">
                <span className="text-phantom-green font-semibold">{result.username?.[0]?.toUpperCase()}</span>
              </div>
              <div>
                <p className="font-semibold text-phantom-charcoal text-sm">{result.username}</p>
                <p className="text-xs text-phantom-gray-400">Phantom user</p>
              </div>
            </div>
            <button onClick={startChat} className="bg-phantom-green text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-phantom-green-dark transition-all flex items-center gap-1">
              <UserPlus className="w-4 h-4" /> Chat
            </button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
