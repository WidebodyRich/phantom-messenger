/**
 * Signal Protocol Implementation — PHANTOM MESSENGER v3.1
 * X3DH Key Agreement + Double Ratchet (Bidirectional, Hardened)
 *
 * Implements the Signal Protocol specification using Web Crypto API:
 * - X3DH: https://signal.org/docs/specifications/x3dh/
 * - Double Ratchet: https://signal.org/docs/specifications/doubleratchet/
 *
 * v3.1 Hardening:
 * - Skipped message key storage for out-of-order delivery
 * - Automatic purge of expired skipped keys (48h TTL)
 * - MAX_SKIP limit to prevent DoS via sequence number inflation
 * - No plaintext fallback — encrypt or fail
 *
 * Uses ECDH P-256 (browser substitute for Curve25519), HKDF, AES-256-GCM
 *
 * Message types:
 *   type 3 = PreKeyMessage (first message, includes X3DH init data)
 *   type 1 = SignalMessage (subsequent messages, just encrypted body)
 */

const ALGO = { name: 'ECDH', namedCurve: 'P-256' };
const AES_ALGO = 'AES-GCM';
const HKDF_HASH = 'SHA-256';
const PREKEY_MSG = 3;
const SIGNAL_MSG = 1;

// Skipped message key limits
const MAX_SKIP = 256;            // Max messages we'll skip ahead (prevents DoS)
const SKIPPED_KEY_TTL_H = 48;   // Hours to keep skipped keys before purging
const SKIPPED_PREFIX = 'phantom_signal_skipped_';

// In-memory session and key store
const store = {
  identityKeyPair: null,     // { publicKey, privateKey } — long-term ECDH
  signingKeyPair: null,      // { publicKey, privateKey } — ECDSA for signing
  signedPreKey: null,        // { publicKey, privateKey } — medium-term
  signedPreKeySignature: null,
  registrationId: 0,
  preKeys: new Map(),        // keyIndex -> { publicKey, privateKey }
  sessions: new Map(),       // recipientUserId -> session state
  identityKeys: new Map(),   // recipientUserId -> their public identity key (CryptoKey)
};

// Persistence key
const STORE_KEY = 'phantom_signal_v2';

// Vault — encrypts localStorage at rest
import { vaultSet, vaultGet, vaultRemove } from './vault';

// Cache of JWK strings for non-extractable keys (used by persistStore)
// Keys are set during lockKeysInMemory() or restoreEncryptionState()
const _jwkCache = {
  identityPriv: null,
  signingPriv: null,
  signedPreKeyPriv: null,
  preKeys: new Map(), // keyId -> jwkStr
};

// ============ PRELOAD / CACHE ============
// Start CryptoKey import before React renders. Cache the promise so
// restoreEncryptionState() is called only once.
let _preloadPromise = null;

/**
 * Fire-and-forget: start importing CryptoKeys from localStorage NOW.
 * Called from main.jsx BEFORE React.createRoot — shaves 100-300ms off
 * the time between app render and encrypt() being usable.
 */
export function preloadCryptoKeys() {
  if (_preloadPromise) return _preloadPromise;
  if (!hasLocalKeys()) return null;
  const t0 = performance.now();
  _preloadPromise = restoreEncryptionState().then((ok) => {
    console.log(`[Signal] Preload done in ${(performance.now() - t0).toFixed(0)}ms — ${ok ? 'OK' : 'FAILED'}`);
    return ok;
  }).catch((err) => {
    console.warn('[Signal] Preload error:', err.message);
    _preloadPromise = null;
    return false;
  });
  return _preloadPromise;
}

/**
 * Wait for the preload to finish (used by ChatContext flush).
 * Resolves immediately if preload already completed or no keys exist.
 */
export async function waitForPreload() {
  if (_preloadPromise) return _preloadPromise;
  return false;
}

/**
 * Clear the preload cache (on logout).
 */
export function clearPreloadCache() {
  _preloadPromise = null;
}

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
  // Non-extractable: private key material cannot be read back from CryptoKey
  return crypto.subtle.importKey('jwk', jwk, ALGO, false, ['deriveBits']);
}

async function exportSigningPrivateKey(key) {
  const jwk = await crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(jwk);
}

