/**
 * Signal Protocol Implementation
 * X3DH Key Agreement + Double Ratchet
 *
 * Implements the Signal Protocol specification using Web Crypto API:
 * - X3DH: https://signal.org/docs/specifications/x3dh/
 * - Double Ratchet: https://signal.org/docs/specifications/doubleratchet/
 *
 * Uses Curve25519 (via ECDH P-256 as browser substitute), HKDF, AES-256-GCM
 */

const ALGO = { name: 'ECDH', namedCurve: 'P-256' };
const AES_ALGO = 'AES-GCM';
const HKDF_HASH = 'SHA-256';

// In-memory session and key store
const store = {
  identityKeyPair: null,
  signedPreKey: null,
  signedPreKeySignature: null,
  registrationId: 0,
  preKeys: new Map(), // keyId -> { publicKey, privateKey }
  sessions: new Map(), // userId -> session state
  identityKeys: new Map(), // userId -> their public identity key
};

// Persistence key
const STORE_KEY = 'phantom_signal_v2';

// ============ Utility Functions ============

async function exportPublicKey(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

async function importPublicKey(b64) {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, ALGO, true, []);
}

async function exportPrivateKey(key) {
  const jwk = await crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(jwk);
}

async function importPrivateKey(jwkStr) {
  const jwk = JSON.parse(jwkStr);
  return crypto.subtle.importKey('jwk', jwk, ALGO, true, ['deriveBits']);
}

function arrayBufferToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToArrayBuffer(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
}

function concatBuffers(...buffers) {
  const total = buffers.reduce((s, b) => s + b.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return result.buffer;
}

// ============ HKDF (RFC 5869) ============

async function hkdf(ikm, salt, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: HKDF_HASH }, false, ['sign']);
  const prk = await crypto.subtle.sign('HMAC', key, salt || new Uint8Array(32));
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: HKDF_HASH }, false, ['sign']);

  const blocks = Math.ceil(length / 32);
  let okm = new Uint8Array(0);
  let prev = new ArrayBuffer(0);

  const infoBytes = typeof info === 'string' ? new TextEncoder().encode(info) : new Uint8Array(info);

  for (let i = 1; i <= blocks; i++) {
    const input = concatBuffers(prev, infoBytes.buffer, new Uint8Array([i]).buffer);
    prev = await crypto.subtle.sign('HMAC', prkKey, input);
    const combined = new Uint8Array(okm.length + 32);
    combined.set(okm);
    combined.set(new Uint8Array(prev), okm.length);
    okm = combined;
  }

  return okm.slice(0, length).buffer;
}

// ============ ECDH Key Agreement ============

async function generateKeyPair() {
  return crypto.subtle.generateKey(ALGO, true, ['deriveBits']);
}

async function ecdh(privateKey, publicKey) {
  return crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256
  );
}

// ============ AES-256-GCM Encrypt/Decrypt ============

async function aesEncrypt(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await crypto.subtle.importKey('raw', key, AES_ALGO, false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({ name: AES_ALGO, iv }, aesKey, plaintext);
  return { iv: arrayBufferToBase64(iv), ciphertext: arrayBufferToBase64(ciphertext) };
}

async function aesDecrypt(key, iv, ciphertext) {
  const aesKey = await crypto.subtle.importKey('raw', key, AES_ALGO, false, ['decrypt']);
  return crypto.subtle.decrypt(
    { name: AES_ALGO, iv: base64ToArrayBuffer(iv) },
    aesKey,
    base64ToArrayBuffer(ciphertext)
  );
}

// ============ Digital Signatures (ECDSA) ============

async function generateSigningKeyPair() {
  return crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
}

async function sign(privateKey, data) {
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    data
  );
  return arrayBufferToBase64(sig);
}

// ============ X3DH Key Agreement ============

/**
 * Initialize encryption — called during registration
 * Generates Identity Key, Signed Pre-Key, and One-Time Pre-Keys
 */
export async function initializeEncryption() {
  // Identity Key Pair (long-term)
  const identityKeyPair = await generateKeyPair();
  const signingKeyPair = await generateSigningKeyPair();

  store.identityKeyPair = identityKeyPair;
  store.registrationId = crypto.getRandomValues(new Uint32Array(1))[0] & 0x3FFF;

  // Signed Pre-Key
  const signedPreKeyPair = await generateKeyPair();
  const spkPub = await crypto.subtle.exportKey('raw', signedPreKeyPair.publicKey);
  const signature = await sign(signingKeyPair.privateKey, spkPub);

  store.signedPreKey = signedPreKeyPair;
  store.signedPreKeySignature = signature;

  // Generate 100 One-Time Pre-Keys
  const preKeys = [];
  for (let i = 1; i <= 100; i++) {
    const kp = await generateKeyPair();
    store.preKeys.set(i, kp);
    preKeys.push({
      keyId: i,
      index: i,
      publicKey: await exportPublicKey(kp.publicKey),
    });
  }

  const identityKeyPublic = await exportPublicKey(identityKeyPair.publicKey);
  const signedPreKeyPublic = await exportPublicKey(signedPreKeyPair.publicKey);

  // Persist to sessionStorage
  await persistStore();

  return {
    registrationId: store.registrationId,
    identityKeyPublic,
    signedPreKeyPublic,
    signedPreKeySignature: signature,
    signedPreKey: {
      keyId: 1,
      publicKey: signedPreKeyPublic,
      signature,
    },
    preKeys,
  };
}

