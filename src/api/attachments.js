import { getAccessToken } from './client';
import { API_URL } from '../utils/constants';
import { encryptFile } from '../crypto/attachmentCrypto';

/**
 * Upload a file attachment — encrypts with AES-256-GCM before upload.
 * The server only ever receives ciphertext.
 *
 * Returns: { data: { id, url }, encryptionKey, encryptionIV }
 * The key+IV must be included in the message metadata (which is E2E encrypted).
 */
export async function uploadAttachment(file, recipientId) {
  // Encrypt the file client-side before uploading
  const { encryptedBlob, keyB64, ivB64 } = await encryptFile(file);

  // Upload the encrypted blob with an opaque filename
  const formData = new FormData();
  formData.append('file', encryptedBlob, file.name + '.enc');
  if (recipientId) formData.append('recipientId', recipientId);

  const token = getAccessToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

  try {
    const res = await fetch(`${API_URL}/api/attachments/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Check if response is JSON (not HTML error page)
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Upload endpoint not available. Server returned non-JSON response.');
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');

    // Return server response + encryption metadata
    return {
      ...data,
      encryptionKey: keyB64,
      encryptionIV: ivB64,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Upload timed out. Try a smaller file.');
    }
    throw err;
  }
}

/**
 * Get a signed download URL for an attachment.
 */
export async function getAttachmentUrl(attachmentId) {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get attachment');
  return data;
}
