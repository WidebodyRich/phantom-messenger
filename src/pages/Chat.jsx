import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import ChatArea from '../components/chat/ChatArea';
import EmptyChat from '../components/chat/EmptyChat';
import ScreenProtection from '../components/security/ScreenProtection';
import { useChat } from '../context/ChatContext';

export default function Chat() {
  const { activeConversation } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // On mobile, close sidebar when conversation is selected
  useEffect(() => {
    if (activeConversation && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [activeConversation]);

  return (
    <ScreenProtection>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-screen flex bg-white overflow-hidden"
      >
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'flex' : 'hidden md:flex'} w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-phantom-gray-200`}>
          <Sidebar onToggle={() => setSidebarOpen(!sidebarOpen)} />
        </div>

        {/* Chat Area */}
        <div className={`${!sidebarOpen || window.innerWidth >= 768 ? 'flex' : 'hidden'} flex-1 flex-col min-w-0`}>
          {activeConversation ? (
            <ChatArea onBack={() => setSidebarOpen(true)} />
          ) : (
            <EmptyChat />
          )}
        </div>
      </motion.div>
    </ScreenProtection>
  );
}
