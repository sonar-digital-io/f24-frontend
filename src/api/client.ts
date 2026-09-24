import axios, { type AxiosResponse } from 'axios';
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

/** Filename from an attachment response's `Content-Disposition` header, if any.
 *  Matches a bare `filename=` segment only — not RFC 5987's `filename*=`, which has a
 *  different (encoded) value format and would otherwise get captured as garbage. */
export function attachmentFilename(response: AxiosResponse): string | undefined {
  const match = (response.headers['content-disposition'] as string | undefined)
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => /^filename=/.test(part));
  return match?.slice('filename='.length).replace(/^"|"$/g, '') || undefined;
}
