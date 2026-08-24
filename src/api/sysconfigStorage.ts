import type { SysconfigResponse } from './types/sysconfig';

/** Same key the Angular app used (sysconfig.md §6.1) — only the parameterless
 *  sysconfig (no `?project=`/`?material=`) belongs here; context-sensitive
 *  responses must never be cached. */
const STORAGE_KEY = 'system-config';

export function getCachedSysconfig(): SysconfigResponse | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SysconfigResponse;
  } catch {
    return null;
  }
}

export function setCachedSysconfig(config: SysconfigResponse): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearCachedSysconfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}
