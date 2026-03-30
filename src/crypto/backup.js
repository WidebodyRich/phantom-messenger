/**
 * Encrypted Backup & Recovery
 *
 * Exports all local crypto state (Signal Protocol keys, sessions, wallet,
 * verified contacts, address map) into a single AES-256-GCM encrypted
 * backup file, protected by a user-chosen passphrase via PBKDF2.
 *
 * Backup format (binary):
 *   [4 bytes: magic "PHBK"]
 *   [1 byte:  version (0x01)]
 *   [16 bytes: PBKDF2 salt]
 *   [12 bytes: AES-GCM IV]
 *   [rest:     AES-256-GCM ciphertext (JSON payload)]
 */

const MAGIC = new Uint8Array([0x50, 0x48, 0x42, 0x4B]); // "PHBK"
const VERSION = 0x01;
const PBKDF2_ITERATIONS = 310000;

/**
 * Collect all Phantom local data into a plain object.
 */
function collectBackupData() {
  const data = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    // Collect all phantom_ prefixed keys
    if (key.startsWith('phantom_')) {
      data[key] = localStorage.getItem(key);
    }
  }

  return data;
}

/**
 * Derive an AES-256-GCM key from a passphrase via PBKDF2.
 */
async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase),
    'PBKDF2', false, ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Create an encrypted backup of all local Phantom data.
 * @param {string} passphrase — user-chosen passphrase
 * @returns {Blob} — encrypted backup file
 */
export async function createBackup(passphrase) {
  // Collect all data
  const payload = collectBackupData();
  const jsonStr = JSON.stringify(payload);
  const plaintext = new TextEncoder().encode(jsonStr);

  // Derive key from passphrase
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    plaintext
  );

  // Build binary format: magic + version + salt + iv + ciphertext
  const totalSize = 4 + 1 + 16 + 12 + ciphertext.byteLength;
  const output = new Uint8Array(totalSize);
  let offset = 0;

  output.set(MAGIC, offset); offset += 4;
  output[offset] = VERSION; offset += 1;
  output.set(salt, offset); offset += 16;
  output.set(iv, offset); offset += 12;
  output.set(new Uint8Array(ciphertext), offset);

  return new Blob([output], { type: 'application/octet-stream' });
}

/**
 * Restore from an encrypted backup file.
 * @param {File|Blob} file — the .phbk backup file
 * @param {string} passphrase — passphrase used when creating the backup
 * @returns {number} — count of keys restored
 */
export async function restoreBackup(file, passphrase) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Validate magic
  if (bytes.length < 33) throw new Error('Invalid backup file (too small)');
  if (bytes[0] !== 0x50 || bytes[1] !== 0x48 || bytes[2] !== 0x42 || bytes[3] !== 0x4B) {
    throw new Error('Invalid backup file (wrong format)');
  }

  const version = bytes[4];
  if (version !== VERSION) throw new Error(`Unsupported backup version: ${version}`);

  // Extract salt, IV, ciphertext
  const salt = bytes.slice(5, 21);
  const iv = bytes.slice(21, 33);
  const ciphertext = bytes.slice(33);

  // Derive key and decrypt
  const key = await deriveKey(passphrase, salt);

  let plaintext;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      ciphertext
    );
  } catch {
    throw new Error('Wrong passphrase or corrupted backup');
  }

  const jsonStr = new TextDecoder().decode(plaintext);
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    throw new Error('Backup data is corrupted');
  }

  // Clear existing phantom_ keys before restoring
  const keysToRemove = [];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith('phantom_')) keysToRemove.push(k);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));

  // Restore all keys
  let count = 0;
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith('phantom_') && typeof v === 'string') {
      localStorage.setItem(k, v);
      count++;
    }
  }

  return count;
}