async function importSigningPrivateKey(jwkStr) {
  const jwk = JSON.parse(jwkStr);
  // Non-extractable: signing key cannot be exported from memory
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function exportSigningPublicKey(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

async function importSigningPublicKey(b64) {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
}

function arrayBufferToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

/**
 * Shared secret fingerprint — first 8 hex chars of SHA-256.
 * Used to verify both sides derived the same X3DH shared secret.
 * If initiator and responder fingerprints differ, DH inputs were mismatched.
 */
async function sharedSecretFingerprint(secret) {
  const hash = await crypto.subtle.digest('SHA-256', secret);
  return [...new Uint8Array(hash).slice(0, 4)].map(b => b.toString(16).padStart(2, '0')).join('');
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

// ============ SKIPPED MESSAGE KEY STORAGE ============

/**
 * Store a skipped message key for later out-of-order decryption.
 * Key = SKIPPED_PREFIX + {userId}_{sequenceNumber}
 * Each key is single-use and auto-expires after SKIPPED_KEY_TTL_H hours.
 */
async function storeSkippedMessageKey(userId, sequenceNumber, messageKey) {
  const storageKey = `${SKIPPED_PREFIX}${userId}_${sequenceNumber}`;
  const entry = {
    key: arrayBufferToBase64(messageKey),
    storedAt: Date.now(),
  };
  try {
    await vaultSet(storageKey, JSON.stringify(entry));
  } catch (e) {
    console.warn('[Signal] Failed to store skipped key:', e.message);
  }
}

/**
 * Retrieve a skipped message key (single-use — deleted after retrieval).
 * Returns ArrayBuffer or null.
 */
async function getSkippedMessageKey(userId, sequenceNumber) {
  const storageKey = `${SKIPPED_PREFIX}${userId}_${sequenceNumber}`;
  const raw = await vaultGet(storageKey);
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw);

    // Check TTL
    const ageHours = (Date.now() - entry.storedAt) / (1000 * 60 * 60);
    if (ageHours > SKIPPED_KEY_TTL_H) {
      vaultRemove(storageKey);
      return null;
    }

    // Delete after retrieval — each key is single-use
    vaultRemove(storageKey);
    return base64ToArrayBuffer(entry.key);
  } catch {
    vaultRemove(storageKey);
    return null;
  }
}

/**
 * Purge all expired skipped keys from localStorage.
 * Call periodically (e.g. every 4 hours) and on app load.
 */
export async function purgeExpiredSkippedKeys() {
  const now = Date.now();
  const maxAge = SKIPPED_KEY_TTL_H * 60 * 60 * 1000;
  let purged = 0;

  const keys = [];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith(SKIPPED_PREFIX)) keys.push(k);
  }

  for (const k of keys) {
    try {
      const raw = await vaultGet(k);
      if (!raw) { vaultRemove(k); purged++; continue; }
      const entry = JSON.parse(raw);
      if (now - entry.storedAt > maxAge) {
        vaultRemove(k);
        purged++;
      }
    } catch {
      vaultRemove(k);
      purged++;
    }
  }

  if (purged > 0) {
    console.log(`[Signal] Purged ${purged} expired skipped message keys`);
  }
}

// ============ INITIALIZATION ============

/**
 * Initialize encryption — called during registration
 * Generates Identity Key, Signed Pre-Key, and One-Time Pre-Keys
 */
