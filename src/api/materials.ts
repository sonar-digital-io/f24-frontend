import { apiClient } from './client';
import type {
  MaterialPayload,
  MaterialCreateResponse,
  Material,
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

export async function getMaterial(materialId: number): Promise<Material> {
  const { data } = await apiClient.get<Material>(`/material/${materialId}/`);
  return data;
}

export async function updateMaterial(materialId: number, payload: MaterialPayload): Promise<Material> {
  const { data } = await apiClient.put<Material>(`/material/${materialId}/`, payload);
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

export async function exportMaterial(materialId: number): Promise<Blob> {
  const { data } = await apiClient.get(`/material/${materialId}/export/`, { responseType: 'blob' });
  return data;
}
