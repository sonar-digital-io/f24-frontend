import { useQuery } from '@tanstack/react-query';
import { getSysconfig } from '@/api/sysconfig';

export const sysconfigKeys = {
  detail: (projectId: string) => ['sysconfig', projectId] as const,
};

export function useSysconfig(projectId: string) {
  return useQuery({
    queryKey: sysconfigKeys.detail(projectId),
    queryFn: () => getSysconfig(projectId),
    enabled: Boolean(projectId),
    // Always hit the server on every tab visit — settings change too often
    // for a cached response to stay trustworthy, so don't reuse or retain it.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });
}
