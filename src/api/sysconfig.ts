import { apiClient } from './client';
import type { SysconfigResponse } from './types/sysconfig';

export async function getSysconfig(projectId: string): Promise<SysconfigResponse> {
  const { data } = await apiClient.get<SysconfigResponse>('/sysconfig/', { params: { project: projectId } });
  return data;
}
