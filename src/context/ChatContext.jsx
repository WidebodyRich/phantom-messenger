import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as messagesApi from '../api/messages';
import * as groupsApi from '../api/groups';
import { MESSAGE_POLL_INTERVAL } from '../utils/constants';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState({});
  const [groups, setGroups] = useState([]);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const pollRef = useRef(null);

  // Fetch pending messages
  const fetchPending = useCallback(async () => {
    try {
      const res = await messagesApi.getPendingMessages();
      if (res.success && Array.isArray(res.data)) {
        const newMsgs = res.data;
        if (newMsgs.length > 0) {
          setPendingMessages((prev) => [...prev, ...newMsgs]);
          // Organize by sender
          newMsgs.forEach((msg) => {
            const convId = msg.senderId;
            setMessages((prev) => ({
              ...prev,
              [convId]: [...(prev[convId] || []), msg],
            }));
            // Update conversations list
            setConversations((prev) => {
              const existing = prev.find((c) => c.id === convId);
              if (existing) {
                return prev.map((c) =>
                  c.id === convId ? { ...c, lastMessage: msg.ciphertext, lastMessageAt: msg.createdAt, unread: (c.unread || 0) + 1 } : c
                );
              }
              return [{ id: convId, senderId: msg.senderId, lastMessage: msg.ciphertext, lastMessageAt: msg.createdAt, unread: 1 }, ...prev];
            });
            // Acknowledge
            messagesApi.acknowledgeMessage(msg.id).catch(console.error);
          });
        }
      }
    } catch (err) {
      console.error('Fetch pending error:', err);
    }
  }, []);

  // Poll for new messages
  useEffect(() => {
    if (user) {
      fetchPending();
      pollRef.current = setInterval(fetchPending, MESSAGE_POLL_INTERVAL);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user, fetchPending]);

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    try {
      const res = await groupsApi.listGroups();
      if (res.success) {
        setGroups(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Fetch groups error:', err);
    }
  }, []);

  useEffect(() => {
    if (user) fetchGroups();
  }, [user, fetchGroups]);

  const sendMessage = useCallback(async (recipientId, text) => {
    const msg = {
      id: 'temp_' + Date.now(),
      senderId: user?.id,
      recipientId,
      ciphertext: text,
      messageType: 'text',
      createdAt: new Date().toISOString(),
      pending: true,
    };
    // Optimistic update
    setMessages((prev) => ({
      ...prev,
      [recipientId]: [...(prev[recipientId] || []), msg],
    }));
    try {
      await messagesApi.sendMessage({ recipientId, ciphertext: text, messageType: 'text' });
      setMessages((prev) => ({
        ...prev,
        [recipientId]: (prev[recipientId] || []).map((m) => (m.id === msg.id ? { ...m, pending: false } : m)),
      }));
    } catch (err) {
      setMessages((prev) => ({
        ...prev,
        [recipientId]: (prev[recipientId] || []).map((m) => (m.id === msg.id ? { ...m, failed: true } : m)),
      }));
    }
  }, [user]);

  return (
    <ChatContext.Provider value={{
      conversations, setConversations,
      activeConversation, setActiveConversation,
      messages, setMessages,
      groups, fetchGroups,
      sendMessage, fetchPending,
      typingUsers,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
