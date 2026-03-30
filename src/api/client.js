import axios from 'axios';
import { API_URL } from '../utils/constants';

const client = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Send httpOnly cookies cross-origin
});

// Access token lives in memory only — not localStorage, not cookies
// On page refresh it's gone; the httpOnly refresh cookie gets a new one
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Track if a refresh is already in progress (prevent parallel refresh races)
let refreshPromise = null;

client.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const originalRequest = error.config;

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Deduplicate concurrent refresh attempts
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            // No need to send refresh token — it's in the httpOnly cookie automatically
            const res = await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true });
            if (res.data?.success) {
              accessToken = res.data.data.accessToken;
              return accessToken;
            }
            throw new Error('Refresh failed');
          } catch (err) {
            accessToken = null;
            window.location.href = '/login';
            throw err;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      try {
        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalRequest).then((r) => r.data);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject({
      status,
      message: data?.error || error.message || 'Network error',
    });
  }
);

export default client;
