import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as projectsApi from '@/api/projects';
import type {
  ProjectPayload,
  ProjectSettingsPayload,
  ProjectCompositionPayload,
  ProjectGeometryPayload,
  ProjectLoadPayload,
  ProjectFatiguePayload,
  ProjectStatePayload,
  ProjectLogQuery,
} from '@/api/types/projects';

export const projectKeys = {
  list: () => ['projects', 'list'] as const,
  detail: (projectId: string) => ['projects', 'detail', projectId] as const,
  state: (projectId: string) => ['projects', 'state', projectId] as const,
  log: (projectId: string, query?: ProjectLogQuery) => ['projects', 'log', projectId, query] as const,
};

export function useProjectList() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => projectsApi.getProjectList(),
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => projectsApi.getProject(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectPayload) => projectsApi.createProject(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list() }),
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectPayload) => projectsApi.updateProject(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => projectsApi.deleteProject(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list() }),
  });
}

export function useUpdateProjectSettings(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectSettingsPayload) => projectsApi.updateProjectSettings(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useUpdateProjectComposition(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectCompositionPayload) => projectsApi.updateProjectComposition(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useUpdateProjectGeometry(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectGeometryPayload) => projectsApi.updateProjectGeometry(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useUpdateProjectLoad(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectLoadPayload) => projectsApi.updateProjectLoad(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useUpdateProjectFatigue(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectFatiguePayload) => projectsApi.updateProjectFatigue(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useProjectState(projectId: string) {
  return useQuery({
    queryKey: projectKeys.state(projectId),
    queryFn: () => projectsApi.getProjectState(projectId),
    enabled: Boolean(projectId),
  });
}

export function useUpdateProjectState(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectStatePayload) => projectsApi.updateProjectState(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.state(projectId) }),
  });
}

export function useExportProject() {
  return useMutation({
    mutationFn: (projectId: string) => projectsApi.exportProject(projectId),
  });
}

export function useProjectLog(projectId: string, query?: ProjectLogQuery) {
  return useQuery({
    queryKey: projectKeys.log(projectId, query),
    queryFn: () => projectsApi.getProjectLog(projectId, query),
    enabled: Boolean(projectId),
  });
}
