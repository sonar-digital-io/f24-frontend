import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as compositionApi from '@/api/composition';
import type {
  Composition,
  CompositionPayload,
  CompositionSettingsPayload,
  CompositionGeometryPayload,
  CompositionLayupPayload,
  CompositionCoreMaterialPayload,
  CompositionMappingLongitudinalPayload,
} from '@/api/types/composition';

export const compositionKeys = {
  list: () => ['composition', 'list'] as const,
  detail: (compositionId: number) => ['composition', 'detail', compositionId] as const,
  intersections: (compositionId: number) => ['composition', 'intersections', compositionId] as const,
  preview: (compositionId: number) => ['composition', 'preview', compositionId] as const,
  mappingTransversal: (compositionId: number) => ['composition', 'mapping-transversal', compositionId] as const,
};

export function useCompositionList() {
  return useQuery({ queryKey: compositionKeys.list(), queryFn: () => compositionApi.getCompositionList() });
}

export function useCompositionDetail(compositionId: number) {
  return useQuery({
    queryKey: compositionKeys.detail(compositionId),
    queryFn: () => compositionApi.getComposition(compositionId),
    enabled: Number.isFinite(compositionId),
    // Never show a stale cached copy when reopening the edit page right after a save.
    staleTime: 0,
    refetchOnMount: 'always',
  });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) });
      queryClient.invalidateQueries({ queryKey: compositionKeys.list() });
    },
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

function invalidateCompositionDerivedQueries(queryClient: ReturnType<typeof useQueryClient>, compositionId: number) {
  queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) });
  queryClient.invalidateQueries({ queryKey: compositionKeys.intersections(compositionId) });
  queryClient.invalidateQueries({ queryKey: compositionKeys.preview(compositionId) });
  queryClient.invalidateQueries({ queryKey: compositionKeys.mappingTransversal(compositionId) });
}

export function useUpdateCompositionGeometry(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionGeometryPayload) => compositionApi.updateCompositionGeometry(compositionId, payload),
    // No detail/mapping-transversal invalidation — the geometry-select flow
    // already chains its own GET intersections / GET top-view calls, and
    // refetching composition detail or transversal-mapping here would be
    // redundant extra requests.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: compositionKeys.intersections(compositionId) });
      queryClient.invalidateQueries({ queryKey: compositionKeys.preview(compositionId) });
    },
  });
}

export function useUpdateCompositionLayup(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionLayupPayload) => compositionApi.updateCompositionLayup(compositionId, payload),
    // No refetches — but the response carries each layup's (possibly newly
    // assigned) backend id, so patch it straight into the cached composition
    // detail. That's what the Layup picker / Layup mapping tab read `layup`
    // ids from, so this keeps them correct without any extra network call.
    onSuccess: (data) => {
      queryClient.setQueryData(compositionKeys.detail(compositionId), (old: Composition | undefined) =>
        old ? { ...old, layups: data.layups } : old
      );
    },
  });
}

export function useUpdateCompositionMappingLongitudinal(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionMappingLongitudinalPayload) =>
      compositionApi.updateCompositionMappingLongitudinal(compositionId, payload),
    // No detail invalidation here — the save flow already chains its own
    // GET intersections / GET transversal-mapping calls; refetching detail
    // (GET /composition/:id/) too would be a redundant extra request.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: compositionKeys.intersections(compositionId) });
      queryClient.invalidateQueries({ queryKey: compositionKeys.preview(compositionId) });
      queryClient.invalidateQueries({ queryKey: compositionKeys.mappingTransversal(compositionId) });
    },
  });
}

export function useUpdateCompositionMappingTransversal(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => compositionApi.updateCompositionMappingTransversal(compositionId, payload),
    onSuccess: () => invalidateCompositionDerivedQueries(queryClient, compositionId),
  });
}

export function useFetchCompositionMappingTransversal() {
  return useMutation({
    mutationFn: (compositionId: number) => compositionApi.getCompositionMappingTransversal(compositionId),
  });
}

/** Per-profile transversal mapping table — what actually drives the
 *  Cross-section view dialog's ring segments and table. */
export function useCompositionMappingTransversal(compositionId: number) {
  return useQuery({
    queryKey: compositionKeys.mappingTransversal(compositionId),
    queryFn: () => compositionApi.getCompositionMappingTransversal(compositionId),
    enabled: Number.isFinite(compositionId),
  });
}

export function useCompositionIntersections(compositionId: number) {
  return useQuery({
    queryKey: compositionKeys.intersections(compositionId),
    queryFn: () => compositionApi.getCompositionIntersections(compositionId),
    enabled: Number.isFinite(compositionId),
  });
}

export function useFetchCompositionIntersections() {
  return useMutation({
    mutationFn: (compositionId: number) => compositionApi.getCompositionIntersections(compositionId),
  });
}

export function useUpdateCompositionCoreMaterial(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionCoreMaterialPayload) => compositionApi.updateCompositionCoreMaterial(compositionId, payload),
    onSuccess: () => invalidateCompositionDerivedQueries(queryClient, compositionId),
  });
}

export function useCompositionPreview(compositionId: number) {
  return useQuery({
    queryKey: compositionKeys.preview(compositionId),
    queryFn: () => compositionApi.getCompositionPreview(compositionId),
    enabled: Number.isFinite(compositionId),
  });
}
