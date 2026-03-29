/**
 * Key generation for Phantom Messenger
 * Phase 1: Simplified key generation using Web Crypto API
 * TODO Phase 2: Full Signal Protocol with libsignal
 */

// Generate a random hex string
export function randomHex(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Generate identity key pair (ECDSA P-256)
export async function generateIdentityKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const publicKey = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  return {
    publicKey: arrayBufferToBase64(publicKey),
    privateKey: arrayBufferToBase64(privateKey),
    keyPair,
  };
}

// Generate signed pre-key
export async function generateSignedPreKey(identityKeyPair) {
  const preKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const publicKeyRaw = await crypto.subtle.exportKey('raw', preKeyPair.publicKey);
  const publicKeyBase64 = arrayBufferToBase64(publicKeyRaw);

  // Sign the public key with identity key
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    identityKeyPair.keyPair.privateKey,
    publicKeyRaw
  );

  return {
    publicKey: publicKeyBase64,
    signature: arrayBufferToBase64(signature),
    keyPair: preKeyPair,
  };
}

// Generate one-time pre-keys
export async function generatePreKeys(count = 20, startIndex = 1) {
  const preKeys = [];
  for (let i = 0; i < count; i++) {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits']
    );
    const publicKey = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    preKeys.push({
      index: startIndex + i,
      publicKey: arrayBufferToBase64(publicKey),
      keyPair,
    });
  }
  return preKeys;
}

// Generate all registration keys
export async function generateRegistrationKeys() {
  const identity = await generateIdentityKeyPair();
  const signedPreKey = await generateSignedPreKey(identity);
  const preKeys = await generatePreKeys(20);

  return {
    identityKeyPublic: identity.publicKey,
    signedPreKeyPublic: signedPreKey.publicKey,
    signedPreKeySignature: signedPreKey.signature,
    preKeys: preKeys.map((pk) => ({ index: pk.index, publicKey: pk.publicKey })),
    // Store private keys locally
    _private: {
      identityKey: identity,
      signedPreKey: signedPreKey,
      preKeys: preKeys,
    },
  };
}

// Utility functions
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

export { arrayBufferToBase64, base64ToArrayBuffer };
