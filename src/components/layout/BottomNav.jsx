import { motion } from 'framer-motion';
import { MessageCircle, Users, Bitcoin, ShoppingBag } from 'lucide-react';

const tabs = [
  { id: 'wallet', icon: Bitcoin, label: 'Wallet' },
  { id: 'contacts', icon: Users, label: 'Contacts' },
  { id: 'chats', icon: MessageCircle, label: 'Chats' },
  { id: 'shop', icon: ShoppingBag, label: 'Shop' },
];

export default function BottomNav({ activeTab, onTabChange, unreadCount = 0 }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-phantom-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-1 w-1 h-1 rounded-full bg-phantom-green"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-colors duration-200 ${
                    isActive ? 'text-phantom-green' : 'text-phantom-gray-400'
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />

                {id === 'chats' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full bg-phantom-green text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] mt-1 font-medium transition-colors duration-200 ${
                  isActive ? 'text-phantom-green' : 'text-phantom-gray-400'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
