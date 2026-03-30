import { useState } from 'react';
import { Search, UserPlus, MessageCircle } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export default function ContactsList({ onStartChat }) {
  const { conversations } = useChat();
  const [search, setSearch] = useState('');

  // Extract unique contacts from conversations
  const contacts = conversations.filter((c) =>
    !c.isGroup && (c.username || c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-phantom-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full bg-phantom-gray-50 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none border border-transparent focus:border-phantom-green/30 transition-all"
          />
        </div>
      </div>

      {/* Contact list */}
      <div className="px-3">
        {contacts.length > 0 ? (
          contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => onStartChat(contact)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-phantom-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-phantom-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-phantom-green font-semibold text-sm">
                  {(contact.username || contact.name || '?')[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-phantom-charcoal">
                  {contact.username || contact.name}
                </p>
                <p className="text-xs text-phantom-gray-400">Tap to message</p>
              </div>
              <MessageCircle className="w-4 h-4 text-phantom-gray-300" />
            </button>
          ))
        ) : (
          <div className="text-center py-12">
            <UserPlus className="w-12 h-12 text-phantom-gray-200 mx-auto mb-3" />
            <p className="text-phantom-gray-400 text-sm font-medium">
              {search ? 'No contacts found' : 'No contacts yet'}
            </p>
            <p className="text-phantom-gray-300 text-xs mt-1">
              Start a chat to add someone to your contacts
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
