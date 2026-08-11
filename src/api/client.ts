import axios from 'axios';
import { getAuthState, clearAuthState } from './authStorage';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 10_000,
});

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase();
  if (method && method !== 'get') {
    const auth = getAuthState();
    if (auth?.csrfToken) {
      config.headers['X-CSRFToken'] = auth.csrfToken;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthState();
    }
    return Promise.reject(error);
  }
);