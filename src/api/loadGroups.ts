import { apiClient } from './client';
import type {
  LoadGroupPayload,
  LoadGroup,
  LoadGroupLimitsPayload,
  LoadCasesPayload,
  FatigueProfilesPayload,
} from './types/loadGroups';

export async function createLoadGroup(payload: LoadGroupPayload): Promise<LoadGroup> {
  const { data } = await apiClient.post<LoadGroup>('/load/', payload);
  return data;
}

export async function getLoadGroupList(): Promise<LoadGroup[]> {
  const { data } = await apiClient.get<LoadGroup[]>('/load/list/');
  return data;
}

export async function getLoadGroup(loadGroupId: number): Promise<LoadGroup> {
  const { data } = await apiClient.get<LoadGroup>(`/load/${loadGroupId}/`);
  return data;
}

export async function updateLoadGroup(loadGroupId: number, payload: LoadGroupPayload): Promise<LoadGroup> {
  const { data } = await apiClient.put<LoadGroup>(`/load/${loadGroupId}/`, payload);
  return data;
}

export async function deleteLoadGroup(loadGroupId: number): Promise<void> {
  await apiClient.delete(`/load/${loadGroupId}/`);
}

export async function updateLoadGroupLimits(loadGroupId: number, payload: LoadGroupLimitsPayload): Promise<LoadGroupLimitsPayload> {
  const { data } = await apiClient.put<LoadGroupLimitsPayload>(`/load/${loadGroupId}/limits/`, payload);
  return data;
}

export async function getLoadCases(loadGroupId: number): Promise<LoadCasesPayload> {
  const { data } = await apiClient.get<LoadCasesPayload>(`/load/${loadGroupId}/load-cases/`);
  return data;
}

export async function updateLoadCases(loadGroupId: number, payload: LoadCasesPayload): Promise<LoadCasesPayload> {
  const { data } = await apiClient.put<LoadCasesPayload>(`/load/${loadGroupId}/load-cases/`, payload);
  return data;
}

export async function getFatigueProfiles(loadGroupId: number): Promise<FatigueProfilesPayload> {
  // Nested under `fatigue_profiles` — same as the array embedded in GET /load/:id/.
  const { data } = await apiClient.get<FatigueProfilesPayload | { fatigue_profiles: FatigueProfilesPayload }>(
    `/load/${loadGroupId}/fatigue-profiles/`
  );
  return Array.isArray(data) ? data : data.fatigue_profiles;
}

export async function updateFatigueProfiles(loadGroupId: number, payload: FatigueProfilesPayload): Promise<FatigueProfilesPayload> {
  // The backend rejects a raw array body ("Expected a dictionary, but got
  // list") — it wants the same { fatigue_profiles: [...] } wrapper as GET.
  const { data } = await apiClient.put<{ fatigue_profiles: FatigueProfilesPayload }>(
    `/load/${loadGroupId}/fatigue-profiles/`,
    { fatigue_profiles: payload }
  );
  return data.fatigue_profiles;
}