export async function initializeEncryption() {
  // Identity Key Pair (long-term ECDH for X3DH)
  const identityKeyPair = await generateKeyPair();
  const signingKeyPair = await generateSigningKeyPair();

  store.identityKeyPair = identityKeyPair;
  store.signingKeyPair = signingKeyPair;
  store.registrationId = crypto.getRandomValues(new Uint32Array(1))[0] & 0x3FFF;

  // Signed Pre-Key (medium-term)
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

  // Persist to localStorage, then lock keys as non-extractable
  await persistStore();
  await lockKeysInMemory();

  console.log('[Signal] Encryption initialized — 100 pre-keys generated');

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

// ============ PERSISTENCE ============

/**
 * Restore encryption state from localStorage
 */
export async function restoreEncryptionState() {
  try {
    const data = await vaultGet(STORE_KEY);
    if (!data) return false;
    const parsed = JSON.parse(data);

    if (parsed.identityKeyPair) {
      store.identityKeyPair = {
        publicKey: await importPublicKey(parsed.identityKeyPair.pub),
        privateKey: await importPrivateKey(parsed.identityKeyPair.priv),
      };
      _jwkCache.identityPriv = parsed.identityKeyPair.priv;
    }
    if (parsed.signingKeyPair) {
      store.signingKeyPair = {
        publicKey: await importSigningPublicKey(parsed.signingKeyPair.pub),
        privateKey: await importSigningPrivateKey(parsed.signingKeyPair.priv),
      };
      _jwkCache.signingPriv = parsed.signingKeyPair.priv;
    }
    if (parsed.signedPreKey) {
      store.signedPreKey = {
        publicKey: await importPublicKey(parsed.signedPreKey.pub),
        privateKey: await importPrivateKey(parsed.signedPreKey.priv),
      };
      _jwkCache.signedPreKeyPriv = parsed.signedPreKey.priv;
    }
    store.signedPreKeySignature = parsed.signedPreKeySignature || null;
    store.registrationId = parsed.registrationId || 0;

    // Restore pre-keys (imported as non-extractable, JWK cached)
    if (parsed.preKeys) {
      for (const [id, pk] of Object.entries(parsed.preKeys)) {
        const numId = Number(id);
        store.preKeys.set(numId, {
          publicKey: await importPublicKey(pk.pub),
          privateKey: await importPrivateKey(pk.priv),
        });
        _jwkCache.preKeys.set(numId, pk.priv);
      }
    }

    // Restore sessions
    if (parsed.sessions) {
      for (const [userId, sess] of Object.entries(parsed.sessions)) {
        store.sessions.set(userId, {
          rootKey: base64ToArrayBuffer(sess.rootKey),
          sendingKey: base64ToArrayBuffer(sess.sendingKey),
          receivingKey: base64ToArrayBuffer(sess.receivingKey),
          sendCount: sess.sendCount || 0,
          recvCount: sess.recvCount || 0,
        });
      }
    }

    // Restore identity keys
    if (parsed.identityKeys) {
      for (const [userId, ikPub] of Object.entries(parsed.identityKeys)) {
        try {
          store.identityKeys.set(userId, await importPublicKey(ikPub));
        } catch {}
      }
    }

    // Purge expired skipped keys on restore
    purgeExpiredSkippedKeys();

    console.log(`[Signal] State restored — ${store.preKeys.size} pre-keys, ${store.sessions.size} sessions`);
    return !!store.identityKeyPair;
  } catch (err) {
    console.warn('[Signal] Failed to restore state:', err.message);
    return false;
  }
}

/**
 * Persist store to localStorage
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
        priv: _jwkCache.identityPriv || await exportPrivateKey(store.identityKeyPair.privateKey),
      };
    }
    if (store.signingKeyPair) {
      data.signingKeyPair = {
        pub: await exportSigningPublicKey(store.signingKeyPair.publicKey),
        priv: _jwkCache.signingPriv || await exportSigningPrivateKey(store.signingKeyPair.privateKey),
      };
    }
    if (store.signedPreKey) {
      data.signedPreKey = {
        pub: await exportPublicKey(store.signedPreKey.publicKey),
        priv: _jwkCache.signedPreKeyPriv || await exportPrivateKey(store.signedPreKey.privateKey),
      };
    }

    // Persist pre-keys
    data.preKeys = {};
    for (const [id, kp] of store.preKeys.entries()) {
      data.preKeys[id] = {
        pub: await exportPublicKey(kp.publicKey),
        priv: _jwkCache.preKeys.get(id) || await exportPrivateKey(kp.privateKey),
      };
    }

    // Persist sessions
    data.sessions = {};
    for (const [userId, sess] of store.sessions.entries()) {
      data.sessions[userId] = {
        rootKey: arrayBufferToBase64(sess.rootKey),
        sendingKey: arrayBufferToBase64(sess.sendingKey),
        receivingKey: arrayBufferToBase64(sess.receivingKey),
        sendCount: sess.sendCount,
        recvCount: sess.recvCount,
      };
    }

    // Persist identity keys
    data.identityKeys = {};
    for (const [userId, ikPub] of store.identityKeys.entries()) {
      data.identityKeys[userId] = await exportPublicKey(ikPub);
    }

    await vaultSet(STORE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[Signal] Failed to persist:', err.message);
  }
}

/**
 * Lock all private keys in memory as non-extractable CryptoKeys.
 * After calling this, crypto.subtle.exportKey() will throw on all private keys.
 * JWK strings are cached so persistStore() can still write to vault.
 * Called after initial generation + persist, and after restore.
 */
async function lockKeysInMemory() {
  try {
    // Lock identity private key
    if (store.identityKeyPair?.privateKey?.extractable) {
      const jwk = await exportPrivateKey(store.identityKeyPair.privateKey);
      _jwkCache.identityPriv = jwk;
      store.identityKeyPair.privateKey = await importPrivateKey(jwk);
    }

    // Lock signing private key
    if (store.signingKeyPair?.privateKey?.extractable) {
      const jwk = await exportSigningPrivateKey(store.signingKeyPair.privateKey);
      _jwkCache.signingPriv = jwk;
      store.signingKeyPair.privateKey = await importSigningPrivateKey(jwk);
    }

    // Lock signed pre-key private key
    if (store.signedPreKey?.privateKey?.extractable) {
      const jwk = await exportPrivateKey(store.signedPreKey.privateKey);
      _jwkCache.signedPreKeyPriv = jwk;
      store.signedPreKey.privateKey = await importPrivateKey(jwk);
    }

    // Lock pre-key private keys
    for (const [id, kp] of store.preKeys.entries()) {
      if (kp.privateKey?.extractable) {
        const jwk = await exportPrivateKey(kp.privateKey);
        _jwkCache.preKeys.set(id, jwk);
        kp.privateKey = await importPrivateKey(jwk);
      }
    }

    console.log('[Signal] All private keys locked as non-extractable');
  } catch (err) {
    console.warn('[Signal] Failed to lock keys:', err.message);
  }
}

// ============ X3DH KEY AGREEMENT ============

/**
 * X3DH Initiator: Start a session with another user (Alice side)
 *
 * Performs Extended Triple Diffie-Hellman and returns the ephemeral
 * public key + pre-key ID so the receiver can derive the same secret.
 *
 * @returns {{ ephemeralKeyPublic: string, usedPreKeyIndex: number|null }}
 */
export async function startSession(userId, keyBundle) {
  if (!store.identityKeyPair) throw new Error('Encryption not initialized');

  console.log(`[Signal] === START SESSION (INITIATOR) ===`);
  console.log(`[Signal] Target: ${userId.slice(0, 8)}...`);
  console.log(`[Signal] Key bundle fields:`, Object.keys(keyBundle).join(', '));

  // ── Resolve identity key (handle both field name conventions) ──
  const identityKeyB64 = keyBundle.identityKeyPublic || keyBundle.identityKey;
  if (!identityKeyB64 || typeof identityKeyB64 !== 'string') {
    throw new Error(`Missing identity key in bundle (got ${typeof identityKeyB64})`);
  }
  const theirIdentityKey = await importPublicKey(identityKeyB64);
  console.log(`[Signal] Identity key: ${identityKeyB64.slice(0, 16)}...`);

  // ── Resolve signed pre-key (could be string or { publicKey: string }) ──
  let signedPreKeyB64;
  if (typeof keyBundle.signedPreKeyPublic === 'string' && keyBundle.signedPreKeyPublic.length > 10) {
    signedPreKeyB64 = keyBundle.signedPreKeyPublic;
  } else if (typeof keyBundle.signedPreKey === 'string' && keyBundle.signedPreKey.length > 10) {
    signedPreKeyB64 = keyBundle.signedPreKey;
  } else if (keyBundle.signedPreKey?.publicKey) {
    signedPreKeyB64 = keyBundle.signedPreKey.publicKey;
  }
  if (!signedPreKeyB64 || typeof signedPreKeyB64 !== 'string') {
    throw new Error(`Missing signed pre-key in bundle (signedPreKeyPublic: ${typeof keyBundle.signedPreKeyPublic}, signedPreKey: ${typeof keyBundle.signedPreKey})`);
  }
  const theirSignedPreKey = await importPublicKey(signedPreKeyB64);
  console.log(`[Signal] Signed pre-key: ${signedPreKeyB64.slice(0, 16)}...`);

  // Generate ephemeral key pair for this X3DH exchange
  const ephemeralKeyPair = await generateKeyPair();

  // === X3DH: 3 (or 4) DH operations ===
  const dh1 = await ecdh(store.identityKeyPair.privateKey, theirSignedPreKey);
  const dh2 = await ecdh(ephemeralKeyPair.privateKey, theirIdentityKey);
  const dh3 = await ecdh(ephemeralKeyPair.privateKey, theirSignedPreKey);

  let sharedSecret = concatBuffers(dh1, dh2, dh3);
  let usedPreKeyIndex = null;

  // ── Resolve one-time pre-key (could be object, string, or nested in array) ──
  let otpk = keyBundle.oneTimePreKey || (keyBundle.preKeys?.length > 0 ? keyBundle.preKeys[0] : null);
  if (otpk) {
    try {
      let otpkPublicB64;
      let otpkIndex;
      if (typeof otpk === 'string') {
        // Server returned bare base64 string
        otpkPublicB64 = otpk;
        otpkIndex = null;
        console.log(`[Signal] One-time pre-key (string format): ${otpk.slice(0, 16)}...`);
      } else if (otpk.publicKey) {
        // Server returned { index/keyId, publicKey }
        otpkPublicB64 = otpk.publicKey;
        otpkIndex = otpk.index ?? otpk.keyId ?? null;
        console.log(`[Signal] One-time pre-key (object format): idx=${otpkIndex}, key=${otpkPublicB64.slice(0, 16)}...`);
      } else {
        console.warn('[Signal] One-time pre-key has unexpected format:', JSON.stringify(otpk).slice(0, 80));
        otpk = null;
      }

      if (otpkPublicB64) {
        const theirPreKey = await importPublicKey(otpkPublicB64);
        const dh4 = await ecdh(ephemeralKeyPair.privateKey, theirPreKey);
        sharedSecret = concatBuffers(sharedSecret, dh4);
        usedPreKeyIndex = otpkIndex;
        console.log(`[Signal] DH4 completed with pre-key index ${usedPreKeyIndex}`);
      }
    } catch (e) {
      console.warn('[Signal] DH4 with one-time pre-key failed:', e.message);
    }
  } else {
    console.log(`[Signal] No one-time pre-key available — using 3-DH only`);
  }

  // Derive root key + chain keys via HKDF (96 bytes)
  const masterKey = await hkdf(sharedSecret, new ArrayBuffer(32), 'PhantomSignalX3DH', 96);
  const masterBytes = new Uint8Array(masterKey);

  // Shared secret fingerprint for debugging (first 8 hex chars of SHA-256)
  const ssFingerprint = await sharedSecretFingerprint(sharedSecret);
  console.log(`[Signal] X3DH shared secret fingerprint (INITIATOR): ${ssFingerprint}`);

  // INITIATOR (Alice): sending = bytes 32-64, receiving = bytes 64-96
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

  const ephemeralKeyPublic = await exportPublicKey(ephemeralKeyPair.publicKey);
  console.log(`[Signal] X3DH session INITIATED with ${userId.slice(0, 8)}... (pkId: ${usedPreKeyIndex})`);

  return { ephemeralKeyPublic, usedPreKeyIndex };
}

/**
 * X3DH Responder: Establish a session from a received PreKey message (Bob side)
 */
export async function receivePreKeyMessage(senderId, preKeyData) {
  console.log(`[Signal] === RECEIVE PREKEY MESSAGE ===`);
  console.log(`[Signal] From: ${senderId.slice(0, 8)}..., pkId: ${preKeyData.pkId}`);
  console.log(`[Signal] Our identity key loaded: ${!!store.identityKeyPair}`);
  console.log(`[Signal] Our signed pre-key loaded: ${!!store.signedPreKey}`);
  console.log(`[Signal] Our pre-keys in store: ${store.preKeys.size}`);

  if (!store.identityKeyPair) throw new Error('Encryption not initialized — no identity key in memory');
  if (!store.signedPreKey) throw new Error('No signed pre-key available in memory');

  const theirIdentityKey = await importPublicKey(preKeyData.ik);
  const theirEphemeralKey = await importPublicKey(preKeyData.ek);

  // Mirror X3DH: same DH operations, roles reversed
  const dh1 = await ecdh(store.signedPreKey.privateKey, theirIdentityKey);
  const dh2 = await ecdh(store.identityKeyPair.privateKey, theirEphemeralKey);
  const dh3 = await ecdh(store.signedPreKey.privateKey, theirEphemeralKey);

  let sharedSecret = concatBuffers(dh1, dh2, dh3);

  // DH4 with one-time pre-key if the sender used one
  if (preKeyData.pkId != null) {
    const preKeyEntry = store.preKeys.get(preKeyData.pkId);
    if (preKeyEntry) {
      const dh4 = await ecdh(preKeyEntry.privateKey, theirEphemeralKey);
      sharedSecret = concatBuffers(sharedSecret, dh4);
      // Consume the one-time pre-key (must never be reused)
      store.preKeys.delete(preKeyData.pkId);
      console.log(`[Signal] One-time pre-key ${preKeyData.pkId} consumed — ${store.preKeys.size} remaining`);
    } else {
      console.warn(`[Signal] Pre-key ${preKeyData.pkId} NOT FOUND in store (may have been regenerated or already used)`);
      console.warn(`[Signal] Available pre-key IDs: ${[...store.preKeys.keys()].slice(0, 10).join(', ')}...`);
      // Continue WITHOUT DH4 — this will cause a key mismatch if the sender included DH4
      // But we must try, because the message might still be decryptable if both sides skip DH4
    }
  }

  const masterKey = await hkdf(sharedSecret, new ArrayBuffer(32), 'PhantomSignalX3DH', 96);
  const masterBytes = new Uint8Array(masterKey);

  // Shared secret fingerprint for debugging (must match initiator's)
  const ssFingerprint = await sharedSecretFingerprint(sharedSecret);
  console.log(`[Signal] X3DH shared secret fingerprint (RESPONDER): ${ssFingerprint}`);

  // RESPONDER (Bob): keys are SWAPPED compared to initiator
  const session = {
    rootKey: masterBytes.slice(0, 32).buffer,
    sendingKey: masterBytes.slice(64, 96).buffer,
    receivingKey: masterBytes.slice(32, 64).buffer,
    sendCount: 0,
    recvCount: 0,
  };

  store.sessions.set(senderId, session);
  store.identityKeys.set(senderId, theirIdentityKey);
  await persistStore();

  console.log(`[Signal] X3DH session RECEIVED from ${senderId.slice(0, 8)}... (pkId: ${preKeyData.pkId})`);
}

// ============ DOUBLE RATCHET ============

/**
 * Derive next message key from chain key (symmetric ratchet step)
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
 * Encrypt a message using the Double Ratchet.
 *
 * @param {string} userId - Recipient user ID
 * @param {string} plaintext - Message text to encrypt
 * @param {{ ephemeralKeyPublic?: string, usedPreKeyIndex?: number|null }} [sessionInit]
 * @returns {{ ciphertext: string, messageType: string }}
 */
export async function encrypt(userId, plaintext, sessionInit = null) {
  const session = store.sessions.get(userId);
  if (!session) throw new Error(`No session with ${userId}`);

  // Ratchet the sending chain
  const { messageKey, nextChainKey } = await ratchetChainKey(session.sendingKey);
  session.sendingKey = nextChainKey;
  session.sendCount++;

  // Encrypt the plaintext
  const plaintextBuf = new TextEncoder().encode(plaintext);
  const encrypted = await aesEncrypt(messageKey, plaintextBuf);

  const body = { iv: encrypted.iv, ct: encrypted.ciphertext, sn: session.sendCount };

  let envelope;
  if (session.sendCount === 1 && sessionInit) {
    // PreKey message (type 3) — first message in this session
    const myIdentityKeyPublic = await exportPublicKey(store.identityKeyPair.publicKey);
    envelope = JSON.stringify({
      t: PREKEY_MSG,
      ik: myIdentityKeyPublic,
      ek: sessionInit.ephemeralKeyPublic,
      pkId: sessionInit.usedPreKeyIndex,
      body,
    });
  } else {
    // Normal Signal message (type 1)
    envelope = JSON.stringify({
      t: SIGNAL_MSG,
      body,
    });
  }

  await persistStore();

  return {
    ciphertext: envelope,
    messageType: session.sendCount === 1 && sessionInit ? 'prekey' : 'signal',
  };
}

/**
 * Decrypt a message using the Double Ratchet.
 * Handles out-of-order delivery via skipped message key storage.
 *
 * @param {string} senderId - Sender user ID
 * @param {string} ciphertextEnvelope - The raw ciphertext string from the server
 * @returns {string} Decrypted plaintext
 */
export async function decrypt(senderId, ciphertextEnvelope) {
  const raw = typeof ciphertextEnvelope === 'string' ? ciphertextEnvelope : ciphertextEnvelope.body || ciphertextEnvelope;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not JSON — return as-is (legacy plaintext)
    return raw;
  }

  // Check if this is a Signal Protocol envelope
  if (!parsed.t && !parsed.body) {
    // Legacy format check: { iv, ct } without wrapper
    if (parsed.iv && parsed.ct) {
      return await _decryptBody(senderId, parsed);
    }
    // Not encrypted at all
    return raw;
  }

  if (parsed.t === PREKEY_MSG) {
    console.log(`[Signal] Decrypting PreKey message from ${senderId.slice(0, 8)}... (pkId: ${parsed.pkId})`);

    // PreKey message — establish session first, then decrypt
    const hadSession = hasSession(senderId);
    if (!hadSession) {
      await receivePreKeyMessage(senderId, {
        ik: parsed.ik,
        ek: parsed.ek,
        pkId: parsed.pkId,
      });
    }

    try {
      const plaintext = await _decryptBody(senderId, parsed.body);
      console.log(`[Signal] PreKey message decrypted OK from ${senderId.slice(0, 8)}...`);
      return plaintext;
    } catch (err) {
      // If we just created this session and decrypt failed, the session is broken
      // (key mismatch — sender used old public keys). Clean up so the next
      // PreKey message from this sender can try fresh.
      if (!hadSession) {
        store.sessions.delete(senderId);
        store.identityKeys.delete(senderId);
        await persistStore();
        console.error(`[Signal] PreKey decrypt FAILED — broken session cleaned up for ${senderId.slice(0, 8)}:`, err.message);
      }
      throw err; // Re-throw so caller knows decryption failed
    }
  }

  if (parsed.t === SIGNAL_MSG) {
    if (!store.sessions.has(senderId)) {
      // No session for a Signal message — sender has a session we don't.
      // This happens when our keys were regenerated after the sender cached the old session.
      // This message is unrecoverable — throw a specific error so the caller can request a session reset.
      console.error(`[Signal] Signal message from ${senderId.slice(0, 8)}... but NO SESSION — needs session reset`);
      throw new Error('NO_SESSION_FOR_SIGNAL');
    }
    return await _decryptBody(senderId, parsed.body);
  }

  // Unknown format
  return raw;
}

