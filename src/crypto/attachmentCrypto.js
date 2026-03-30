/**
 * Client-side file attachment encryption — AES-256-GCM
 *
 * Every file gets a unique random 256-bit key + 96-bit IV.
 * The key and IV are embedded in the message metadata, which is
 * already E2E encrypted via Signal Protocol — so only the
 * intended recipient can decrypt the attachment.
 *
 * The server only ever sees ciphertext.
 */

/**
 * Encrypt a File/Blob with AES-256-GCM.
 * @param {File|Blob} file
 * @returns {Promise<{ encryptedBlob: Blob, keyB64: string, ivB64: string }>}
 */
export async function encryptFile(file) {
  // Generate random 256-bit key and 96-bit IV
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable — we need to send it to the recipient
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Read file into ArrayBuffer
  const plaintext = await file.arrayBuffer();

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    plaintext
  );

  // Export key as raw bytes → base64
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const keyB64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
  const ivB64 = btoa(String.fromCharCode(...iv));

  // Return encrypted blob (preserving nothing about original type — server sees opaque bytes)
  const encryptedBlob = new Blob([ciphertext], { type: 'application/octet-stream' });

  return { encryptedBlob, keyB64, ivB64 };
}

/**
 * Decrypt an AES-256-GCM encrypted file.
 * @param {ArrayBuffer|Blob} encryptedData
 * @param {string} keyB64 — base64-encoded 256-bit key
 * @param {string} ivB64  — base64-encoded 96-bit IV
 * @param {string} [mimeType='application/octet-stream'] — original MIME type to restore
 * @returns {Promise<Blob>}
 */
export async function decryptFile(encryptedData, keyB64, ivB64, mimeType = 'application/octet-stream') {
  // Decode key and IV from base64
  const rawKey = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'raw', rawKey,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['decrypt']
  );

  // Get ArrayBuffer from input
  const ciphertext = encryptedData instanceof Blob
    ? await encryptedData.arrayBuffer()
    : encryptedData;

  // Decrypt
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    ciphertext
  );

  return new Blob([plaintext], { type: mimeType });
}
