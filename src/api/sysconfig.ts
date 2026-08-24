import { apiClient } from './client';
import { getCachedSysconfig, setCachedSysconfig } from './sysconfigStorage';
import type { SysconfigResponse } from './types/sysconfig';

export async function getSysconfig(projectId: string): Promise<SysconfigResponse> {
  const { data } = await apiClient.get<SysconfigResponse>('/sysconfig/', { params: { project: projectId } });
  return data;
}

/** The parameterless config (no `?project=`/`?material=`) — identical for every caller,
 *  so it's read from localStorage across reloads instead of hitting the network every
 *  time (sysconfig.md §6.1: "context-free config is cached; context-sensitive config is
 *  not"). Cleared only alongside auth state, see `clearAuthState`. */
async function getParameterlessSysconfig(): Promise<SysconfigResponse> {
  const cached = getCachedSysconfig();
  if (cached) return cached;
  const { data } = await apiClient.get<SysconfigResponse>('/sysconfig/');
  setCachedSysconfig(data);
  return data;
}

/** Omit `materialId` for a not-yet-created material — still returns the parameter
 *  catalog (e.g. mech_prop_type's options), just without any material-specific resolution. */
export async function getMaterialSysconfig(materialId?: number): Promise<SysconfigResponse> {
  if (!Number.isFinite(materialId)) return getParameterlessSysconfig();
  const { data } = await apiClient.get<SysconfigResponse>('/sysconfig/', { params: { material: materialId } });
  return data;
}

/** No id param — `configuration.geometry_settings` is the same for every geometry. */
export async function getGeometrySysconfig(): Promise<SysconfigResponse> {
  return getParameterlessSysconfig();
}