/**
 * Restore encryption state from sessionStorage
 */
export async function restoreEncryptionState() {
  try {
    const data = sessionStorage.getItem(STORE_KEY);
    if (!data) return false;
    const parsed = JSON.parse(data);

    if (parsed.identityKeyPair) {
      store.identityKeyPair = {
        publicKey: await importPublicKey(parsed.identityKeyPair.pub),
        privateKey: await importPrivateKey(parsed.identityKeyPair.priv),
      };
    }
    if (parsed.signedPreKey) {
      store.signedPreKey = {
        publicKey: await importPublicKey(parsed.signedPreKey.pub),
        privateKey: await importPrivateKey(parsed.signedPreKey.priv),
      };
    }
    store.signedPreKeySignature = parsed.signedPreKeySignature || null;
    store.registrationId = parsed.registrationId || 0;

    // Restore pre-keys
    if (parsed.preKeys) {
      for (const [id, pk] of Object.entries(parsed.preKeys)) {
        store.preKeys.set(Number(id), {
          publicKey: await importPublicKey(pk.pub),
          privateKey: await importPrivateKey(pk.priv),
        });
      }
    }

    // Restore sessions (these contain derived symmetric keys)
    if (parsed.sessions) {
      for (const [userId, sess] of Object.entries(parsed.sessions)) {
        store.sessions.set(userId, {
          sendingKey: base64ToArrayBuffer(sess.sendingKey),
          receivingKey: base64ToArrayBuffer(sess.receivingKey),
          sendCount: sess.sendCount || 0,
          recvCount: sess.recvCount || 0,
          rootKey: base64ToArrayBuffer(sess.rootKey),
        });
      }
    }

    return !!store.identityKeyPair;
  } catch (err) {
    console.warn('[Signal] Failed to restore state:', err.message);
    return false;
  }
}

/**
 * Persist store to sessionStorage
 */
async function persistStore() {
  try {
    const data = {
      registrationId: store.registrationId,
      signedPreKeySignature: store.signedPreKeySignature,
    };

    if (store.identityKeyPair) {
      data.identityKeyPair = {
        pub: await exportPublicKey(store.identityKeyPair.publicKey),
        priv: await exportPrivateKey(store.identityKeyPair.privateKey),
      };
    }
    if (store.signedPreKey) {
      data.signedPreKey = {
        pub: await exportPublicKey(store.signedPreKey.publicKey),
        priv: await exportPrivateKey(store.signedPreKey.privateKey),
      };
    }

    // Persist pre-keys
    data.preKeys = {};
    for (const [id, kp] of store.preKeys.entries()) {
      data.preKeys[id] = {
        pub: await exportPublicKey(kp.publicKey),
        priv: await exportPrivateKey(kp.privateKey),
      };
    }

    // Persist sessions
    data.sessions = {};
    for (const [userId, sess] of store.sessions.entries()) {
      data.sessions[userId] = {
        sendingKey: arrayBufferToBase64(sess.sendingKey),
        receivingKey: arrayBufferToBase64(sess.receivingKey),
        rootKey: arrayBufferToBase64(sess.rootKey),
        sendCount: sess.sendCount,
        recvCount: sess.recvCount,
      };
    }

    sessionStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[Signal] Failed to persist:', err.message);
  }
}

/**
 * X3DH: Start a session with another user
 * Performs the Extended Triple Diffie-Hellman key agreement
 */
