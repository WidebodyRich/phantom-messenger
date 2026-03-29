import client, { setAccessToken } from './client';

export async function registerWithSeed({ username, identityKeyPublic, signedPreKeyPublic, signedPreKeySignature, preKeys }) {
  const res = await client.post('/api/auth/register/seed', {
    username,
    identityKeyPublic,
    signedPreKeyPublic,
    signedPreKeySignature,
    preKeys,
  });
  if (res.success) {
    setAccessToken(res.data.accessToken);
    sessionStorage.setItem('phantom_refresh', res.data.refreshToken);
  }
  return res;
}

export async function registerWithEmail({ username, emailHash, passwordHash, identityKeyPublic }) {
  const res = await client.post('/api/auth/register/email', {
    username,
    emailHash,
    passwordHash,
    identityKeyPublic,
  });
  if (res.success) {
    setAccessToken(res.data.accessToken);
    sessionStorage.setItem('phantom_refresh', res.data.refreshToken);
  }
  return res;
}

export async function loginWithSeedChallenge(username) {
  return client.post('/api/auth/login/seed/challenge', { username });
}

export async function loginWithSeed({ username, challengeId, signature }) {
  const res = await client.post('/api/auth/login/seed', { username, challengeId, signature });
  if (res.success) {
    setAccessToken(res.data.accessToken);
    sessionStorage.setItem('phantom_refresh', res.data.refreshToken);
  }
  return res;
}

export async function getMe() {
  return client.get('/api/auth/me');
}

export async function lookupUser(username) {
  return client.get(`/api/auth/lookup/${encodeURIComponent(username)}`);
}

export async function logout() {
  try {
    await client.post('/api/auth/logout');
  } finally {
    setAccessToken(null);
    sessionStorage.removeItem('phantom_refresh');
  }
}

export async function refreshAccessToken() {
  const refreshToken = sessionStorage.getItem('phantom_refresh');
  if (!refreshToken) throw new Error('No refresh token');
  const res = await client.post('/api/auth/refresh', { refreshToken });
  if (res.success) {
    setAccessToken(res.data.accessToken);
    if (res.data.refreshToken) {
      sessionStorage.setItem('phantom_refresh', res.data.refreshToken);
    }
  }
  return res;
}
