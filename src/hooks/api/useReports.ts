import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as reportsApi from '@/api/reports';

export const reportKeys = {
  list: () => ['reports', 'list'] as const,
  detail: (reportId: number) => ['reports', 'detail', reportId] as const,
  fileList: (reportId: number) => ['reports', 'file-list', reportId] as const,
};

export function useReportList() {
  return useQuery({ queryKey: reportKeys.list(), queryFn: () => reportsApi.getReportList() });
}

export function useReportDetail(reportId: number) {
  return useQuery({
    queryKey: reportKeys.detail(reportId),
    queryFn: () => reportsApi.getReport(reportId),
    enabled: Number.isFinite(reportId),
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: number) => reportsApi.deleteReport(reportId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.list() }),
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: (reportId: number) => reportsApi.exportReport(reportId),
  });
}

export function useReportFileList(reportId: number) {
  return useQuery({
    queryKey: reportKeys.fileList(reportId),
    queryFn: () => reportsApi.getReportFileList(reportId),
    enabled: Number.isFinite(reportId),
  });
}
