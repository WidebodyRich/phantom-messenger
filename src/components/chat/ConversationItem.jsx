import { useState } from 'react';
import { Trash2, Pin, BellOff, Bell, PinOff } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';
import { useChat } from '../../context/ChatContext';

export default function ConversationItem({ conversation, active, onClick }) {
  const { username, name, lastMessage, lastMessageAt, unread, isGroup, isPinned, isMuted } = conversation;
  const displayName = username || name || 'Unknown';
  const { deleteConversation, pinConversation, muteConversation } = useChat();
  const [showMenu, setShowMenu] = useState(false);

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu((prev) => !prev);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    deleteConversation(conversation.id);
  };

  const handlePin = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    pinConversation(conversation.id, !isPinned);
  };

  const handleMute = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    muteConversation(conversation.id, !isMuted);
  };

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left ${
          active ? 'bg-phantom-green/10' : 'hover:bg-phantom-gray-50'
        }`}
      >
        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
          active ? 'bg-phantom-green' : 'bg-phantom-gray-100'
        }`}>
          <span className={`font-semibold text-sm ${active ? 'text-white' : 'text-phantom-gray-500'}`}>
            {isGroup ? '#' : displayName[0]?.toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold truncate ${active ? 'text-phantom-green' : 'text-phantom-charcoal'}`}>
              {displayName}
              {isPinned && <Pin className="inline w-3 h-3 ml-1 text-phantom-gray-400" />}
            </span>
            {lastMessageAt && (
              <span className="text-xs text-phantom-gray-400 flex-shrink-0 ml-2">
                {formatRelativeTime(lastMessageAt)}
              </span>
            )}
          </div>
          {lastMessage && (
            <p className={`text-xs truncate mt-0.5 ${isMuted ? 'text-phantom-gray-300' : 'text-phantom-gray-400'}`}>
              {isMuted && <BellOff className="inline w-3 h-3 mr-1" />}
              {lastMessage.length > 40 ? lastMessage.slice(0, 40) + '...' : lastMessage}
            </p>
          )}
        </div>
        {unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {/* Context menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-2 top-12 z-50 bg-white rounded-xl shadow-elevated border border-phantom-gray-100 py-1.5 min-w-[160px]">
            <button onClick={handlePin} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-phantom-charcoal hover:bg-phantom-gray-50 transition-colors">
              {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              {isPinned ? 'Unpin' : 'Pin'}
            </button>
            <button onClick={handleMute} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-phantom-charcoal hover:bg-phantom-gray-50 transition-colors">
              {isMuted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button onClick={handleDelete} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
