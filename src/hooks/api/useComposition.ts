import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as compositionApi from '@/api/composition';
import type {
  CompositionPayload,
  CompositionSettingsPayload,
  CompositionGeometryPayload,
  CompositionLayupPayload,
  CompositionCoreMaterialPayload,
} from '@/api/types/composition';

export const compositionKeys = {
  list: () => ['composition', 'list'] as const,
  detail: (compositionId: number) => ['composition', 'detail', compositionId] as const,
  intersections: (compositionId: number) => ['composition', 'intersections', compositionId] as const,
  preview: (compositionId: number) => ['composition', 'preview', compositionId] as const,
};

export function useCompositionList() {
  return useQuery({ queryKey: compositionKeys.list(), queryFn: () => compositionApi.getCompositionList() });
}

export function useCompositionDetail(compositionId: number) {
  return useQuery({ queryKey: compositionKeys.detail(compositionId), queryFn: () => compositionApi.getComposition(compositionId) });
}

export function useCreateComposition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionPayload) => compositionApi.createComposition(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.list() }),
  });
}

export function useUpdateComposition(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionPayload) => compositionApi.updateComposition(compositionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) }),
  });
}

export function useDeleteComposition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (compositionId: number) => compositionApi.deleteComposition(compositionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.list() }),
  });
}

export function useUpdateCompositionSettings(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionSettingsPayload) => compositionApi.updateCompositionSettings(compositionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) }),
  });
}

export function useUpdateCompositionGeometry(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionGeometryPayload) => compositionApi.updateCompositionGeometry(compositionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) }),
  });
}

export function useUpdateCompositionLayup(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionLayupPayload) => compositionApi.updateCompositionLayup(compositionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) }),
  });
}

export function useUpdateCompositionMappingLongitudinal(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => compositionApi.updateCompositionMappingLongitudinal(compositionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) }),
  });
}

export function useUpdateCompositionMappingTransversal(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => compositionApi.updateCompositionMappingTransversal(compositionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) }),
  });
}

export function useCompositionIntersections(compositionId: number) {
  return useQuery({
    queryKey: compositionKeys.intersections(compositionId),
    queryFn: () => compositionApi.getCompositionIntersections(compositionId),
  });
}

export function useUpdateCompositionCoreMaterial(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionCoreMaterialPayload) => compositionApi.updateCompositionCoreMaterial(compositionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) }),
  });
}

export function useCompositionPreview(compositionId: number) {
  return useQuery({ queryKey: compositionKeys.preview(compositionId), queryFn: () => compositionApi.getCompositionPreview(compositionId) });
}