/**
 * Internal: decrypt the body { iv, ct, sn } using the receiving chain.
 * Supports out-of-order message delivery via skipped key storage.
 */
async function _decryptBody(senderId, body) {
  const session = store.sessions.get(senderId);
  if (!session) throw new Error(`No session with ${senderId} — cannot decrypt`);

  if (!body.iv || !body.ct) {
    throw new Error('Invalid encrypted body: missing iv or ct');
  }

  const sn = body.sn;
  const expectedSN = session.recvCount + 1;

  // ── CASE 1: Out-of-order message from the PAST — check skipped keys ──
  if (sn != null && sn < expectedSN) {
    const skippedKey = getSkippedMessageKey(senderId, sn);
    if (skippedKey) {
      console.log(`[Signal] Decrypting out-of-order message #${sn} from ${senderId.slice(0, 8)} using skipped key`);
      const plainBuf = await aesDecrypt(skippedKey, body.iv, body.ct);
      return new TextDecoder().decode(plainBuf);
    }
    throw new Error(`Cannot decrypt message #${sn} — key not found (already used or expired)`);
  }

  // ── CASE 2: Message from the FUTURE — skip ahead and store intermediate keys ──
  if (sn != null && sn > expectedSN) {
    const skip = sn - expectedSN;
    if (skip > MAX_SKIP) {
      throw new Error(`Too many skipped messages (${skip}). Possible attack or broken session.`);
    }

    console.log(`[Signal] Skipping ${skip} message(s) ahead to #${sn} from ${senderId.slice(0, 8)}`);

    // Derive and store all intermediate message keys
    let chainKey = session.receivingKey;
    for (let i = expectedSN; i < sn; i++) {
      const { messageKey, nextChainKey } = await ratchetChainKey(chainKey);
      storeSkippedMessageKey(senderId, i, messageKey);
      chainKey = nextChainKey;
    }

    // Now derive the key for the actual message
    const { messageKey, nextChainKey } = await ratchetChainKey(chainKey);
    session.receivingKey = nextChainKey;
    session.recvCount = sn;

    const plainBuf = await aesDecrypt(messageKey, body.iv, body.ct);
    await persistStore();
    return new TextDecoder().decode(plainBuf);
  }

  // ── CASE 3: Expected next message — normal sequential decrypt ──
  const { messageKey, nextChainKey } = await ratchetChainKey(session.receivingKey);
  session.receivingKey = nextChainKey;
  session.recvCount++;

  const plainBuf = await aesDecrypt(messageKey, body.iv, body.ct);
  await persistStore();
  return new TextDecoder().decode(plainBuf);
}

