import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, Video, Lock, MoreVertical, ChevronDown } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { formatDateSeparator } from '../../utils/formatters';

export default function ChatArea({ onBack }) {
  const { activeConversation, messages, sendMessage, markConversationRead } = useChat();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const conversationMessages = messages[activeConversation?.id] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages.length]);

  // Mark conversation as read when opened
  useEffect(() => {
    if (activeConversation?.id && activeConversation?.unread > 0) {
      markConversationRead(activeConversation.id);
    }
  }, [activeConversation?.id, activeConversation?.unread, markConversationRead]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
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
          <button className="w-9 h-9 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center transition-colors">
            <Phone className="w-5 h-5 text-phantom-gray-500" />
          </button>
          <button className="w-9 h-9 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center transition-colors">
            <Video className="w-5 h-5 text-phantom-gray-500" />
          </button>
          <button className="w-9 h-9 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center transition-colors">
            <MoreVertical className="w-5 h-5 text-phantom-gray-500" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 py-4 bg-phantom-gray-50/50"
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
