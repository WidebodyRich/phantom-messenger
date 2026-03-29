import client from './client';

export async function getConversations() {
  return client.get('/api/conversations');
}

export async function deleteConversation(peerId) {
  return client.post('/api/conversations/delete', { peerId });
}

export async function pinConversation(peerId, isPinned) {
  return client.post('/api/conversations/pin', { peerId, isPinned });
}

export async function muteConversation(peerId, isMuted) {
  return client.post('/api/conversations/mute', { peerId, isMuted });
}

export async function markConversationRead(peerId) {
  return client.post('/api/conversations/read', { peerId });
}
