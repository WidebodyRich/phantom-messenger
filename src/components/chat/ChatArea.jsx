import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Phone, Video, Lock, MoreVertical, ChevronDown, Search, BellOff, Trash2, Ban } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useCallContext } from '../../context/WebRTCContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { formatDateSeparator } from '../../utils/formatters';
import { createUserWatermark } from '../../utils/watermark';
import toast from 'react-hot-toast';

export default function ChatArea({ onBack }) {
  const { activeConversation, messages, sendMessage, markConversationRead, loadMessageHistory, loadOlderMessages, muteConversation, deleteConversation } = useChat();
  const { user } = useAuth();
  const { startCall } = useCallContext();
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showChatMenu, setShowChatMenu] = useState(false);

  const conversationMessages = messages[activeConversation?.id] || [];
  const watermarkUrl = useMemo(() => user ? createUserWatermark(user.username) : null, [user?.username]);

  // Load message history when conversation opens
  useEffect(() => {
    if (activeConversation?.id) {
      loadMessageHistory(activeConversation.id);
      setHasMore(true);
    }
  }, [activeConversation?.id, loadMessageHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages.length]);

  // Mark conversation as read when opened
  useEffect(() => {
    if (activeConversation?.id && activeConversation?.unread > 0) {
      markConversationRead(activeConversation.id);
    }
  }, [activeConversation?.id, activeConversation?.unread, markConversationRead]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || !activeConversation?.id) return;
    setLoadingMore(true);
    try {
      const result = await loadOlderMessages(activeConversation.id);
      setHasMore(result.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
    // Load more when scrolled near top
    if (scrollTop < 50) handleLoadMore();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = (text, messageType) => {
    if (activeConversation?.id) {
      sendMessage(activeConversation.id, text, messageType);
    }
  };

  // Group messages by date
  let lastDate = null;
  const renderMessages = conversationMessages.map((msg, i) => {
    const msgDate = new Date(msg.createdAt).toDateString();
    let dateSeparator = null;
    if (msgDate !== lastDate) {
      lastDate = msgDate;
      dateSeparator = (
        <div key={`date-${msgDate}`} className="flex items-center justify-center py-4">
          <span className="bg-phantom-gray-100 text-phantom-gray-400 text-xs font-medium px-4 py-1.5 rounded-full">
            {formatDateSeparator(msg.createdAt)}
          </span>
        </div>
      );
    }
    return (
      <div key={msg.id}>
        {dateSeparator}
        <MessageBubble
          message={msg}
          isMine={msg.senderId === user?.id}
          showTail={i === 0 || conversationMessages[i - 1]?.senderId !== msg.senderId}
        />
      </div>
    );
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-phantom-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden w-9 h-9 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-phantom-gray-500" />
          </button>
          <div className="w-10 h-10 bg-phantom-green/10 rounded-full flex items-center justify-center">
            <span className="text-phantom-green font-semibold">
              {(activeConversation?.username || activeConversation?.name || '?')[0].toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="font-semibold text-phantom-charcoal text-sm">
              {activeConversation?.username || activeConversation?.name}
            </h2>
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-phantom-green" />
              <span className="text-xs text-phantom-gray-400">End-to-end encrypted</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => startCall(activeConversation.id, activeConversation.username || activeConversation.name, 'audio')}
            className="w-9 h-9 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center transition-colors cursor-pointer"
            title="Voice Call"
          >
            <Phone className="w-5 h-5 text-phantom-gray-500" />
          </button>
          <button
            onClick={() => startCall(activeConversation.id, activeConversation.username || activeConversation.name, 'video')}
            className="w-9 h-9 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center transition-colors cursor-pointer"
            title="Face to Face (F2F)"
          >
            <Video className="w-5 h-5 text-phantom-gray-500" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="w-9 h-9 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center transition-colors cursor-pointer"
            >
              <MoreVertical className="w-5 h-5 text-phantom-gray-500" />
            </button>
            <AnimatePresence>
              {showChatMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowChatMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute right-0 top-11 z-50 bg-white rounded-xl shadow-elevated border border-phantom-gray-100 py-1.5 min-w-[180px]"
                  >
                    <button onClick={() => { setShowChatMenu(false); toast('Search coming soon', { icon: '🔍' }); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-phantom-charcoal hover:bg-phantom-gray-50 transition-colors">
                      <Search className="w-4 h-4" /> Search in chat
                    </button>
                    <button onClick={() => { setShowChatMenu(false); muteConversation(activeConversation.id); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-phantom-charcoal hover:bg-phantom-gray-50 transition-colors">
                      <BellOff className="w-4 h-4" /> Mute notifications
                    </button>
                    <button onClick={() => { setShowChatMenu(false); deleteConversation(activeConversation.id); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" /> Delete chat
                    </button>
                    <button onClick={() => { setShowChatMenu(false); toast('Block coming soon', { icon: '🚫' }); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                      <Ban className="w-4 h-4" /> Block user
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 py-4 bg-phantom-gray-50/50"
        style={watermarkUrl ? { backgroundImage: `url(${watermarkUrl})`, backgroundRepeat: 'repeat' } : undefined}
      >
        {conversationMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-phantom-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock className="w-7 h-7 text-phantom-green" />
              </div>
              <p className="text-phantom-gray-400 text-sm font-medium">Messages are end-to-end encrypted</p>
              <p className="text-phantom-gray-300 text-xs mt-1">Say hello to start the conversation</p>
            </div>
          </div>
        ) : (
          <>
            {loadingMore && (
              <div className="flex justify-center py-2">
                <div className="w-5 h-5 border-2 border-phantom-green/30 border-t-phantom-green rounded-full animate-spin" />
              </div>
            )}
            {renderMessages}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Scroll to bottom button */}
        {showScrollDown && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-24 right-8 w-10 h-10 bg-white shadow-elevated rounded-full flex items-center justify-center hover:bg-phantom-gray-50 transition-all"
          >
            <ChevronDown className="w-5 h-5 text-phantom-gray-500" />
          </button>
        )}
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} recipientAddress={activeConversation?.btcAddress} />
    </div>
  );
}
