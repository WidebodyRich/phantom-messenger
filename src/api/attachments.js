import { getAccessToken } from './client';
import { API_URL } from '../utils/constants';

/**
 * Upload a file attachment.
 * Uses raw fetch (not axios client) because we need multipart/form-data.
 */
export async function uploadAttachment(file, recipientId) {
  const formData = new FormData();
  formData.append('file', file);
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
    return data;
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
