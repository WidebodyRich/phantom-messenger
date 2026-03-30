import client, { getAccessToken } from './client';
import { API_URL } from '../utils/constants';

// ── Storefronts ──
export const discoverStorefronts = (params = {}) =>
  client.get('/api/storefronts/discover', { params });

export const getFeaturedStorefronts = () =>
  client.get('/api/storefronts/featured');

export const getMyStorefronts = () =>
  client.get('/api/storefronts/my');

export const getStorefront = (slugOrId) =>
  client.get(`/api/storefronts/${slugOrId}`);

export const createStorefront = (data) =>
  client.post('/api/storefronts', data);

export const updateStorefront = (id, data) =>
  client.put(`/api/storefronts/${id}`, data);

export const deleteStorefront = (id) =>
  client.delete(`/api/storefronts/${id}`);

export const followStorefront = (id) =>
  client.post(`/api/storefronts/${id}/follow`);

export const unfollowStorefront = (id) =>
  client.delete(`/api/storefronts/${id}/follow`);

export const getFollowStatus = (id) =>
  client.get(`/api/storefronts/${id}/follow`);

export const joinStorefront = (id, inviteCode) =>
  client.post(`/api/storefronts/${id}/join`, { inviteCode });

export const getStorefrontMembers = (id) =>
  client.get(`/api/storefronts/${id}/members`);

export const featureStorefront = (id) =>
  client.post(`/api/storefronts/${id}/feature`);

// ── Products ──
export const createProduct = (data) =>
  client.post('/api/products', data);

export const getProducts = (params = {}) =>
  client.get('/api/products', { params });

export const searchProducts = (params = {}) =>
  client.get('/api/products/search', { params });

export const getTrendingProducts = () =>
  client.get('/api/products/trending');

export const getProduct = (id) =>
  client.get(`/api/products/${id}`);

export const updateProduct = (id, data) =>
  client.put(`/api/products/${id}`, data);

export const deleteProduct = (id) =>
  client.delete(`/api/products/${id}`);

export const uploadProductImages = async (productId, files) => {
  const formData = new FormData();
  files.forEach(f => formData.append('images', f));
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/api/products/${productId}/upload-images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return res.json();
};

export const uploadDigitalFile = async (productId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/api/products/${productId}/upload-digital`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return res.json();
};

// ── Orders ──
export const createOrder = (data) =>
  client.post('/api/orders', data);

export const fundOrder = (id, txid) =>
  client.put(`/api/orders/${id}/fund`, { txid });

export const getMyPurchases = () =>
  client.get('/api/orders/my-purchases');

export const getMySales = () =>
  client.get('/api/orders/my-sales');

export const getOrder = (id) =>
  client.get(`/api/orders/${id}`);

export const shipOrder = (id, trackingNumber) =>
  client.put(`/api/orders/${id}/ship`, { trackingNumber });

export const confirmOrder = (id) =>
  client.put(`/api/orders/${id}/confirm`);

export const disputeOrder = (id, reason) =>
  client.put(`/api/orders/${id}/dispute`, { reason });

export const resolveDispute = (id, resolution, refund) =>
  client.put(`/api/orders/${id}/resolve`, { resolution, refund });

// ── Reviews ──
export const createReview = (data) =>
  client.post('/api/reviews', data);

export const getReviews = (params = {}) =>
  client.get('/api/reviews', { params });
