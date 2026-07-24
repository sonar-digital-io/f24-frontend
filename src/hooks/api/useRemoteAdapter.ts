import { useQuery, useMutation } from '@tanstack/react-query';
import * as remoteAdapterApi from '@/api/remoteAdapter';
import type {
  RemoteAdapterStartPayload,
  RemoteAdapterStopPayload,
  RemoteAdapterDownloadQuery,
  RemoteAdapterUploadMetadata,
  RemoteAdapterLogPayload,
} from '@/api/types/remoteAdapter';

export const remoteAdapterKeys = {
  list: () => ['remote-adapter', 'list'] as const,
};

export function useRemoteAdapterList() {
  return useQuery({ queryKey: remoteAdapterKeys.list(), queryFn: () => remoteAdapterApi.getRemoteAdapterList() });
}

export function useStartRemoteAdapterTask() {
  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: RemoteAdapterStartPayload }) =>
      remoteAdapterApi.startRemoteAdapterTask(taskId, payload),
  });
}

export function useStopRemoteAdapterTask() {
  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: RemoteAdapterStopPayload }) =>
      remoteAdapterApi.stopRemoteAdapterTask(taskId, payload),
  });
}

export function useDownloadRemoteAdapterChunk() {
  return useMutation({
    mutationFn: ({ taskId, query }: { taskId: string; query: RemoteAdapterDownloadQuery }) =>
      remoteAdapterApi.downloadRemoteAdapterChunk(taskId, query),
  });
}

export function useUploadRemoteAdapterChunk() {
  return useMutation({
    mutationFn: ({ taskId, file, metadata }: { taskId: string; file: File; metadata: RemoteAdapterUploadMetadata }) =>
      remoteAdapterApi.uploadRemoteAdapterChunk(taskId, file, metadata),
  });
}

export function useLogRemoteAdapterEvent() {
  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: RemoteAdapterLogPayload }) =>
      remoteAdapterApi.logRemoteAdapterEvent(taskId, payload),
  });
}
