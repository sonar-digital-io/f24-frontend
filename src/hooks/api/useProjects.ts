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

/** Takes the project id per-call — see the composition/load/fatigue hooks below for why. */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...payload }: ProjectPayload & { projectId: string }) =>
      projectsApi.updateProject(projectId, payload),
    onSuccess: (_data, { projectId }) => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => projectsApi.deleteProject(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list() }),
  });
}

/** Takes the project id per-call — see the composition/load/fatigue hooks below for why. */
export function useUpdateProjectSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...payload }: ProjectSettingsPayload & { projectId: string }) =>
      projectsApi.updateProjectSettings(projectId, payload),
    onSuccess: (_data, { projectId }) => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

// The composition/load/fatigue/state associations can be set before a
// brand-new project has a real id yet (created on first selection) — so
// unlike the hooks above, these take the project id per-call (in variables)
// instead of binding it at hook-creation time, to avoid an id captured from
// a stale render.

export function useUpdateProjectComposition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...payload }: ProjectCompositionPayload & { projectId: string }) =>
      projectsApi.updateProjectComposition(projectId, payload),
    onSuccess: (_data, { projectId }) => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useUpdateProjectGeometry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...payload }: ProjectGeometryPayload & { projectId: string }) =>
      projectsApi.updateProjectGeometry(projectId, payload),
    onSuccess: (_data, { projectId }) => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useUpdateProjectLoad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...payload }: ProjectLoadPayload & { projectId: string }) =>
      projectsApi.updateProjectLoad(projectId, payload),
    onSuccess: (_data, { projectId }) => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useUpdateProjectFatigue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...payload }: ProjectFatiguePayload & { projectId: string }) =>
      projectsApi.updateProjectFatigue(projectId, payload),
    onSuccess: (_data, { projectId }) => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useProjectState(projectId: string) {
  return useQuery({
    queryKey: projectKeys.state(projectId),
    queryFn: () => projectsApi.getProjectState(projectId),
    enabled: Boolean(projectId),
  });
}

/** Takes the project id per-call — see the composition/load/fatigue hooks above for why. */
export function useUpdateProjectState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...payload }: ProjectStatePayload & { projectId: string }) =>
      projectsApi.updateProjectState(projectId, payload),
    onSuccess: (_data, { projectId }) => queryClient.invalidateQueries({ queryKey: projectKeys.state(projectId) }),
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
