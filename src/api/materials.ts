import { apiClient } from './client';
import type {
  MaterialPayload,
  MaterialCreateResponse,
  Material,
  MaterialDetail,
  MaterialGeneralPayload,
  MaterialMechanicalPropertiesPayload,
  MaterialFatiguePropertiesPayload,
} from './types/materials';

export async function createMaterial(payload: MaterialPayload): Promise<MaterialCreateResponse> {
  const { data } = await apiClient.post<MaterialCreateResponse>('/material/', payload);
  return data;
}

export async function getMaterialList(): Promise<Material[]> {
  const { data } = await apiClient.get<Material[]>('/material/list/');
  return data;
}

export async function getMaterial(materialId: number): Promise<MaterialDetail> {
  const { data } = await apiClient.get<MaterialDetail>(`/material/${materialId}/`);
  return data;
}

export async function updateMaterial(materialId: number, payload: MaterialGeneralPayload): Promise<MaterialDetail> {
  const { data } = await apiClient.put<MaterialDetail>(`/material/${materialId}/`, payload);
  return data;
}

export async function deleteMaterial(materialId: number): Promise<void> {
  await apiClient.delete(`/material/${materialId}/`);
}

export async function updateMechanicalProperties(materialId: number, payload: MaterialMechanicalPropertiesPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/material/${materialId}/mechanical-properties/`, payload);
  return data;
}

export async function updateFatigueProperties(materialId: number, payload: MaterialFatiguePropertiesPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/material/${materialId}/fatigue-properties/`, payload);
  return data;
}

export interface MaterialExport {
  blob: Blob;
  filename: string;
}

export async function exportMaterial(materialId: number): Promise<MaterialExport> {
  const response = await apiClient.get(`/material/${materialId}/export/`, { responseType: 'blob' });
  // Match a bare `filename=` segment only — not RFC 5987's `filename*=`, which has a
  // different (encoded) value format and would otherwise get captured as garbage.
  const match = response.headers['content-disposition']
    ?.split(';')
    .map((part: string) => part.trim())
    .find((part: string) => /^filename=/.test(part));
  const filename = match?.slice('filename='.length).replace(/^"|"$/g, '');
  return { blob: response.data, filename: filename || `material-${materialId}.txt` };
}
