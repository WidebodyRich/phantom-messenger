import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import MobileHeader from '../components/layout/MobileHeader';
import ContactsList from '../components/layout/ContactsList';
import ChatArea from '../components/chat/ChatArea';
import EmptyChat from '../components/chat/EmptyChat';
import CallScreen from '../components/calls/CallScreen';
import IncomingCall from '../components/calls/IncomingCall';
import ScreenProtection from '../components/security/ScreenProtection';
import NewChatModal from '../components/chat/NewChatModal';
import ConversationItem from '../components/chat/ConversationItem';
import WalletView from '../components/wallet/WalletView';
import MarketplaceHome from '../components/storefront/MarketplaceHome';
import SettingsPage from './Settings';
import { useChat } from '../context/ChatContext';
import { useCallContext } from '../context/WebRTCContext';
import { MessageCircle, Users } from 'lucide-react';

export default function Chat() {
  const { activeConversation, setActiveConversation, conversations, groups } = useChat();
  const {
    activeCall, incomingCall, muted, videoEnabled,
    acceptCall, declineCall, endCall, toggleMute, toggleVideo,
    localStream, remoteStream,
  } = useCallContext();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState('chats');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [chatSubTab, setChatSubTab] = useState('chats');

  // Track viewport size
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // On mobile, close sidebar when conversation is selected
  useEffect(() => {
    if (activeConversation && isMobile) {
      setSidebarOpen(false);
    }
  }, [activeConversation, isMobile]);

  const handleStartChat = useCallback((contact) => {
    setActiveConversation(contact);
    setMobileTab('chats');
  }, [setActiveConversation]);

  // Calculate unread count
  const unreadCount = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  // Filter conversations for search
  const filteredConversations = conversations.filter((c) =>
    (c.username || c.name || '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredGroups = groups.filter((g) =>
    (g.name || '').toLowerCase().includes(search.toLowerCase())
  );

  // Tab title mapping
  const tabTitles = { wallet: 'Wallet', contacts: 'Contacts', chats: 'Chats', shop: 'Shop' };

  // ── Call overlays (shared between mobile and desktop) ──
  const callOverlays = (
    <>
      <AnimatePresence>
        {incomingCall && !activeCall && (
          <IncomingCall call={incomingCall} onAccept={acceptCall} onDecline={declineCall} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeCall && (
          <CallScreen
            call={activeCall} localStream={localStream} remoteStream={remoteStream}
            muted={muted} videoEnabled={videoEnabled}
            onToggleMute={toggleMute} onToggleVideo={toggleVideo} onEnd={endCall}
          />
        )}
      </AnimatePresence>
    </>
  );

  // ── Mobile view ──
  if (isMobile) {
    // If a conversation is open, show the chat area full-screen
    if (activeConversation) {
      return (
        <ScreenProtection>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen flex flex-col bg-white overflow-hidden"
          >
            <ChatArea onBack={() => setActiveConversation(null)} />
          </motion.div>
          {callOverlays}
        </ScreenProtection>
      );
    }

    // Settings overlay
    if (showSettings) {
      return (
        <ScreenProtection>
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="h-screen bg-white overflow-y-auto"
          >
            <SettingsPage onBack={() => setShowSettings(false)} />
          </motion.div>
        </ScreenProtection>
      );
    }

    return (
      <ScreenProtection>
        <div className="h-screen flex flex-col bg-white overflow-hidden">
          {/* Mobile header */}
          <MobileHeader
            title={tabTitles[mobileTab]}
            search={search}
            onSearchChange={setSearch}
            onNewChat={mobileTab === 'chats' ? () => setShowNewChat(true) : null}
            onOpenSettings={() => setShowSettings(true)}
          />

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto pb-20">
            {mobileTab === 'chats' && (
              <div>
                {/* Chats / Groups toggle */}
                <div className="flex px-4 gap-2 py-2">
                  <button
                    onClick={() => setChatSubTab('chats')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      chatSubTab === 'chats'
                        ? 'bg-phantom-green text-white'
                        : 'bg-phantom-gray-50 text-phantom-gray-500'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5 inline mr-1" />
                    Chats
                  </button>
                  <button
                    onClick={() => setChatSubTab('groups')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      chatSubTab === 'groups'
                        ? 'bg-phantom-green text-white'
                        : 'bg-phantom-gray-50 text-phantom-gray-500'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 inline mr-1" />
                    Groups
                  </button>
                </div>

                {chatSubTab === 'chats' && (
                  <div className="px-3">
                    {filteredConversations.length > 0 ? (
                      filteredConversations.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          active={false}
                          onClick={() => setActiveConversation(conv)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <MessageCircle className="w-12 h-12 text-phantom-gray-200 mx-auto mb-3" />
                        <p className="text-phantom-gray-400 text-sm">No conversations yet</p>
                      </div>
                    )}
                  </div>
                )}

                {chatSubTab === 'groups' && (
                  <div className="px-3">
                    {filteredGroups.length > 0 ? (
                      filteredGroups.map((group) => (
                        <ConversationItem
                          key={group.id}
                          conversation={{ ...group, isGroup: true }}
                          active={false}
                          onClick={() => setActiveConversation({ ...group, isGroup: true })}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-phantom-gray-200 mx-auto mb-3" />
                        <p className="text-phantom-gray-400 text-sm">No groups yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {mobileTab === 'contacts' && (
              <ContactsList onStartChat={handleStartChat} />
            )}

            {mobileTab === 'wallet' && (
              <div className="px-3">
                <WalletView onClose={() => setMobileTab('chats')} />
              </div>
            )}

            {mobileTab === 'shop' && (
              <div className="px-3">
                <MarketplaceHome />
              </div>
            )}
          </div>

          {/* Bottom nav */}
          <BottomNav
            activeTab={mobileTab}
            onTabChange={setMobileTab}
            unreadCount={unreadCount}
          />
        </div>

        {/* New Chat Modal */}
        <AnimatePresence>
          {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
        </AnimatePresence>

        {callOverlays}
      </ScreenProtection>
    );
  }

  // ── Desktop view (unchanged) ──
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

      {callOverlays}
    </ScreenProtection>
  );
}
