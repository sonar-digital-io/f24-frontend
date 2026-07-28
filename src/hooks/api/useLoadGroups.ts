import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as loadGroupsApi from '@/api/loadGroups';
import type { LoadGroupPayload, LoadGroupLimitsPayload, LoadCasesPayload } from '@/api/types/loadGroups';

export const loadGroupKeys = {
  list: () => ['load-groups', 'list'] as const,
  detail: (loadGroupId: number) => ['load-groups', 'detail', loadGroupId] as const,
  loadCases: (loadGroupId: number) => ['load-groups', 'load-cases', loadGroupId] as const,
  fatigueProfiles: (loadGroupId: number) => ['load-groups', 'fatigue-profiles', loadGroupId] as const,
};

export function useLoadGroupList() {
  return useQuery({ queryKey: loadGroupKeys.list(), queryFn: () => loadGroupsApi.getLoadGroupList() });
}

export function useLoadGroupDetail(loadGroupId: number) {
  return useQuery({
    queryKey: loadGroupKeys.detail(loadGroupId),
    queryFn: () => loadGroupsApi.getLoadGroup(loadGroupId),
    enabled: Number.isFinite(loadGroupId),
    // Never show a stale cached copy when reopening the edit page right after a save.
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useCreateLoadGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoadGroupPayload) => loadGroupsApi.createLoadGroup(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loadGroupKeys.list() }),
  });
}

export function useUpdateLoadGroup(loadGroupId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoadGroupPayload) => loadGroupsApi.updateLoadGroup(loadGroupId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loadGroupKeys.detail(loadGroupId) });
      queryClient.invalidateQueries({ queryKey: loadGroupKeys.list() });
    },
  });
}

export function useDeleteLoadGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (loadGroupId: number) => loadGroupsApi.deleteLoadGroup(loadGroupId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loadGroupKeys.list() }),
  });
}

export function useUpdateLoadGroupLimits(loadGroupId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoadGroupLimitsPayload) => loadGroupsApi.updateLoadGroupLimits(loadGroupId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loadGroupKeys.detail(loadGroupId) }),
  });
}

export function useLoadCases(loadGroupId: number) {
  return useQuery({
    queryKey: loadGroupKeys.loadCases(loadGroupId),
    queryFn: () => loadGroupsApi.getLoadCases(loadGroupId),
    enabled: Number.isFinite(loadGroupId),
  });
}

export function useUpdateLoadCases(loadGroupId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoadCasesPayload) => loadGroupsApi.updateLoadCases(loadGroupId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loadGroupKeys.loadCases(loadGroupId) }),
  });
}

export function useFatigueProfiles(loadGroupId: number) {
  return useQuery({
    queryKey: loadGroupKeys.fatigueProfiles(loadGroupId),
    queryFn: () => loadGroupsApi.getFatigueProfiles(loadGroupId),
    enabled: Number.isFinite(loadGroupId),
  });
}

export function useUpdateFatigueProfiles(loadGroupId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => loadGroupsApi.updateFatigueProfiles(loadGroupId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loadGroupKeys.fatigueProfiles(loadGroupId) }),
  });
}
