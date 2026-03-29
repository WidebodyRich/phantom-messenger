import client, { setAccessToken } from './client';

// ── Unified Registration (new) ──
export async function register({ username, email, phone, password, identityKeyPublic, signedPreKeyPublic, signedPreKeySignature, preKeys }) {
  const res = await client.post('/api/auth/register', {
    username,
    email: email || null,
    phone: phone || null,
    password: password || null,
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

// ── Legacy: Seed Registration ──
export async function registerWithSeed({ username, identityKeyPublic, signedPreKeyPublic, signedPreKeySignature, preKeys }) {
  return register({ username, identityKeyPublic, signedPreKeyPublic, signedPreKeySignature, preKeys });
}

// ── Legacy: Email Registration ──
export async function registerWithEmail({ username, emailHash, passwordHash, identityKeyPublic }) {
  const res = await client.post('/api/auth/register/email', {
    username, emailHash, passwordHash, identityKeyPublic,
  });
  if (res.success) {
    setAccessToken(res.data.accessToken);
    sessionStorage.setItem('phantom_refresh', res.data.refreshToken);
  }
  return res;
}

// ── Seed Login (challenge-response) ──
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

// ── Email + Password Login (new) ──
export async function loginWithEmail({ email, password }) {
  const res = await client.post('/api/auth/login/email', { email, password });
  if (res.success) {
    setAccessToken(res.data.accessToken);
    sessionStorage.setItem('phantom_refresh', res.data.refreshToken);
  }
  return res;
}

// ── Phone Login (new) ──
export async function loginWithPhone(phone) {
  return client.post('/api/auth/login/phone', { phone });
}

export async function verifyPhoneCode({ phone, code }) {
  const res = await client.post('/api/auth/login/phone/verify', { phone, code });
  if (res.success) {
    setAccessToken(res.data.accessToken);
    sessionStorage.setItem('phantom_refresh', res.data.refreshToken);
  }
  return res;
}

// ── Password Reset (new) ──
export async function requestPasswordReset(email) {
  return client.post('/api/auth/reset-password', { email });
}

export async function confirmPasswordReset({ email, code, newPassword }) {
  return client.post('/api/auth/reset-password/confirm', { email, code, newPassword });
}

// ── Profile Management (new) ──
export async function getProfile() {
  return client.get('/api/auth/profile');
}

export async function updateProfile(data) {
  return client.put('/api/auth/profile', data);
}

export async function removeEmail() {
  return client.delete('/api/auth/profile/email');
}

export async function removePhone() {
  return client.delete('/api/auth/profile/phone');
}

// ── Existing endpoints ──
export async function getMe() {
  return client.get('/api/auth/me');
}

export async function lookupUser(username) {
  return client.get(`/api/auth/lookup/${encodeURIComponent(username)}`);
}

export async function lookupByAddress(btcAddress) {
  return client.post('/api/auth/lookup-address', { btcAddress });
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
