import { apiClient } from './client';
import type {
  GeometryPayload,
  GeometryCreateResponse,
  Geometry,
  GeometryDetail,
  GeometrySettingsPayload,
  GeometryEdgesPayload,
  GeometryEdgesWritePayload,
  GeometryProfilesPayload,
  GeometryProfilesWritePayload,
  GeometryProfilePreviewPayload,
  GeometryProfileQuery,
  GeometrySparsPayload,
  GeometryTopView,
  ProfileGeneratorPayload,
  ProfileGeneratorResponse,
} from './types/geometry';

export async function createGeometry(payload: GeometryPayload): Promise<GeometryCreateResponse> {
  const { data } = await apiClient.post<GeometryCreateResponse>('/geometry/', payload);
  return data;
}

export async function getGeometryList(): Promise<Geometry[]> {
  const { data } = await apiClient.get<Geometry[]>('/geometry/list/');
  return data;
}

export async function getGeometry(geometryId: number): Promise<GeometryDetail> {
  const { data } = await apiClient.get<GeometryDetail>(`/geometry/${geometryId}/`);
  return data;
}

export async function updateGeometry(geometryId: number, payload: GeometryPayload): Promise<Geometry> {
  const { data } = await apiClient.put<Geometry>(`/geometry/${geometryId}/`, payload);
  return data;
}

export async function deleteGeometry(geometryId: number): Promise<void> {
  await apiClient.delete(`/geometry/${geometryId}/`);
}

export async function updateGeometrySettings(geometryId: number, payload: GeometrySettingsPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/geometry/${geometryId}/settings/`, payload);
  return data;
}

export async function getGeometryEdges(geometryId: number): Promise<GeometryEdgesPayload> {
  const { data } = await apiClient.get<GeometryEdgesPayload>(`/geometry/${geometryId}/edges/`);
  return data;
}

export async function updateGeometryEdges(geometryId: number, payload: GeometryEdgesWritePayload): Promise<GeometryEdgesPayload> {
  const { data } = await apiClient.put<GeometryEdgesPayload>(`/geometry/${geometryId}/edges/`, payload);
  return data;
}

export async function getGeometryEdgesPreview(geometryId: number, resolution: number): Promise<Blob> {
  const { data } = await apiClient.get(`/geometry/${geometryId}/edges/preview/`, {
    params: { resolution },
    responseType: 'blob',
  });
  return data;
}

export async function getGeometryProfiles(geometryId: number): Promise<GeometryProfilesPayload> {
  const { data } = await apiClient.get<GeometryProfilesPayload>(`/geometry/${geometryId}/profiles/`);
  return data;
}

export async function updateGeometryProfiles(geometryId: number, payload: GeometryProfilesWritePayload): Promise<GeometryProfilesPayload> {
  const { data } = await apiClient.put<GeometryProfilesPayload>(`/geometry/${geometryId}/profiles/`, payload);
  return data;
}

export async function previewGeometryProfile(geometryId: number, payload: GeometryProfilePreviewPayload): Promise<number[][]> {
  const { data } = await apiClient.post<number[][]>(`/geometry/${geometryId}/profiles/preview/`, payload);
  return data;
}

export async function getGeometryProfile(geometryId: number, profileId: number, query?: GeometryProfileQuery): Promise<number[][]> {
  const { data } = await apiClient.get<number[][]>(`/geometry/${geometryId}/profiles/${profileId}/`, { params: query });
  return data;
}

export async function getGeometryResult(geometryId: number): Promise<Blob> {
  const { data } = await apiClient.get(`/geometry/${geometryId}/result/`, { responseType: 'blob' });
  return data;
}

export async function getGeometrySpars(geometryId: number): Promise<GeometrySparsPayload> {
  const { data } = await apiClient.get<GeometrySparsPayload>(`/geometry/${geometryId}/spars/`);
  return data;
}

export async function updateGeometrySpars(geometryId: number, payload: GeometrySparsPayload): Promise<GeometrySparsPayload> {
  const { data } = await apiClient.put<GeometrySparsPayload>(`/geometry/${geometryId}/spars/`, payload);
  return data;
}

export async function getGeometrySparsPreview(geometryId: number): Promise<Blob> {
  const { data } = await apiClient.get(`/geometry/${geometryId}/spars/preview/`, { responseType: 'blob' });
  return data;
}

export async function getGeometryTopView(geometryId: number): Promise<GeometryTopView> {
  const { data } = await apiClient.get<GeometryTopView>(`/geometry/${geometryId}/top-view/`);
  return data;
}

export async function runProfileGenerator(geometryId: number, payload: ProfileGeneratorPayload): Promise<ProfileGeneratorResponse> {
  const { data } = await apiClient.post<ProfileGeneratorResponse>(`/geometry/${geometryId}/tools/profile-generator/`, payload);
  return data;
}

export async function updateProfileGenerator(geometryId: number, payload: ProfileGeneratorPayload): Promise<ProfileGeneratorResponse> {
  const { data } = await apiClient.put<ProfileGeneratorResponse>(`/geometry/${geometryId}/tools/profile-generator/`, payload);
  return data;
}

export async function exportGeometry(geometryId: number): Promise<Blob> {
  const { data } = await apiClient.get(`/geometry/${geometryId}/export/`, { responseType: 'blob' });
  return data;
}