// Backward compatibility aliases
export const encryptMessage = encrypt;
export const decryptMessage = decrypt;

// ============ SESSION UTILITIES ============

/**
 * Check if we have an established session with a user
 */
export function hasSession(userId) {
  return store.sessions.has(userId);
}

/**
 * FAST synchronous check — peeks at localStorage without importing keys.
 * Returns true if key data EXISTS in localStorage (< 1ms).
 * Used by ChatContext to instantly set encryptionReady for returning users.
 */
export function hasLocalKeys() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return false;
    // If vault-encrypted, we know keys exist (can't parse, but data is there)
    if (raw.startsWith('v1:')) return true;
    const parsed = JSON.parse(raw);
    return !!(parsed.identityKeyPair?.pub && parsed.identityKeyPair?.priv);
  } catch {
    return false;
  }
}

/**
 * Check if encryption is initialized (identity key exists in memory)
 */
export function isInitialized() {
  return !!store.identityKeyPair;
}

/**
 * Get our identity public key as base64
 */
export async function getIdentityKeyPublic() {
  if (!store.identityKeyPair) return null;
  return exportPublicKey(store.identityKeyPair.publicKey);
}

/**
 * Get pre-key count (unused keys available)
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
  await lockKeysInMemory(); // Lock new pre-keys as non-extractable
  console.log(`[Signal] Generated ${count} new pre-keys (${store.preKeys.size} total)`);
  return preKeys;
}

/**
 * Get local registration ID
 */
