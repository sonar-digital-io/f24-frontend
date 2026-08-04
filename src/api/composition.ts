import { apiClient } from './client';
import type {
  CompositionPayload,
  Composition,
  CompositionSettingsPayload,
  CompositionGeometryPayload,
  CompositionLayupPayload,
  CompositionCoreMaterialPayload,
  CompositionMappingLongitudinalPayload,
  CompositionMappingTransversalResponse,
  CompositionProfileIntersections,
  CompositionLayupSaveResponse,
} from './types/composition';

export async function createComposition(payload: CompositionPayload): Promise<Composition> {
  const { data } = await apiClient.post<Composition>('/composition/', payload);
  return data;
}

export async function getCompositionList(): Promise<Composition[]> {
  const { data } = await apiClient.get<Composition[]>('/composition/list/');
  return data;
}

export async function getComposition(compositionId: number): Promise<Composition> {
  const { data } = await apiClient.get<Composition>(`/composition/${compositionId}/`);
  return data;
}

export async function updateComposition(compositionId: number, payload: CompositionPayload): Promise<Composition> {
  const { data } = await apiClient.put<Composition>(`/composition/${compositionId}/`, payload);
  return data;
}

export async function deleteComposition(compositionId: number): Promise<void> {
  await apiClient.delete(`/composition/${compositionId}/`);
}

export async function updateCompositionSettings(compositionId: number, payload: CompositionSettingsPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/composition/${compositionId}/settings/`, payload);
  return data;
}

export async function updateCompositionGeometry(compositionId: number, payload: CompositionGeometryPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/composition/${compositionId}/geometry/`, payload);
  return data;
}

export async function updateCompositionLayup(compositionId: number, payload: CompositionLayupPayload): Promise<CompositionLayupSaveResponse> {
  const { data } = await apiClient.put<CompositionLayupSaveResponse>(`/composition/${compositionId}/layup/`, payload);
  return data;
}

export async function updateCompositionMappingLongitudinal(compositionId: number, payload: CompositionMappingLongitudinalPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/composition/${compositionId}/mapping/longitudinal/`, payload);
  return data;
}

export async function updateCompositionMappingTransversal(compositionId: number, payload: unknown): Promise<unknown> {
  const { data } = await apiClient.put(`/composition/${compositionId}/mapping/transversal/`, payload);
  return data;
}

export async function getCompositionMappingTransversal(compositionId: number): Promise<CompositionMappingTransversalResponse> {
  const { data } = await apiClient.get<CompositionMappingTransversalResponse>(`/composition/${compositionId}/mapping/transversal/`);
  return data;
}

export async function getCompositionIntersections(compositionId: number): Promise<CompositionProfileIntersections[]> {
  const { data } = await apiClient.get<CompositionProfileIntersections[]>(`/composition/${compositionId}/intersections/`);
  return data;
}

export async function updateCompositionCoreMaterial(compositionId: number, payload: CompositionCoreMaterialPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/composition/${compositionId}/core-material/`, payload);
  return data;
}

// Same binary contract as GET /geometry/:id/result/ — a zip-based 3MF
// package in practice, unitless (vertices are fractions of the linked
// geometry's nominal_radius). See OccViewer.tsx's header comment.
export async function getCompositionPreview(compositionId: number): Promise<ArrayBuffer> {
  const { data } = await apiClient.get<ArrayBuffer>(`/composition/${compositionId}/preview/`, {
    responseType: 'arraybuffer',
    timeout: 120_000,
  });
  return data;
}
