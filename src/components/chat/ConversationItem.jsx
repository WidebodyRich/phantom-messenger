import { formatRelativeTime } from '../../utils/formatters';

export default function ConversationItem({ conversation, active, onClick }) {
  const { username, name, lastMessage, lastMessageAt, unread, isGroup } = conversation;
  const displayName = username || name || 'Unknown';

  return (
    <button
      onClick={onClick}
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
          </span>
          {lastMessageAt && (
            <span className="text-xs text-phantom-gray-400 flex-shrink-0 ml-2">
              {formatRelativeTime(lastMessageAt)}
            </span>
          )}
        </div>
        {lastMessage && (
          <p className="text-xs text-phantom-gray-400 truncate mt-0.5">
            {lastMessage.length > 40 ? lastMessage.slice(0, 40) + '...' : lastMessage}
          </p>
        )}
      </div>
      {unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
    </button>
  );
}
