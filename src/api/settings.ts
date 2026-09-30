import { apiClient } from './client';
import type { SettingsPayload, SettingsResponse } from './types/settings';

// A single global settings record — not tied to any user/project/composition,
// so (confirmed against staging) there's just this one fixed id to read/write.
const SETTINGS_ID = 21;

export async function getSettings(): Promise<SettingsResponse> {
  const { data } = await apiClient.get<SettingsResponse>(`/settings/${SETTINGS_ID}/`);
  return data;
}

export async function updateSettings(payload: SettingsPayload): Promise<SettingsResponse> {
  const { data } = await apiClient.put<SettingsResponse>(`/settings/${SETTINGS_ID}/`, payload);
  return data;
}
