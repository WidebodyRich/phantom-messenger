import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as messagesApi from '../api/messages';
import * as conversationsApi from '../api/conversations';
import * as groupsApi from '../api/groups';
import * as keysApi from '../api/keys';
import {
  encrypt, decrypt, startSession, hasSession, clearSession,
  restoreEncryptionState, isInitialized, hasLocalKeys,
  getPreKeyCount, generateMorePreKeys,
  isEncryptedMessage, purgeExpiredSkippedKeys,
  waitForPreload,
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
  const encryptionReadyRef = useRef(false); // Sync mirror for queue checks
  const pollRef = useRef(null);
  const pendingErrorCount = useRef(0);
  // Track session init data for first messages (userId -> { ephemeralKeyPublic, usedPreKeyIndex })
  const sessionInitCache = useRef(new Map());
  // Skipped key cleanup interval
  const cleanupRef = useRef(null);
  // Message queue — holds messages sent before encryption is ready
  const messageQueueRef = useRef([]);

  // ═══════════════════════════════════════════
  // ENCRYPTION INITIALIZATION — PRELOAD + BACKGROUND
  // main.jsx already called preloadCryptoKeys() before React rendered.
  // Here we wait for it and set encryptionReady when done.
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    // ── PHASE 1: Instant sync check — lets queue logic work immediately ──
    const t0 = performance.now();
    const localKeysExist = hasLocalKeys();
    const t1 = performance.now();
    console.log(`[Signal] Fast init: ${(t1 - t0).toFixed(1)}ms — ${localKeysExist ? 'HAS KEYS' : 'no keys'}`);

    // ── PHASE 2: Wait for the preload started in main.jsx ──
    const backgroundInit = async () => {
      const t2 = performance.now();
      // waitForPreload() resolves with the result of restoreEncryptionState()
      // which was already kicked off in main.jsx before React rendered.
      let restored = await waitForPreload();
      // If preload didn't run (no local keys at startup), try restore now
      if (!restored && localKeysExist) {
        restored = await restoreEncryptionState();
      }
      const t3 = performance.now();
      console.log(`[Signal] Full restore: ${(t3 - t2).toFixed(0)}ms — ${restored ? 'OK' : 'FAILED'}`);

      if (!cancelled) {
        if (restored) {
          setEncryptionReady(true);
          encryptionReadyRef.current = true;
        } else if (!localKeysExist) {
          // No keys — fresh user. Set ready to prevent lockout;
          // sendMessage queue will wait for key generation elsewhere.
          console.warn('[Signal] No encryption keys found.');
          setEncryptionReady(true);
          encryptionReadyRef.current = true;
        }
      }

      // Background: replenish pre-keys if needed
      if (restored && !cancelled) {
        try {
          const count = getPreKeyCount();
          if (count < 20) {
            const newKeys = await generateMorePreKeys(count + 100, 80);
            await keysApi.replenishKeys(newKeys.map((pk) => ({ index: pk.keyId, publicKey: pk.publicKey })));
            console.log('[Signal] Pre-keys replenished in background');
          }
        } catch (e) {
          console.warn('[Signal] Background pre-key replenishment failed:', e.message);
        }
      }
    };

    backgroundInit();

    // Periodic skipped key cleanup (every 4 hours)
    purgeExpiredSkippedKeys();
    cleanupRef.current = setInterval(purgeExpiredSkippedKeys, 4 * 60 * 60 * 1000);

    return () => {
      cancelled = true;
      if (cleanupRef.current) clearInterval(cleanupRef.current);
    };
  }, [user]);

  // ═══════════════════════════════════════════
  // FLUSH MESSAGE QUEUE — when encryption becomes ready
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (!encryptionReady) return;
    encryptionReadyRef.current = true;
    flushMessageQueue();
  }, [encryptionReady]);

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
  // MESSAGE STATUS HELPER
  // ═══════════════════════════════════════════
  const updateMessageStatus = useCallback((tempId, recipientId, status, failReason = null) => {
    setMessages((prev) => ({
      ...prev,
      [recipientId]: (prev[recipientId] || []).map((m) =>
        m.id === tempId
          ? { ...m, pending: status === 'sending', failed: status === 'failed', failReason }
          : m
      ),
    }));
  }, []);

  // ═══════════════════════════════════════════
  // INTERNAL SEND — does actual encryption + API call
  // Only called when encryption is confirmed ready (isInitialized())
  // ═══════════════════════════════════════════
  const sendMessageInternal = useCallback(async (recipientId, text, messageType = 'text') => {
    // Ensure CryptoKey objects are loaded
    if (!isInitialized()) {
      // One last try — wait for preload
      await waitForPreload();
      if (!isInitialized()) {
        throw new Error('Encryption not initialized — CryptoKeys not imported');
      }
    }

    await ensureSession(recipientId);

    const sessionInit = sessionInitCache.current.get(recipientId) || null;
    const encrypted = await encrypt(recipientId, text, sessionInit);

    if (!encrypted || !encrypted.ciphertext) {
      throw new Error('Encryption produced empty output');
    }

    if (sessionInit) {
      sessionInitCache.current.delete(recipientId);
    }

    const res = await messagesApi.sendMessage({
      recipientId,
      ciphertext: encrypted.ciphertext,
      messageType: encrypted.messageType,
    });

    if (res?.success === false) {
      throw new Error(res?.error || 'Server rejected message');
    }

    return res;
  }, [ensureSession]);

  // ═══════════════════════════════════════════
  // FLUSH MESSAGE QUEUE — sends all queued messages
  // ═══════════════════════════════════════════
  const flushMessageQueue = useCallback(async () => {
    const queue = [...messageQueueRef.current];
    if (queue.length === 0) return;
    messageQueueRef.current = [];
    console.log(`[Phantom] Flushing ${queue.length} queued message(s)`);

    for (const qm of queue) {
      try {
        await sendMessageInternal(qm.recipientId, qm.text, qm.messageType);
        updateMessageStatus(qm.tempId, qm.recipientId, 'sent');
      } catch (err) {
        console.error('[Phantom] Queued message send failed:', err.message);
        updateMessageStatus(qm.tempId, qm.recipientId, 'failed', err.message);
      }
    }
  }, [sendMessageInternal, updateMessageStatus]);

  // ═══════════════════════════════════════════
  // SEND MESSAGE — NEVER FAILS WITH "encryption not ready"
  // Queues the message and shows it optimistically. Queue flushes
  // automatically when encryption becomes ready.
  // ═══════════════════════════════════════════
  const sendMessage = useCallback(async (recipientId, text, messageType = 'text') => {
    if (!text?.trim()) return;

    const tempId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const msg = {
      id: tempId,
      senderId: user?.id,
      recipientId,
      plaintext: text,
      displayText: text,
      messageType,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    // ── OPTIMISTIC UI: Show message immediately ──
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

    // ── Check if encryption is ready RIGHT NOW ──
    if (encryptionReadyRef.current && isInitialized()) {
      // Ready — send immediately
      try {
        await sendMessageInternal(recipientId, text, messageType);
        updateMessageStatus(tempId, recipientId, 'sent');
      } catch (err) {
        console.error('[Chat] Send failed:', err.message);
        updateMessageStatus(tempId, recipientId, 'failed', err.message);

        if (err.message.includes('No key bundle') || err.message.includes('key bundle')) {
          toast.error("Cannot reach recipient's encryption keys. They may need to log in first.");
        } else if (err.message.includes('No session') || err.message.includes('session')) {
          toast.error('Secure session failed. Tap to retry.');
        } else {
          toast.error('Message failed to send. Tap to retry.');
        }
      }
    } else {
      // ── Not ready — QUEUE the message. It will auto-send when ready. ──
      console.log('[Phantom] Encryption not ready — queuing message, will auto-send');
      messageQueueRef.current.push({ tempId, recipientId, text, messageType });

      // Safety timeout: fail after 15 seconds if encryption never initializes
      setTimeout(() => {
        const idx = messageQueueRef.current.findIndex((m) => m.tempId === tempId);
        if (idx !== -1) {
          messageQueueRef.current.splice(idx, 1);
          console.error('[Phantom] Queued message timed out — encryption never initialized');
          updateMessageStatus(tempId, recipientId, 'failed', 'Encryption initialization timed out');
          toast.error('Message timed out. Please try again.');
        }
      }, 15000);
    }
  }, [user, sendMessageInternal, updateMessageStatus]);

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
