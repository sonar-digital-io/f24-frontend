import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as reportsApi from '@/api/reports';

const PENDING_REFETCH_INTERVAL = 5000;

export const reportKeys = {
  list: () => ['reports', 'list'] as const,
  detail: (reportId: number) => ['reports', 'detail', reportId] as const,
  fileList: (reportId: number) => ['reports', 'file-list', reportId] as const,
};

/** Polls while any report is still Pending, so its result updates without a reload. */
export function useReportList() {
  return useQuery({
    queryKey: reportKeys.list(),
    queryFn: () => reportsApi.getReportList(),
    refetchInterval: (query) =>
      query.state.data?.some((r) => r.result === 'Pending') ? PENDING_REFETCH_INTERVAL : false,
  });
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
