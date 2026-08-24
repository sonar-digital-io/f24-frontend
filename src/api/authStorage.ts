import { clearCachedSysconfig } from './sysconfigStorage';

const STORAGE_KEY = 'f24_auth';

export interface AuthState {
  csrfToken: string;
  userId: number;
}

export function getAuthState(): AuthState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function setAuthState(state: AuthState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearAuthState(): void {
  localStorage.removeItem(STORAGE_KEY);
  // The cached parameterless sysconfig (sysconfigStorage.ts) is only ever valid for the
  // signed-in session that fetched it — drop it alongside auth state, same as the Angular
  // app's `TokenStorageService.signOut()` clearing the whole localStorage.
  clearCachedSysconfig();
}
