import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '@/api/users';
import type { KeyValuePair } from '@/api/types/common';
import type { UserRolePayload, UserLevelPayload, UserBlockPayload } from '@/api/types/users';

export const userKeys = {
  history: (startDate: string, endDate: string) => ['users', 'history', startDate, endDate] as const,
  softwareVersion: () => ['users', 'software-version'] as const,
  settings: (userId: number) => ['users', 'settings', userId] as const,
  list: () => ['users', 'list'] as const,
  detail: (userId: number) => ['users', 'detail', userId] as const,
};

export function useHistory(startDate: string, endDate: string) {
  return useQuery({
    queryKey: userKeys.history(startDate, endDate),
    queryFn: () => usersApi.getHistory(startDate, endDate),
  });
}

export function useSoftwareVersion() {
  return useQuery({
    queryKey: userKeys.softwareVersion(),
    queryFn: () => usersApi.getSoftwareVersion(),
  });
}

export function useUserSettings(userId: number) {
  return useQuery({
    queryKey: userKeys.settings(userId),
    queryFn: () => usersApi.getUserSettings(userId),
    enabled: Number.isFinite(userId),
  });
}

export function useUpdateUserSettings(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (parameters: KeyValuePair[]) => usersApi.updateUserSettings(userId, parameters),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.settings(userId) }),
  });
}

export function useUserList() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: () => usersApi.getUserList(),
  });
}

export function useUser(userId: number) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => usersApi.getUser(userId),
    enabled: Number.isFinite(userId),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => usersApi.deleteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.list() }),
  });
}

export function useUpdateUserRole(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserRolePayload) => usersApi.updateUserRole(userId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) }),
  });
}

export function useUpdateUserLevel(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserLevelPayload) => usersApi.updateUserLevel(userId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) }),
  });
}

export function useUpdateUserBlock(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserBlockPayload) => usersApi.updateUserBlock(userId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) }),
  });
}
