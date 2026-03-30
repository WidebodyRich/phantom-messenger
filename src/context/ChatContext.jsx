import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as messagesApi from '../api/messages';
import * as conversationsApi from '../api/conversations';
import * as groupsApi from '../api/groups';
import * as keysApi from '../api/keys';
import {
  encrypt, decrypt, startSession, hasSession, clearSession,
  restoreEncryptionState, isInitialized,
  getPreKeyCount, generateMorePreKeys,
  isEncryptedMessage, purgeExpiredSkippedKeys,
} from '../crypto/signalProtocol';
import { MESSAGE_POLL_INTERVAL } from '../utils/constants';
import toast from 'react-hot-toast';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState({});
  const [groups, setGroups] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [encryptionReady, setEncryptionReady] = useState(false);
  const pollRef = useRef(null);
  const pendingErrorCount = useRef(0);
  // Track session init data for first messages (userId -> { ephemeralKeyPublic, usedPreKeyIndex })
  const sessionInitCache = useRef(new Map());
  // Skipped key cleanup interval
  const cleanupRef = useRef(null);

  // ═══════════════════════════════════════════
  // ENCRYPTION INITIALIZATION
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    let retryInterval = null;

    const init = async () => {
      const restored = await restoreEncryptionState();
      if (!cancelled) {
        setEncryptionReady(restored);
        if (restored) {
          console.log('[Signal] Encryption state restored');
        } else {
          console.warn('[Signal] No encryption state — retrying...');
          // Retry every second for up to 10 seconds
          let retries = 0;
          retryInterval = setInterval(async () => {
            if (cancelled) { clearInterval(retryInterval); return; }
            const ok = await restoreEncryptionState();
            if (ok || ++retries >= 10) {
              clearInterval(retryInterval);
              if (!cancelled) setEncryptionReady(ok);
              if (!ok) console.error('[Signal] Encryption failed to initialize after retries');
            }
          }, 1000);
        }
      }
    };

    init();

    // Periodic skipped key cleanup (every 4 hours)
    purgeExpiredSkippedKeys();
    cleanupRef.current = setInterval(purgeExpiredSkippedKeys, 4 * 60 * 60 * 1000);

    return () => {
      cancelled = true;
      if (retryInterval) clearInterval(retryInterval);
      if (cleanupRef.current) clearInterval(cleanupRef.current);
    };
  }, [user]);

  // ═══════════════════════════════════════════
  // CONVERSATIONS
  // ═══════════════════════════════════════════
  const fetchConversations = useCallback(async () => {
    try {
      const res = await conversationsApi.getConversations();
      if (res.success && Array.isArray(res.data)) {
        const serverConvos = res.data.map((c) => ({
          id: c.peerId,
          peerId: c.peerId,
          username: c.peerUsername,
          name: c.peerUsername,
          lastMessage: c.lastMessage || '',
          lastMessageAt: c.lastMessageAt,
          unread: c.unreadCount || 0,
          isPinned: c.isPinned || false,
          isMuted: c.isMuted || false,
        }));
        setConversations((prev) => {
          const serverIds = new Set(serverConvos.map((c) => c.id));
          const localOnly = prev.filter((c) => !serverIds.has(c.id));
          return [...serverConvos, ...localOnly];
        });
      }
    } catch (err) {
      if (err?.status !== 401) {
        console.error('[Chat] Fetch conversations error:', err?.message || err);
      }
    }
  }, []);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user, fetchConversations]);

  const deleteConversation = useCallback(async (peerId) => {
    setConversations((prev) => prev.filter((c) => c.id !== peerId));
    if (activeConversation?.id === peerId) setActiveConversation(null);
    try {
      await conversationsApi.deleteConversation(peerId);
    } catch (err) {
      console.error('[Chat] Delete conversation error:', err?.message || err);
    }
  }, [activeConversation]);

  const markConversationRead = useCallback(async (peerId) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === peerId ? { ...c, unread: 0 } : c))
    );
    try {
      await conversationsApi.markConversationRead(peerId);
    } catch (err) {
      console.error('[Chat] Mark read error:', err?.message || err);
    }
  }, []);

  const pinConversation = useCallback(async (peerId) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === peerId ? { ...c, isPinned: !c.isPinned } : c))
    );
    try {
      await conversationsApi.pinConversation(peerId);
    } catch (err) {
      console.error('[Chat] Pin error:', err?.message || err);
    }
  }, []);

  const muteConversation = useCallback(async (peerId) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === peerId ? { ...c, isMuted: !c.isMuted } : c))
    );
    try {
      await conversationsApi.muteConversation(peerId);
    } catch (err) {
      console.error('[Chat] Mute error:', err?.message || err);
    }
  }, []);

  // ═══════════════════════════════════════════
  // MESSAGE HISTORY (client-side decryption)
  // ═══════════════════════════════════════════
  const decryptReceivedMessage = useCallback(async (msg) => {
    const ciphertext = msg.ciphertext || '';
    const senderId = msg.senderId;

    // System messages pass through unencrypted
    if (msg.messageType === 'system') return ciphertext;

    // Encrypted Signal Protocol message
    if (isEncryptedMessage(ciphertext)) {
      try {
        return await decrypt(senderId, ciphertext);
      } catch (err) {
        console.warn('[Signal] Decryption failed for msg', msg.id?.slice(0, 8), ':', err.message);
        return null; // Signal decryption failure
      }
    }

    // Legacy format { iv, ct }
    try {
      const parsed = JSON.parse(ciphertext);
      if (parsed.iv && parsed.ct && hasSession(senderId)) {
        try {
          return await decrypt(senderId, ciphertext);
        } catch (err) {
          console.warn('[Signal] Legacy decryption failed:', err.message);
          return null;
        }
      }
    } catch {
      // Not JSON
    }

    // Unencrypted/legacy plaintext — return as-is (old messages before E2E)
    return ciphertext;
  }, []);

  const loadMessageHistory = useCallback(async (peerId) => {
    if (messages[peerId]?.length > 0) return;
    try {
      const res = await messagesApi.getMessageHistory(peerId);
      if (res.success && res.data?.messages) {
        const decryptedMsgs = await Promise.all(
          res.data.messages.map(async (msg) => {
            const plaintext = await decryptReceivedMessage(msg);
            if (plaintext === null) {
              // Decryption failed — show locked indicator, NOT raw ciphertext
              return { ...msg, displayText: '\u{1F512} Encrypted message', decryptionFailed: true };
            }
            return { ...msg, plaintext, displayText: plaintext };
          })
        );
        setMessages((prev) => ({
          ...prev,
          [peerId]: decryptedMsgs,
        }));
      }
    } catch (err) {
      console.error('[Chat] Load history error:', err?.message || err);
    }
  }, [messages, decryptReceivedMessage]);

  const loadOlderMessages = useCallback(async (peerId) => {
    const convMessages = messages[peerId] || [];
    if (convMessages.length === 0) return { hasMore: false };
    const oldestId = convMessages[0].id;
    try {
      const res = await messagesApi.getMessageHistory(peerId, { before: oldestId });
      if (res.success && res.data?.messages?.length > 0) {
        const decryptedMsgs = await Promise.all(
          res.data.messages.map(async (msg) => {
            const plaintext = await decryptReceivedMessage(msg);
            if (plaintext === null) {
              return { ...msg, displayText: '\u{1F512} Encrypted message', decryptionFailed: true };
            }
            return { ...msg, plaintext, displayText: plaintext };
          })
        );
        setMessages((prev) => ({
          ...prev,
          [peerId]: [...decryptedMsgs, ...(prev[peerId] || [])],
        }));
        return { hasMore: res.data.hasMore };
      }
      return { hasMore: false };
    } catch (err) {
      console.error('[Chat] Load older messages error:', err?.message || err);
      return { hasMore: false };
    }
  }, [messages, decryptReceivedMessage]);

  // ═══════════════════════════════════════════
  // PRE-KEY REPLENISHMENT
  // ═══════════════════════════════════════════
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

  // ═══════════════════════════════════════════
  // SESSION ESTABLISHMENT
  // ═══════════════════════════════════════════
  const ensureSession = useCallback(async (userId) => {
    if (hasSession(userId)) return true;
    if (!isInitialized()) {
      throw new Error('Encryption not initialized — cannot establish session');
    }
    const res = await keysApi.getKeyBundle(userId);
    if (res.success && res.data) {
      const sessionInit = await startSession(userId, res.data);
      sessionInitCache.current.set(userId, sessionInit);
      return true;
    }
    throw new Error('No key bundle available for recipient — they may need to log in first');
  }, []);

  // ═══════════════════════════════════════════
  // RECEIVE PENDING MESSAGES
  // ═══════════════════════════════════════════
  const fetchPending = useCallback(async () => {
    try {
      const res = await messagesApi.getPendingMessages();
      if (res.success && Array.isArray(res.data)) {
        pendingErrorCount.current = 0;
        const newMsgs = res.data;
        if (newMsgs.length > 0) {
          console.log('[Chat] Received', newMsgs.length, 'pending messages');
          for (const msg of newMsgs) {
            const convId = msg.senderId;
            const plaintext = await decryptReceivedMessage(msg);

            let processedMsg;
            if (plaintext === null) {
              // Decryption failed — show locked indicator, NEVER show raw ciphertext
              processedMsg = {
                ...msg,
                displayText: '\u{1F512} Encrypted message',
                decryptionFailed: true,
              };
            } else {
              processedMsg = {
                ...msg,
                plaintext,
                displayText: plaintext,
              };
            }

            setMessages((prev) => ({
              ...prev,
              [convId]: [...(prev[convId] || []), processedMsg],
            }));

            const preview = processedMsg.decryptionFailed
              ? '\u{1F512} Encrypted message'
              : (plaintext.length > 50 ? plaintext.slice(0, 50) + '...' : plaintext);
            const senderName = msg.senderUsername || '';

            setConversations((prev) => {
              const existing = prev.find((c) => c.id === convId);
              if (existing) {
                return prev.map((c) =>
                  c.id === convId ? { ...c, lastMessage: preview, lastMessageAt: msg.createdAt, unread: (c.unread || 0) + 1, username: c.username || senderName, name: c.name || senderName } : c
                );
              }
              return [{ id: convId, senderId: msg.senderId, username: senderName, name: senderName, lastMessage: preview, lastMessageAt: msg.createdAt, unread: 1 }, ...prev];
            });

            // Acknowledge receipt
            messagesApi.acknowledgeMessage(msg.id).catch(console.error);
          }
          checkPreKeys();
        }
      }
    } catch (err) {
      if (err?.status !== 401) {
        pendingErrorCount.current = (pendingErrorCount.current || 0) + 1;
        if (pendingErrorCount.current >= 3 && pendingErrorCount.current % 10 === 0) {
          console.warn('[Chat] Fetch pending error (repeated):', err?.message || err);
        }
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

  // ═══════════════════════════════════════════
  // SEND MESSAGE — ENCRYPTED OR FAIL. NO PLAINTEXT. EVER.
  // ═══════════════════════════════════════════
  const sendMessage = useCallback(async (recipientId, text, messageType = 'text') => {
    const msgId = 'temp_' + Date.now();
    const msg = {
      id: msgId,
      senderId: user?.id,
      recipientId,
      plaintext: text,
      displayText: text,
      messageType,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    // Optimistic update — show plaintext LOCALLY only
    setMessages((prev) => ({
      ...prev,
      [recipientId]: [...(prev[recipientId] || []), msg],
    }));

    setConversations((prev) => {
      const preview = text.length > 50 ? text.slice(0, 50) + '...' : text;
      const existing = prev.find((c) => c.id === recipientId);
      if (existing) {
        return prev.map((c) => c.id === recipientId ? { ...c, lastMessage: preview, lastMessageAt: msg.createdAt } : c);
      }
      return [{ id: recipientId, lastMessage: preview, lastMessageAt: msg.createdAt, unread: 0 }, ...prev];
    });

    try {
      // ── HARD REQUIREMENT: Encryption MUST be initialized ──
      if (!isInitialized()) {
        throw new Error('encryption_not_ready');
      }

      // ── Establish Signal Protocol session ──
      await ensureSession(recipientId);

      // ── Get session init data for PreKey message ──
      const sessionInit = sessionInitCache.current.get(recipientId) || null;

      // ── ENCRYPT — this MUST succeed or the message does NOT send ──
      const encrypted = await encrypt(recipientId, text, sessionInit);

      if (!encrypted || !encrypted.ciphertext) {
        throw new Error('Encryption produced empty output');
      }

      // Clear session init cache after first use
      if (sessionInit) {
        sessionInitCache.current.delete(recipientId);
      }

      // ── Send ONLY the encrypted envelope. NO plaintext. NO content. NO text field. ──
      const res = await messagesApi.sendMessage({
        recipientId,
        ciphertext: encrypted.ciphertext,
        messageType: encrypted.messageType, // 'prekey' or 'signal'
      });

      const success = res?.success !== false;
      if (success) {
        setMessages((prev) => ({
          ...prev,
          [recipientId]: (prev[recipientId] || []).map((m) =>
            m.id === msgId ? { ...m, pending: false, failed: false } : m
          ),
        }));
      } else {
        throw new Error(res?.error || 'Server rejected message');
      }
    } catch (err) {
      const errMsg = err?.message || String(err);
      console.error('[Chat] Send failed:', errMsg);

      // Mark message as failed with the reason
      setMessages((prev) => ({
        ...prev,
        [recipientId]: (prev[recipientId] || []).map((m) =>
          m.id === msgId ? { ...m, pending: false, failed: true, failReason: errMsg } : m
        ),
      }));

      // Show actionable error to user
      if (errMsg === 'encryption_not_ready') {
        toast.error('Encryption not ready. Please wait a moment and try again.');
      } else if (errMsg.includes('No key bundle') || errMsg.includes('key bundle')) {
        toast.error("Cannot reach recipient's encryption keys. They may need to log in first.");
      } else if (errMsg.includes('No session') || errMsg.includes('session')) {
        toast.error('Secure session failed. Please try again.');
      } else {
        toast.error('Message failed to send. Tap to retry.');
      }
    }
  }, [user, ensureSession]);

  // ═══════════════════════════════════════════
  // RETRY FAILED MESSAGE
  // ═══════════════════════════════════════════
  const retrySendMessage = useCallback(async (failedMsg) => {
    if (!failedMsg?.recipientId || !failedMsg?.plaintext) return;

    // If the session was broken, clear it so ensureSession re-establishes
    if (failedMsg.failReason?.includes('session') || failedMsg.failReason?.includes('No session')) {
      clearSession(failedMsg.recipientId);
    }

    // Remove the failed message
    setMessages((prev) => ({
      ...prev,
      [failedMsg.recipientId]: (prev[failedMsg.recipientId] || []).filter((m) => m.id !== failedMsg.id),
    }));

    // Re-send
    await sendMessage(failedMsg.recipientId, failedMsg.plaintext || failedMsg.displayText, failedMsg.messageType);
  }, [sendMessage]);

  return (
    <ChatContext.Provider value={{
      conversations, setConversations,
      activeConversation, setActiveConversation,
      messages, setMessages,
      groups, fetchGroups,
      sendMessage, retrySendMessage,
      fetchPending, fetchConversations,
      deleteConversation, markConversationRead,
      pinConversation, muteConversation,
      loadMessageHistory, loadOlderMessages,
      typingUsers, encryptionReady,
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
