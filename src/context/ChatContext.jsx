import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as messagesApi from '../api/messages';
import * as groupsApi from '../api/groups';
import * as keysApi from '../api/keys';
import { encrypt, decrypt, startSession, hasSession, restoreEncryptionState, getPreKeyCount, generateMorePreKeys } from '../crypto/signalProtocol';
import { MESSAGE_POLL_INTERVAL } from '../utils/constants';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState({});
  const [groups, setGroups] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const pollRef = useRef(null);
  const encryptionReady = useRef(false);

  // Initialize encryption on mount
  useEffect(() => {
    if (user) {
      restoreEncryptionState().then((restored) => {
        encryptionReady.current = restored;
        if (restored) console.log('[Signal] Encryption state restored');
      });
    }
  }, [user]);

  // Check and replenish pre-keys
  const checkPreKeys = useCallback(async () => {
    try {
      const count = getPreKeyCount();
      if (count < 20) {
        const newKeys = await generateMorePreKeys(count + 100, 80);
        await keysApi.replenishKeys(newKeys.map((pk) => ({ index: pk.keyId, publicKey: pk.publicKey })));
        console.log('[Signal] Replenished pre-keys');
      }
    } catch (err) {
      console.warn('[Signal] Pre-key replenishment failed:', err.message);
    }
  }, []);

  // Ensure session exists with a user before sending
  const ensureSession = useCallback(async (userId) => {
    if (hasSession(userId)) return true;
    try {
      const res = await keysApi.getKeyBundle(userId);
      if (res.success && res.data) {
        await startSession(userId, res.data);
        return true;
      }
    } catch (err) {
      console.warn(`[Signal] Failed to establish session with ${userId}:`, err.message);
    }
    return false;
  }, []);

  // Process a received message — return displayable text
  const decryptReceivedMessage = useCallback(async (msg) => {
    const text = msg.ciphertext || '';

    // Check if this is an encrypted Signal Protocol message (JSON with iv + ct)
    try {
      const parsed = JSON.parse(text);
      if (parsed.iv && parsed.ct) {
        // This is an encrypted message — try to decrypt if we have a session
        if (hasSession(msg.senderId)) {
          try {
            const plaintext = await decrypt(msg.senderId, { body: text, type: msg.signalType || 3 });
            return plaintext;
          } catch (err) {
            console.warn('[Signal] Decryption failed:', err.message);
          }
        }
        // No session or decryption failed — show placeholder
        return '[Encrypted message — session not established]';
      }
    } catch {
      // Not JSON — it's plaintext, fall through
    }

    // Plain text message — return as-is
    return text;
  }, []);

  // Fetch pending messages
  const fetchPending = useCallback(async () => {
    try {
      const res = await messagesApi.getPendingMessages();
      if (res.success && Array.isArray(res.data)) {
        const newMsgs = res.data;
        if (newMsgs.length > 0) {
          for (const msg of newMsgs) {
            const convId = msg.senderId;
            // Decrypt the message
            const plaintext = await decryptReceivedMessage(msg);

            const processedMsg = {
              ...msg,
              plaintext,
              displayText: plaintext,
            };

            setMessages((prev) => ({
              ...prev,
              [convId]: [...(prev[convId] || []), processedMsg],
            }));

            setConversations((prev) => {
              const existing = prev.find((c) => c.id === convId);
              const preview = plaintext.length > 50 ? plaintext.slice(0, 50) + '...' : plaintext;
              if (existing) {
                return prev.map((c) =>
                  c.id === convId ? { ...c, lastMessage: preview, lastMessageAt: msg.createdAt, unread: (c.unread || 0) + 1 } : c
                );
              }
              return [{ id: convId, senderId: msg.senderId, lastMessage: preview, lastMessageAt: msg.createdAt, unread: 1 }, ...prev];
            });

            // Acknowledge receipt
            messagesApi.acknowledgeMessage(msg.id).catch(console.error);
          }
          // Check pre-keys after receiving messages
          checkPreKeys();
        }
      }
    } catch (err) {
      // Don't spam console for token expiry — client.js handles refresh
      if (err?.status !== 401) {
        console.error('[Chat] Fetch pending error:', err?.message || err);
      }
    }
  }, [decryptReceivedMessage, checkPreKeys]);

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

  // Send an encrypted message
  const sendMessage = useCallback(async (recipientId, text, messageType = 'text') => {
    const msg = {
      id: 'temp_' + Date.now(),
      senderId: user?.id,
      recipientId,
      plaintext: text,
      displayText: text,
      messageType,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    // Optimistic update
    setMessages((prev) => ({
      ...prev,
      [recipientId]: [...(prev[recipientId] || []), msg],
    }));

    // Update conversation list
    setConversations((prev) => {
      const preview = text.length > 50 ? text.slice(0, 50) + '...' : text;
      const existing = prev.find((c) => c.id === recipientId);
      if (existing) {
        return prev.map((c) => c.id === recipientId ? { ...c, lastMessage: preview, lastMessageAt: msg.createdAt } : c);
      }
      return [{ id: recipientId, lastMessage: preview, lastMessageAt: msg.createdAt, unread: 0 }, ...prev];
    });

    try {
      // Ensure Signal Protocol session
      // Signal Protocol encryption disabled until two-way X3DH session
      // establishment is fully implemented. Messages are sent as plaintext
      // over TLS. The server stores only ciphertext field.
      const res = await messagesApi.sendMessage({
        recipientId,
        ciphertext: text,
        messageType,
      });
      console.log('[Chat] Message sent:', res);

      setMessages((prev) => ({
        ...prev,
        [recipientId]: (prev[recipientId] || []).map((m) => (m.id === msg.id ? { ...m, pending: false } : m)),
      }));
    } catch (err) {
      console.error('[Chat] Send message failed:', err?.message || err);
      setMessages((prev) => ({
        ...prev,
        [recipientId]: (prev[recipientId] || []).map((m) => (m.id === msg.id ? { ...m, failed: true } : m)),
      }));
    }
  }, [user, ensureSession]);

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
