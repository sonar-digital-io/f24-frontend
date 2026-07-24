import { apiClient } from './client';
import type {
  RemoteAdapterTask,
  RemoteAdapterStartPayload,
  RemoteAdapterStopPayload,
  RemoteAdapterDownloadQuery,
  RemoteAdapterUploadMetadata,
  RemoteAdapterLogPayload,
} from './types/remoteAdapter';

export async function getRemoteAdapterList(): Promise<RemoteAdapterTask[]> {
  const { data } = await apiClient.get<RemoteAdapterTask[]>('/remote-adapter/list/');
  return data;
}

export async function startRemoteAdapterTask(taskId: string, payload: RemoteAdapterStartPayload): Promise<unknown> {
  const { data } = await apiClient.post(`/remote-adapter/${taskId}/start/`, payload);
  return data;
}

export async function stopRemoteAdapterTask(taskId: string, payload: RemoteAdapterStopPayload): Promise<unknown> {
  const { data } = await apiClient.post(`/remote-adapter/${taskId}/stop/`, payload);
  return data;
}

export async function downloadRemoteAdapterChunk(taskId: string, query: RemoteAdapterDownloadQuery): Promise<Blob> {
  const { data } = await apiClient.get(`/remote-adapter/${taskId}/download/`, {
    params: query,
    responseType: 'blob',
  });
  return data;
}

export async function uploadRemoteAdapterChunk(taskId: string, file: File, metadata: RemoteAdapterUploadMetadata): Promise<unknown> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('metadata', JSON.stringify(metadata));
  const { data } = await apiClient.post(`/remote-adapter/${taskId}/upload/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function logRemoteAdapterEvent(taskId: string, payload: RemoteAdapterLogPayload): Promise<unknown> {
  const { data } = await apiClient.post(`/remote-adapter/${taskId}/log/`, payload);
  return data;
}