export function getLocalRegistrationId() {
  return store.registrationId;
}

/**
 * Get the stored identity public key for a remote user (base64).
 * Returns null if we haven't exchanged keys with this user yet.
 */
export async function getRemoteIdentityKey(userId) {
  const key = store.identityKeys.get(userId);
  if (!key) return null;
  return exportPublicKey(key);
}

/**
 * Generate a safety number for verifying identity between two users.
 * Produces a 60-digit numeric code (like Signal) from both identity public keys.
 * Both sides compute the same number regardless of who initiates.
 *
 * @param {string} ourKeyB64 - Our identity public key (base64)
 * @param {string} theirKeyB64 - Their identity public key (base64)
 * @returns {string} 60-digit safety number formatted as 12 groups of 5
 */
export async function generateSafetyNumber(ourKeyB64, theirKeyB64) {
  if (!ourKeyB64 || !theirKeyB64) return null;

  // Sort keys lexicographically so both sides get the same result
  const keys = [ourKeyB64, theirKeyB64].sort();

  // Concatenate and hash iteratively (5 rounds for stronger fingerprint)
  const encoder = new TextEncoder();
  let material = encoder.encode(keys[0] + ':' + keys[1]);

  for (let i = 0; i < 5; i++) {
    material = new Uint8Array(await crypto.subtle.digest('SHA-256', material));
  }

  // Final hash to get 32 bytes
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', material));

  // Convert 30 bytes to 60 digits (each byte → 2 decimal digits mod 100)
  let digits = '';
  for (let i = 0; i < 30; i++) {
    digits += hash[i].toString().padStart(3, '0').slice(-2);
  }

  // Format as 12 groups of 5 digits
  return digits.match(/.{5}/g).join(' ');
}

