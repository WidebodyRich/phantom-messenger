import client from './client';

export async function sendMessage({ recipientId, ciphertext, messageType = 'text', sealedSender }) {
  return client.post('/api/messages/send', { recipientId, ciphertext, messageType, sealedSender });
}

export async function getPendingMessages() {
  return client.get('/api/messages/pending');
}

export async function acknowledgeMessage(messageId) {
  return client.post('/api/messages/ack', { messageId });
}

export async function getMessageHistory(peerId, { limit = 50, before } = {}) {
  const params = new URLSearchParams({ limit });
  if (before) params.append('before', before);
  return client.get(`/api/messages/history/${peerId}?${params}`);
}

export async function reportScreenshot(conversationPartnerId) {
  return client.post('/api/messages/screenshot-alert', { conversationPartnerId });
}

/**
 * Request a peer to reset their Signal Protocol session with us.
 * Called when we receive a message we can't decrypt (key mismatch).
 */
export async function requestSessionReset(targetUserId) {
  return client.post('/api/messages/session-reset', { targetUserId });
}

/**
 * Check for pending session resets targeting us.
 * Returns array of requester user IDs, and deletes them from the server.
 */
export async function getSessionResets() {
  return client.get('/api/messages/session-resets');
}

