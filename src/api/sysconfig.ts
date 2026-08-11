import { apiClient } from './client';
import type { SysconfigResponse } from './types/sysconfig';

export async function getSysconfig(projectId: string): Promise<SysconfigResponse> {
  const { data } = await apiClient.get<SysconfigResponse>('/sysconfig/', { params: { project: projectId } });
  return data;
}

/** Omit `materialId` for a not-yet-created material — still returns the parameter
 *  catalog (e.g. mech_prop_type's options), just without any material-specific resolution. */
export async function getMaterialSysconfig(materialId?: number): Promise<SysconfigResponse> {
  const { data } = await apiClient.get<SysconfigResponse>('/sysconfig/', {
    params: Number.isFinite(materialId) ? { material: materialId } : undefined,
  });
  return data;
}
