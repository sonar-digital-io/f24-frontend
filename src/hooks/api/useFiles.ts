import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as filesApi from '@/api/files';
import type { FileUploadPayload, FileUpdatePayload } from '@/api/types/files';

export const fileKeys = {
  detail: (fileId: string) => ['files', 'detail', fileId] as const,
};

export function useUploadFile() {
  return useMutation({
    mutationFn: (payload: FileUploadPayload) => filesApi.uploadFile(payload),
  });
}

export function useFile() {
  return useMutation({
    mutationFn: (fileId: string) => filesApi.getFile(fileId),
  });
}

export function useUpdateFile(fileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FileUpdatePayload) => filesApi.updateFile(fileId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: fileKeys.detail(fileId) }),
  });
}

export function useDeleteFile() {
  return useMutation({
    mutationFn: (fileId: string) => filesApi.deleteFile(fileId),
  });
}