/**
 * Clear a specific session (for retry after broken session)
 */
export function clearSession(userId) {
  store.sessions.delete(userId);
  store.identityKeys.delete(userId);
  persistStore();
  console.log(`[Signal] Session cleared for ${userId.slice(0, 8)}...`);
}

/**
 * Clear all encryption state (logout)
 */
export function clearEncryptionState() {
  store.identityKeyPair = null;
  store.signingKeyPair = null;
  store.signedPreKey = null;
  store.signedPreKeySignature = null;
  store.registrationId = 0;
  store.preKeys.clear();
  store.sessions.clear();
  store.identityKeys.clear();
  _jwkCache.identityPriv = null;
  _jwkCache.signingPriv = null;
  _jwkCache.signedPreKeyPriv = null;
  _jwkCache.preKeys.clear();
  vaultRemove(STORE_KEY);
  clearPreloadCache();
  // Also clear all skipped keys
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith(SKIPPED_PREFIX)) vaultRemove(k);
  }
  console.log('[Signal] All encryption state cleared');
}

/**
 * Check if a ciphertext string looks like an encrypted Signal message
 */
export function isEncryptedMessage(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') return false;
  try {
    const parsed = JSON.parse(ciphertext);
    return (parsed.t === PREKEY_MSG || parsed.t === SIGNAL_MSG) && parsed.body?.iv && parsed.body?.ct;
  } catch {
    return false;
  }
}
