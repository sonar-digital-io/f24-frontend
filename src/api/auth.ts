import { apiClient } from './client';
import { setAuthState, clearAuthState } from './authStorage';
import type { LoginRequest, LoginResponse } from './types/auth';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login/', payload);
  setAuthState({ csrfToken: data['X-CSRFToken'], userId: data.user_id });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout/');
  clearAuthState();
}
