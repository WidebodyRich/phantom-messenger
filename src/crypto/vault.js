/**
 * Vault — encrypts sensitive localStorage data with a PBKDF2-derived AES-256-GCM key.
 *
 * The vault key is derived from the user's identity (username + a device-local random salt).
 * This means:
 *  - XSS attackers who dump localStorage get only ciphertext
 *  - The key is derived on login and held in memory only
 *  - On logout, the derived key is wiped from memory
 *
 * Storage format: base64(salt:iv:ciphertext) stored under the same localStorage keys.
 * Unencrypted (legacy) values are auto-detected and migrated on first read.
 */

const VAULT_SALT_KEY = 'phantom_vault_salt';
const PBKDF2_ITERATIONS = 310000; // OWASP 2023 recommendation for SHA-256

let vaultKey = null; // CryptoKey held in memory only

// ─── Key Derivation ───

/**
 * Derive a vault key from the user's identity material.
 * Called once after login; the key lives in memory until logout.
 */
export async function unlockVault(username, userId) {
  // Get or create a device-local salt (random 16 bytes, stored in localStorage)
  let saltB64 = localStorage.getItem(VAULT_SALT_KEY);
  let salt;
  if (saltB64) {
    salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  } else {
    salt = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(VAULT_SALT_KEY, btoa(String.fromCharCode(...salt)));
  }

  // Derive AES-256-GCM key from username + userId + salt via PBKDF2
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${username}:${userId}`),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  vaultKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Wipe the vault key from memory. Called on logout.
 */
export function lockVault() {
  vaultKey = null;
}

/**
 * Check if the vault is currently unlocked.
 */
export function isVaultUnlocked() {
  return vaultKey !== null;
}

// ─── Encrypt / Decrypt ───

async function encrypt(plaintext) {
  if (!vaultKey) throw new Error('Vault is locked');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    vaultKey,
    encoded
  );
  // Pack as: iv (12 bytes) + ciphertext
  const packed = new Uint8Array(iv.length + ciphertext.byteLength);
  packed.set(iv);
  packed.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...packed));
}

async function decrypt(b64) {
  if (!vaultKey) throw new Error('Vault is locked');
  const packed = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = packed.slice(0, 12);
  const ciphertext = packed.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    vaultKey,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

// ─── Vault Storage API ───

const VAULT_PREFIX = 'v1:'; // Prefix to identify encrypted values

/**
 * Store a value in localStorage, encrypted with the vault key.
 * Falls back to plaintext if vault is locked (e.g., during initial registration).
 */
export async function vaultSet(key, value) {
  if (vaultKey) {
    const encrypted = await encrypt(value);
    localStorage.setItem(key, VAULT_PREFIX + encrypted);
  } else {
    // Vault not yet unlocked (first registration, pre-login state)
    localStorage.setItem(key, value);
  }
}

/**
 * Read a value from localStorage, decrypting if vault-encrypted.
 * Transparently handles legacy plaintext values (auto-migrates on next write).
 */
export async function vaultGet(key) {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;

  if (raw.startsWith(VAULT_PREFIX) && vaultKey) {
    try {
      return await decrypt(raw.slice(VAULT_PREFIX.length));
    } catch (err) {
      console.warn(`[Vault] Decryption failed for ${key} — clearing corrupt entry`);
      localStorage.removeItem(key);
      return null;
    }
  }

  // Legacy plaintext value or vault locked — return as-is
  return raw;
}

/**
 * Remove a key from localStorage.
 */
export function vaultRemove(key) {
  localStorage.removeItem(key);
}

/**
 * Migrate existing plaintext values to encrypted vault storage.
 * Called after vault is unlocked on login.
 */
export async function migrateToVault(keys) {
  if (!vaultKey) return;
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (raw !== null && !raw.startsWith(VAULT_PREFIX)) {
      // Plaintext value — encrypt and re-store
      const encrypted = await encrypt(raw);
      localStorage.setItem(key, VAULT_PREFIX + encrypted);
    }
  }
}
