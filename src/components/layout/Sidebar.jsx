import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, MessageCircle, Users, Settings as SettingsIcon, LogOut, Bitcoin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import ConversationItem from '../chat/ConversationItem';
import NewChatModal from '../chat/NewChatModal';
import WalletView from '../wallet/WalletView';
import SettingsPage from '../../pages/Settings';
import PhantomLogo from '../PhantomLogo';
import { useNavigate } from 'react-router-dom';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { conversations, groups, activeConversation, setActiveConversation } = useChat();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('chats');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();

  const filteredConversations = conversations.filter((c) =>
    (c.username || c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex flex-col h-full w-full bg-white relative">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PhantomLogo size={36} />
            <h1 className="text-xl font-bold text-phantom-green">Phantom</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowNewChat(true)} className="w-9 h-9 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-phantom-gray-500" />
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className="w-9 h-9 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center transition-colors">
              <SettingsIcon className="w-5 h-5 text-phantom-gray-500" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-phantom-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-phantom-gray-50 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none border border-transparent focus:border-phantom-green/30 transition-all"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-5 gap-1 mb-2">
        {[
          { id: 'chats', icon: MessageCircle, label: 'Chats' },
          { id: 'groups', icon: Users, label: 'Groups' },
          { id: 'wallet', icon: Bitcoin, label: 'Wallet' },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              tab === id ? 'bg-phantom-green/10 text-phantom-green' : 'text-phantom-gray-400 hover:bg-phantom-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Settings Panel (overlay) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute inset-0 z-50 bg-white overflow-y-auto"
          >
            <SettingsPage onBack={() => setShowSettings(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3">
        {tab === 'chats' && (
          <div className="space-y-0.5">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  active={activeConversation?.id === conv.id}
                  onClick={() => setActiveConversation(conv)}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-phantom-gray-200 mx-auto mb-3" />
                <p className="text-phantom-gray-400 text-sm font-medium">No conversations yet</p>
                <p className="text-phantom-gray-300 text-xs mt-1">Start a new chat to begin messaging</p>
                <button onClick={() => setShowNewChat(true)} className="btn-primary mt-4 text-sm py-2">
                  <Plus className="w-4 h-4 inline mr-1" /> New Chat
                </button>
              </div>
            )}
          </div>
        )}
        {tab === 'groups' && (
          <div className="space-y-0.5">
            {groups.length > 0 ? (
              groups.map((group) => (
                <ConversationItem key={group.id} conversation={{ ...group, isGroup: true }} onClick={() => setActiveConversation({ ...group, isGroup: true })} />
              ))
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-phantom-gray-200 mx-auto mb-3" />
                <p className="text-phantom-gray-400 text-sm font-medium">No groups yet</p>
                <p className="text-phantom-gray-300 text-xs mt-1">Create a group to chat with multiple people</p>
              </div>
            )}
          </div>
        )}
        {tab === 'wallet' && (
          <WalletView onClose={() => setTab('chats')} />
        )}
      </div>

      {/* User footer */}
      <div className="px-5 py-4 border-t border-phantom-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-phantom-green/10 rounded-full flex items-center justify-center">
              <span className="text-phantom-green font-semibold text-sm">
                {(user?.username || '?')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-phantom-charcoal">{user?.username}</p>
              <p className="text-xs text-phantom-gray-400 capitalize">{user?.tier || 'free'} tier</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors group">
            <LogOut className="w-4 h-4 text-phantom-gray-400 group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      </AnimatePresence>
    </div>
  );
}
