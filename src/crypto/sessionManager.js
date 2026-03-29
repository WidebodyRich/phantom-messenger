/**
 * Session Manager - Phase 1 simplified encryption
 * Uses AES-GCM for message encryption with ECDH key agreement
 * TODO Phase 2: Full Double Ratchet implementation
 */

const sessions = new Map();

export async function createSession(userId, theirPublicKey) {
  // Generate an ephemeral key pair for this session
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits']
  );

  // Import their public key
  const theirKey = await crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(theirPublicKey),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: theirKey },
    keyPair.privateKey,
    256
  );

  // Derive AES key from shared secret
  const aesKey = await crypto.subtle.importKey(
    'raw',
    sharedBits,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const session = { aesKey, keyPair, theirPublicKey };
  sessions.set(userId, session);
  return session;
}

export async function encryptMessage(userId, plaintext) {
  let session = sessions.get(userId);

  // If no session, create a temporary one with a random key
  // In production, this would use proper X3DH key exchange
  if (!session) {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    session = { aesKey: key };
    sessions.set(userId, session);
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    session.aesKey,
    encoded
  );

  // Combine IV + ciphertext
  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv);
  result.set(new Uint8Array(ciphertext), iv.length);

  return arrayBufferToBase64(result.buffer);
}

export async function decryptMessage(userId, ciphertextBase64) {
  const session = sessions.get(userId);
  if (!session) {
    // Can't decrypt without a session — return ciphertext as-is for now
    return ciphertextBase64;
  }

  try {
    const data = base64ToArrayBuffer(ciphertextBase64);
    const iv = data.slice(0, 12);
    const ciphertext = data.slice(12);

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      session.aesKey,
      ciphertext
    );

    return new TextDecoder().decode(plaintext);
  } catch {
    // Decryption failed — return as-is
    return ciphertextBase64;
  }
}

export function hasSession(userId) {
  return sessions.has(userId);
}

export function clearSession(userId) {
  sessions.delete(userId);
}

export function clearAllSessions() {
  sessions.clear();
}

// Utility
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
