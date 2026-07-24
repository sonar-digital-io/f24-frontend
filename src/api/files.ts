import { apiClient } from './client';
import type { FileUploadPayload, FileUploadResponse, FileRecord, FileUpdatePayload } from './types/files';

export async function uploadFile(payload: FileUploadPayload): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.name) formData.append('name', payload.name);
  if (payload.description) formData.append('description', payload.description);
  const { data } = await apiClient.post<FileUploadResponse>('/file/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getFile(fileId: string): Promise<Blob> {
  const { data } = await apiClient.get(`/file/${fileId}/`, { responseType: 'blob' });
  return data;
}

export async function updateFile(fileId: string, payload: FileUpdatePayload): Promise<FileRecord> {
  const { data } = await apiClient.put<FileRecord>(`/file/${fileId}/`, payload);
  return data;
}

export async function deleteFile(fileId: string): Promise<void> {
  await apiClient.delete(`/file/${fileId}/`);
}
