import { apiClient } from './client';
import type { KeyValuePair } from './types/common';
import type { UserSettings, UserRolePayload, UserLevelPayload, UserBlockPayload } from './types/users';

export async function getHistory(startDate: string, endDate: string): Promise<unknown> {
  const { data } = await apiClient.get('/history/', {
    params: { 'start-date': startDate, 'end-date': endDate },
  });
  return data;
}

export async function getSoftwareVersion(): Promise<unknown> {
  const { data } = await apiClient.get('/software/version/');
  return data;
}

export async function getUserSettings(userId: number): Promise<UserSettings> {
  const { data } = await apiClient.get<UserSettings>(`/settings/${userId}/`);
  return data;
}

export async function updateUserSettings(userId: number, parameters: KeyValuePair[]): Promise<UserSettings> {
  const { data } = await apiClient.put<UserSettings>(`/settings/${userId}/`, { parameters });
  return data;
}

export async function getUserList(): Promise<unknown[]> {
  const { data } = await apiClient.get('/user/list/');
  return data;
}

export async function getUser(userId: number): Promise<unknown> {
  const { data } = await apiClient.get(`/user/${userId}/`);
  return data;
}

export async function deleteUser(userId: number): Promise<void> {
  await apiClient.delete(`/user/${userId}/`);
}

export async function updateUserRole(userId: number, payload: UserRolePayload): Promise<unknown> {
  const { data } = await apiClient.put(`/user/${userId}/role/`, payload);
  return data;
}

export async function updateUserLevel(userId: number, payload: UserLevelPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/user/${userId}/level/`, payload);
  return data;
}

export async function updateUserBlock(userId: number, payload: UserBlockPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/user/${userId}/block/`, payload);
  return data;
}
