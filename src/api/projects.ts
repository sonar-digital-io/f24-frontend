import { apiClient } from './client';
import type {
  ProjectPayload,
  ProjectCreateResponse,
  Project,
  ProjectSettingsPayload,
  ProjectCompositionPayload,
  ProjectGeometryPayload,
  ProjectLoadPayload,
  ProjectFatiguePayload,
  ProjectStatePayload,
  ProjectLogQuery,
  ProjectLogResponse,
} from './types/projects';

export async function createProject(payload: ProjectPayload): Promise<ProjectCreateResponse> {
  const { data } = await apiClient.post<ProjectCreateResponse>('/project/', payload);
  return data;
}

export async function getProjectList(): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>('/project/list/');
  return data;
}

export async function getProject(projectId: string): Promise<Project> {
  const { data } = await apiClient.get<Project>(`/project/${projectId}/`);
  return data;
}

export async function updateProject(projectId: string, payload: ProjectPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/project/${projectId}/`, payload);
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.delete(`/project/${projectId}/`);
}

export async function updateProjectSettings(projectId: string, payload: ProjectSettingsPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/project/${projectId}/settings/`, payload);
  return data;
}

export async function updateProjectComposition(projectId: string, payload: ProjectCompositionPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/project/${projectId}/composition/`, payload);
  return data;
}

export async function updateProjectGeometry(projectId: string, payload: ProjectGeometryPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/project/${projectId}/geometry/`, payload);
  return data;
}

export async function updateProjectLoad(projectId: string, payload: ProjectLoadPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/project/${projectId}/load/`, payload);
  return data;
}

export async function updateProjectFatigue(projectId: string, payload: ProjectFatiguePayload): Promise<unknown> {
  const { data } = await apiClient.put(`/project/${projectId}/fatigue/`, payload);
  return data;
}

export async function getProjectState(projectId: string): Promise<ProjectStatePayload> {
  const { data } = await apiClient.get<ProjectStatePayload>(`/project/${projectId}/state/`);
  return data;
}

export async function updateProjectState(projectId: string, payload: ProjectStatePayload): Promise<ProjectStatePayload> {
  const { data } = await apiClient.put<ProjectStatePayload>(`/project/${projectId}/state/`, payload);
  return data;
}

export async function exportProject(projectId: string): Promise<Blob> {
  const { data } = await apiClient.get(`/project/${projectId}/export/`, { responseType: 'blob' });
  return data;
}

export async function getProjectLog(projectId: string, query?: ProjectLogQuery): Promise<ProjectLogResponse> {
  const { data } = await apiClient.get<ProjectLogResponse>(`/project/${projectId}/log/`, { params: query });
  return data;
}
