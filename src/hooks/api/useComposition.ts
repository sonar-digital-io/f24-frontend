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
  CompositionMappingTransversalWritePayload,
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
  // No invalidation here — this fires on every autosave of the Layup mapping
  // tab, which must only PUT this one endpoint. Intersections/transversal-
  // mapping/preview are refreshed on their own, explicit schedule instead:
  // ensureTransversalMappingReady (in CompositionNew) re-fetches them exactly
  // once, only when the user actually switches into the Transversal mapping
  // tab, and the Preview tab's own query always refetches fresh on mount
  // (staleTime: 0) regardless.
  return useMutation({
    mutationFn: (payload: CompositionMappingLongitudinalPayload) =>
      compositionApi.updateCompositionMappingLongitudinal(compositionId, payload),
  });
}

export function useUpdateCompositionMappingTransversal(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionMappingTransversalWritePayload) =>
      compositionApi.updateCompositionMappingTransversal(compositionId, payload),
    // Write the response straight into the cache instead of invalidating —
    // the mutation's response is the same shape as the GET, so this reflects
    // the save immediately (e.g. new ring lines) without an extra refetch.
    onSuccess: (data) => {
      queryClient.setQueryData(compositionKeys.mappingTransversal(compositionId), data);
    },
  });
}

/** Same GET as `useCompositionMappingTransversal`, but as a mutation the caller can
 *  `await` (e.g. right before switching into the tab that query lazily `enable`s).
 *  Routed through `queryClient.fetchQuery` on the *same* query key rather than
 *  calling the API directly — React Query dedupes a fetch already in flight for
 *  that key, so this doesn't fire a second, redundant request alongside the
 *  `useQuery` that mounts (and fires its own fetch) in the same tab-switch.
 *  `staleTime: 0` overrides the global 60s default (queryClient.ts) for this
 *  call specifically — callers of this mutation want a guaranteed-fresh fetch
 *  (e.g. right after an autosave), not cached data from up to a minute ago;
 *  dedup against a genuinely concurrent fetch still applies regardless, since
 *  that's based on an in-flight request, not on staleness. */
export function useFetchCompositionMappingTransversal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (compositionId: number) =>
      queryClient.fetchQuery({
        queryKey: compositionKeys.mappingTransversal(compositionId),
        queryFn: () => compositionApi.getCompositionMappingTransversal(compositionId),
        staleTime: 0,
      }),
  });
}

/** Per-profile transversal mapping table — what actually drives the
 *  Cross-section view dialog's ring segments and table. `enabled` additionally
 *  gates this — TransversalMappingSection stays mounted (hidden) across tab
 *  switches, so without it this would fetch as soon as the composition opens
 *  instead of only once the Transversal mapping tab is actually visited. */
export function useCompositionMappingTransversal(compositionId: number, enabled = true) {
  return useQuery({
    queryKey: compositionKeys.mappingTransversal(compositionId),
    queryFn: () => compositionApi.getCompositionMappingTransversal(compositionId),
    enabled: Number.isFinite(compositionId) && enabled,
  });
}

export function useCompositionIntersections(compositionId: number, enabled = true) {
  return useQuery({
    queryKey: compositionKeys.intersections(compositionId),
    queryFn: () => compositionApi.getCompositionIntersections(compositionId),
    enabled: Number.isFinite(compositionId) && enabled,
  });
}

/** Same GET as `useCompositionIntersections` — see
 *  `useFetchCompositionMappingTransversal`'s doc comment for why this goes
 *  through `queryClient.fetchQuery` on the same query key instead of calling
 *  the API directly. Without the dedup, this endpoint being called twice on
 *  one tab switch (once here, once by the `useQuery`) duplicated every
 *  intersection row server-side — the backend inserts fresh rows on each
 *  call rather than replacing them. */
export function useFetchCompositionIntersections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (compositionId: number) =>
      queryClient.fetchQuery({
        queryKey: compositionKeys.intersections(compositionId),
        queryFn: () => compositionApi.getCompositionIntersections(compositionId),
        staleTime: 0,
      }),
  });
}

export function useUpdateCompositionCoreMaterial(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionCoreMaterialPayload) => compositionApi.updateCompositionCoreMaterial(compositionId, payload),
    onSuccess: () => invalidateCompositionDerivedQueries(queryClient, compositionId),
  });
}

export function useCompositionPreview(compositionId: number, enabled: boolean) {
  return useQuery({
    queryKey: compositionKeys.preview(compositionId),
    queryFn: () => compositionApi.getCompositionPreview(compositionId),
    enabled: enabled && Number.isFinite(compositionId),
    staleTime: 0,
  });
}
