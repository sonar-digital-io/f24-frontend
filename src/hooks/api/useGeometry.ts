import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as geometryApi from '@/api/geometry';
import type {
  GeometryPayload,
  GeometrySettingsPayload,
  GeometryEdgesWritePayload,
  GeometryProfile,
  GeometryProfilesWritePayload,
  GeometryProfilePreviewPayload,
  GeometryProfileQuery,
  ProfileGeneratorPayload,
} from '@/api/types/geometry';

export const geometryKeys = {
  list: () => ['geometry', 'list'] as const,
  detail: (geometryId: number) => ['geometry', 'detail', geometryId] as const,
  edges: (geometryId: number) => ['geometry', 'edges', geometryId] as const,
  edgesPreview: (geometryId: number, resolution: number) => ['geometry', 'edges-preview', geometryId, resolution] as const,
  profiles: (geometryId: number) => ['geometry', 'profiles', geometryId] as const,
  profile: (geometryId: number, profileId: number, query?: GeometryProfileQuery) =>
    ['geometry', 'profile', geometryId, profileId, query] as const,
  profilePreview: (geometryId: number, profile?: GeometryProfile) =>
    ['geometry', 'profile-preview', geometryId, profile?.id, profile?.position, profile?.type, JSON.stringify(profile?.parameters)] as const,
  topView: (geometryId: number) => ['geometry', 'top-view', geometryId] as const,
};

export function useGeometryList() {
  return useQuery({ queryKey: geometryKeys.list(), queryFn: () => geometryApi.getGeometryList() });
}

export function useGeometryDetail(geometryId: number) {
  return useQuery({
    queryKey: geometryKeys.detail(geometryId),
    queryFn: () => geometryApi.getGeometry(geometryId),
    enabled: Number.isFinite(geometryId),
    // Never show a stale cached copy when reopening the edit page right after a save.
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useCreateGeometry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeometryPayload) => geometryApi.createGeometry(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: geometryKeys.list() }),
  });
}

export function useUpdateGeometry(geometryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeometryPayload) => geometryApi.updateGeometry(geometryId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: geometryKeys.detail(geometryId) });
      queryClient.invalidateQueries({ queryKey: geometryKeys.list() });
    },
  });
}

export function useDeleteGeometry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (geometryId: number) => geometryApi.deleteGeometry(geometryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: geometryKeys.list() }),
  });
}

export function useUpdateGeometrySettings(geometryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeometrySettingsPayload) => geometryApi.updateGeometrySettings(geometryId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: geometryKeys.detail(geometryId) });
      queryClient.invalidateQueries({ queryKey: geometryKeys.list() });
    },
  });
}

export function useGeometryEdges(geometryId: number) {
  return useQuery({
    queryKey: geometryKeys.edges(geometryId),
    queryFn: () => geometryApi.getGeometryEdges(geometryId),
    enabled: Number.isFinite(geometryId),
  });
}

export function useUpdateGeometryEdges(geometryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeometryEdgesWritePayload) => geometryApi.updateGeometryEdges(geometryId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: geometryKeys.edges(geometryId) });
      queryClient.invalidateQueries({ queryKey: ['geometry', 'edges-preview', geometryId] });
    },
  });
}

export function useGeometryEdgesPreview(geometryId: number, resolution: number) {
  return useQuery({
    queryKey: geometryKeys.edgesPreview(geometryId, resolution),
    queryFn: () => geometryApi.getGeometryEdgesPreview(geometryId, resolution),
    enabled: Number.isFinite(geometryId),
  });
}

export function useGeometryProfiles(geometryId: number) {
  return useQuery({
    queryKey: geometryKeys.profiles(geometryId),
    queryFn: () => geometryApi.getGeometryProfiles(geometryId),
    enabled: Number.isFinite(geometryId),
  });
}

export function useUpdateGeometryProfiles(geometryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeometryProfilesWritePayload) => geometryApi.updateGeometryProfiles(geometryId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: geometryKeys.profiles(geometryId) });
      queryClient.invalidateQueries({ queryKey: ['geometry', 'profile', geometryId] });
    },
  });
}

export function usePreviewGeometryProfile() {
  return useMutation({
    mutationFn: ({ geometryId, payload }: { geometryId: number; payload: GeometryProfilePreviewPayload }) =>
      geometryApi.previewGeometryProfile(geometryId, payload),
  });
}

/**
 * Same underlying request as `useGeometryDetail`, but without its edit-page
 * tuning (staleTime 0 / refetchOnMount 'always') — used by grid-card
 * thumbnails so switching list/grid view doesn't re-fetch every remount.
 */
export function useGeometryDetailCached(geometryId: number) {
  return useQuery({
    queryKey: geometryKeys.detail(geometryId),
    queryFn: () => geometryApi.getGeometry(geometryId),
    enabled: Number.isFinite(geometryId),
  });
}

/**
 * Cached counterpart to `usePreviewGeometryProfile` — the profile-preview
 * outline for a fixed (geometryId, profile) pair never changes, so this is
 * safe to cache indefinitely instead of re-POSTing on every remount.
 */
export function useGeometryProfilePreview(geometryId: number, profile?: GeometryProfile) {
  return useQuery({
    queryKey: geometryKeys.profilePreview(geometryId, profile),
    queryFn: () =>
      geometryApi.previewGeometryProfile(geometryId, {
        position: profile!.position,
        type: profile!.type,
        parameters: profile!.parameters,
      }),
    enabled: Number.isFinite(geometryId) && !!profile,
    staleTime: Infinity,
  });
}

export function useGeometryProfile(geometryId: number, profileId: number, query?: GeometryProfileQuery) {
  return useQuery({
    queryKey: geometryKeys.profile(geometryId, profileId, query),
    queryFn: () => geometryApi.getGeometryProfile(geometryId, profileId, query),
    enabled: Number.isFinite(geometryId) && Number.isFinite(profileId),
  });
}

export function useGeometryResult() {
  return useMutation({
    mutationFn: (geometryId: number) => geometryApi.getGeometryResult(geometryId),
  });
}

export function useGeometryTopView(geometryId: number) {
  return useQuery({
    queryKey: geometryKeys.topView(geometryId),
    queryFn: () => geometryApi.getGeometryTopView(geometryId),
    enabled: Number.isFinite(geometryId),
  });
}

export function useFetchGeometryTopView() {
  return useMutation({
    mutationFn: (geometryId: number) => geometryApi.getGeometryTopView(geometryId),
  });
}

export function useRunProfileGenerator() {
  return useMutation({
    mutationFn: ({ geometryId, payload }: { geometryId: number; payload: ProfileGeneratorPayload }) =>
      geometryApi.runProfileGenerator(geometryId, payload),
  });
}

export function useUpdateProfileGenerator() {
  return useMutation({
    mutationFn: ({ geometryId, payload }: { geometryId: number; payload: ProfileGeneratorPayload }) =>
      geometryApi.updateProfileGenerator(geometryId, payload),
  });
}

export function useExportGeometry() {
  return useMutation({
    mutationFn: (geometryId: number) => geometryApi.exportGeometry(geometryId),
  });
}
