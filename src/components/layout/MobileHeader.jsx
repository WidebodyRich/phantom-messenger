import { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PhantomLogo from '../PhantomLogo';

export default function MobileHeader({ onNewChat, onOpenSettings, search, onSearchChange, title }) {
  const { user } = useAuth();
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="md:hidden bg-white sticky top-0 z-40">
      {/* Main header row */}
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <PhantomLogo size={32} />
          <h1 className="text-lg font-bold text-phantom-charcoal">{title || 'Phantom'}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-phantom-gray-50 transition-colors"
          >
            {showSearch ? (
              <X className="w-5 h-5 text-phantom-gray-500" />
            ) : (
              <Search className="w-5 h-5 text-phantom-gray-500" />
            )}
          </button>

          {onNewChat && (
            <button
              onClick={onNewChat}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-phantom-gray-50 transition-colors"
            >
              <Plus className="w-5 h-5 text-phantom-gray-500" />
            </button>
          )}

          {/* Avatar - opens settings */}
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 bg-phantom-green/10 rounded-full flex items-center justify-center"
          >
            <span className="text-phantom-green font-semibold text-sm">
              {(user?.username || '?')[0].toUpperCase()}
            </span>
          </button>
        </div>
      </div>

      {/* Expandable search bar */}
      {showSearch && (
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-phantom-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              autoFocus
              className="w-full bg-phantom-gray-50 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none border border-transparent focus:border-phantom-green/30 transition-all"
            />
          </div>
        </div>
      )}
    </div>
  );
}
