import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as settingsApi from '@/api/settings';
import type { SettingsPayload } from '@/api/types/settings';

export const settingsKeys = {
  detail: () => ['settings'] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: () => settingsApi.getSettings(),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SettingsPayload) => settingsApi.updateSettings(payload),
    onSuccess: (data) => queryClient.setQueryData(settingsKeys.detail(), data),
  });
}
