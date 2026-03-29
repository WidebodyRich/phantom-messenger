import client from './client';

export async function getConversations() {
  return client.get('/api/conversations');
}

export async function deleteConversation(peerId) {
  return client.delete(`/api/conversations/${peerId}`);
}

export async function pinConversation(peerId) {
  return client.post(`/api/conversations/${peerId}/pin`);
}

export async function muteConversation(peerId) {
  return client.post(`/api/conversations/${peerId}/mute`);
}

export async function markConversationRead(peerId) {
  return client.post(`/api/conversations/${peerId}/read`);
}