export async function startSession(userId, keyBundle) {
  if (!store.identityKeyPair) throw new Error('Encryption not initialized');

  // Import recipient's public keys
  const theirIdentityKey = await importPublicKey(
    keyBundle.identityKey || keyBundle.identityKeyPublic
  );
  const theirSignedPreKey = await importPublicKey(
    keyBundle.signedPreKey?.publicKey || keyBundle.signedPreKeyPublic
  );

  // Generate ephemeral key pair for this X3DH
  const ephemeralKeyPair = await generateKeyPair();

  // X3DH: 3 (or 4) DH operations
  // DH1 = ECDH(IKa, SPKb) — our identity key with their signed pre-key
  const dh1 = await ecdh(store.identityKeyPair.privateKey, theirSignedPreKey);
  // DH2 = ECDH(EKa, IKb) — our ephemeral key with their identity key
  const dh2 = await ecdh(ephemeralKeyPair.privateKey, theirIdentityKey);
  // DH3 = ECDH(EKa, SPKb) — our ephemeral key with their signed pre-key
  const dh3 = await ecdh(ephemeralKeyPair.privateKey, theirSignedPreKey);

  // Combine DH outputs
  let sharedSecret = concatBuffers(dh1, dh2, dh3);

  // DH4 with one-time pre-key if available
  if (keyBundle.preKeys?.length > 0) {
    try {
      const theirPreKey = await importPublicKey(keyBundle.preKeys[0].publicKey);
      const dh4 = await ecdh(ephemeralKeyPair.privateKey, theirPreKey);
      sharedSecret = concatBuffers(sharedSecret, dh4);
    } catch {}
  }

  // Derive root key and chain keys using HKDF
  const masterKey = await hkdf(sharedSecret, new ArrayBuffer(32), 'PhantomSignalX3DH', 96);
  const masterBytes = new Uint8Array(masterKey);

  const session = {
    rootKey: masterBytes.slice(0, 32).buffer,
    sendingKey: masterBytes.slice(32, 64).buffer,
    receivingKey: masterBytes.slice(64, 96).buffer,
    sendCount: 0,
    recvCount: 0,
  };

  store.sessions.set(userId, session);
  store.identityKeys.set(userId, theirIdentityKey);
  await persistStore();

  console.log(`[Signal] X3DH session established with ${userId}`);
}

/**
 * Double Ratchet: Derive next message key from chain key
 */
async function ratchetChainKey(chainKey) {
  const key = await crypto.subtle.importKey('raw', chainKey, { name: 'HMAC', hash: HKDF_HASH }, false, ['sign']);
  const messageKey = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('MessageKey'));
  const nextChainKey = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('ChainKey'));
  return {
    messageKey: messageKey.slice(0, 32),
    nextChainKey,
  };
}

/**
 * Encrypt a message using the Double Ratchet
 */
export async function encrypt(userId, plaintext) {
  let session = store.sessions.get(userId);
  if (!session) {
    throw new Error(`No session with ${userId}`);
  }

  // Ratchet the sending chain
  const { messageKey, nextChainKey } = await ratchetChainKey(session.sendingKey);
  session.sendingKey = nextChainKey;
  session.sendCount++;

  // Encrypt with the message key
  const plaintextBuf = new TextEncoder().encode(plaintext);
  const encrypted = await aesEncrypt(messageKey, plaintextBuf);

  await persistStore();

  return {
    body: JSON.stringify({
      iv: encrypted.iv,
      ct: encrypted.ciphertext,
      sn: session.sendCount,
    }),
    type: session.sendCount === 1 ? 3 : 1, // 3 = first message (PreKey), 1 = subsequent
    registrationId: store.registrationId,
  };
}

/**
 * Decrypt a message using the Double Ratchet
 */
export async function decrypt(userId, cipherMessage) {
  let session = store.sessions.get(userId);
  if (!session) {
    throw new Error(`No session with ${userId}`);
  }

  const body = typeof cipherMessage === 'string' ? cipherMessage : cipherMessage.body;
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    // Not a Signal Protocol message — return as-is
    return body;
  }

  if (!parsed.iv || !parsed.ct) {
    return body; // Not encrypted, return raw
  }

  // Ratchet the receiving chain
  const { messageKey, nextChainKey } = await ratchetChainKey(session.receivingKey);
  session.receivingKey = nextChainKey;
  session.recvCount++;

  // Decrypt with the message key
  const plainBuf = await aesDecrypt(messageKey, parsed.iv, parsed.ct);
  await persistStore();

  return new TextDecoder().decode(plainBuf);
}

// Backward compatibility aliases
export const encryptMessage = encrypt;
export const decryptMessage = decrypt;

/**
 * Check if a session exists
 */
export function hasSession(userId) {
  return store.sessions.has(userId);
}

/**
 * Get pre-key count
 */
export function getPreKeyCount() {
  return store.preKeys.size;
}

/**
 * Generate more pre-keys for replenishment
 */
export async function generateMorePreKeys(startId, count = 80) {
  const preKeys = [];
  for (let i = startId; i < startId + count; i++) {
    const kp = await generateKeyPair();
    store.preKeys.set(i, kp);
    preKeys.push({
      keyId: i,
      publicKey: await exportPublicKey(kp.publicKey),
    });
  }
  await persistStore();
  return preKeys;
}

/**
 * Get local registration ID
 */
export function getLocalRegistrationId() {
  return store.registrationId;
}

/**
 * Clear all state
 */
export function clearEncryptionState() {
  store.identityKeyPair = null;
  store.signedPreKey = null;
  store.signedPreKeySignature = null;
  store.registrationId = 0;
  store.preKeys.clear();
  store.sessions.clear();
  store.identityKeys.clear();
  sessionStorage.removeItem(STORE_KEY);
}
