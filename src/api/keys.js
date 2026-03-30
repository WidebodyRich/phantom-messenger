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

/**
 * Register a full key bundle for the current user.
 * Used when an existing user has no local keys (new device, cleared data, etc.)
 */
export async function registerKeys({ identityKeyPublic, signedPreKeyPublic, signedPreKeySignature, preKeys }) {
  return client.post('/api/keys/register', {
    identityKeyPublic,
    signedPreKeyPublic,
    signedPreKeySignature,
    preKeys,
  });
}
