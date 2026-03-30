import { getAccessToken } from './client';
import { API_URL } from '../utils/constants';

/**
 * Upload a file attachment.
 * Uses raw fetch (not axios client) because we need multipart/form-data.
 */
export async function uploadAttachment(file, recipientId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('recipientId', recipientId);

  const token = getAccessToken();
  const res = await fetch(`${API_URL}/api/attachments/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
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
