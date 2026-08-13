import { useQuery } from '@tanstack/react-query';
import { getSysconfig, getMaterialSysconfig } from '@/api/sysconfig';

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

export const materialSysconfigKeys = {
  detail: (materialId: number) => ['sysconfig', 'material', materialId] as const,
};

/** Pass NaN for a not-yet-created material — still fetches (just without `?material=`),
 *  since the parameter catalog (e.g. mech_prop_type's options) doesn't need one. */
export function useMaterialSysconfig(materialId: number) {
  return useQuery({
    queryKey: materialSysconfigKeys.detail(materialId),
    queryFn: () => getMaterialSysconfig(Number.isFinite(materialId) ? materialId : undefined),
    // Same reasoning as useSysconfig above — `active`/`fixed`/`value` are resolved
    // against the material's current saved values, so don't trust a cached response.
    // (gcTime deliberately left at its default — 0 would drop the cached data the instant
    // the component briefly unmounts, forcing isLoading:true instead of a quiet revalidate.)
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
