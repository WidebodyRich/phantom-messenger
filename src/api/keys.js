import client from './client';

export async function getKeyCount() {
  return client.get('/api/keys/count');
}

export async function getKeyBundle(userId) {
  return client.get(`/api/keys/${userId}`);
}

export async function replenishKeys(preKeys) {
  return client.post('/api/keys/replenish', { preKeys });
}
