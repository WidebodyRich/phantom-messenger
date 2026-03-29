import axios from 'axios';
import { API_URL } from '../utils/constants';

const client = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
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

client.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 401 && accessToken) {
      // Try to refresh token
      try {
        const refreshToken = sessionStorage.getItem('phantom_refresh');
        if (refreshToken) {
          const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
          if (res.data?.success) {
            const newToken = res.data.data.accessToken;
            setAccessToken(newToken);
            if (res.data.data.refreshToken) {
              sessionStorage.setItem('phantom_refresh', res.data.data.refreshToken);
            }
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return axios(error.config).then((r) => r.data);
          }
        }
      } catch {
        sessionStorage.removeItem('phantom_refresh');
        setAccessToken(null);
        window.location.href = '/login';
      }
    }

    return Promise.reject({
      status,
      message: data?.error || error.message || 'Network error',
    });
  }
);

export default client;
