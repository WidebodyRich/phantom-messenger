import axios from 'axios';
import { API_URL } from '../utils/constants';

const client = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const ACCESS_TOKEN_KEY = 'phantom_access';

export function setAccessToken(token) {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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

    if (status === 401 && getAccessToken() && !originalRequest._retry) {
      originalRequest._retry = true;

      // Deduplicate concurrent refresh attempts
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshToken = localStorage.getItem('phantom_refresh');
            if (!refreshToken) throw new Error('No refresh token');

            const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
            if (res.data?.success) {
              setAccessToken(res.data.data.accessToken);
              if (res.data.data.refreshToken) {
                localStorage.setItem('phantom_refresh', res.data.data.refreshToken);
              }
              return res.data.data.accessToken;
            }
            throw new Error('Refresh failed');
          } catch (err) {
            localStorage.removeItem('phantom_refresh');
            setAccessToken(null);
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
