import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as reportsApi from '@/api/reports';

const LOG_REFETCH_INTERVAL = 5000;

export const reportKeys = {
  list: () => ['reports', 'list'] as const,
  detail: (reportId: number) => ['reports', 'detail', reportId] as const,
  fileList: (reportId: number) => ['reports', 'file-list', reportId] as const,
  log: (reportId: number) => ['reports', 'log', reportId] as const,
};

/** A report only ever exists once its calculation has finished (Success,
 *  Error, or Timeout) — no Pending state, so no need to poll for one. */
export function useReportList() {
  return useQuery({
    queryKey: reportKeys.list(),
    queryFn: () => reportsApi.getReportList(),
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

export function useReportLog(reportId: number) {
  return useQuery({
    queryKey: reportKeys.log(reportId),
    queryFn: () => reportsApi.getReportLog(reportId),
    enabled: Number.isFinite(reportId),
    refetchInterval: LOG_REFETCH_INTERVAL,
  });
}
