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
