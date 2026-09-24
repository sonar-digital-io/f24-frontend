import { apiClient } from './client';
import type { Report, ReportExport, ReportFile, ReportListItem } from './types/reports';

export async function getReportList(): Promise<ReportListItem[]> {
  const { data } = await apiClient.get<ReportListItem[]>('/report/list/');
  return data;
}

export async function getReport(reportId: number): Promise<Report> {
  const { data } = await apiClient.get<Report>(`/report/${reportId}/`);
  return data;
}

export async function deleteReport(reportId: number): Promise<void> {
  await apiClient.delete(`/report/${reportId}/`);
}

export async function exportReport(reportId: number): Promise<ReportExport> {
  // 'arraybuffer' so getApiErrorMessage can decode a failed request's error body (see exportProject).
  const response = await apiClient.get(`/report/${reportId}/export/`, {
    responseType: 'arraybuffer',
  });
  const match = response.headers['content-disposition']
    ?.split(';')
    .map((part: string) => part.trim())
    .find((part: string) => /^filename=/.test(part));
  const filename = match?.slice('filename='.length).replace(/^"|"$/g, '');
  return { blob: new Blob([response.data]), filename: filename || `report-${reportId}.zip` };
}

export async function getReportFileList(reportId: number): Promise<ReportFile[]> {
  const { data } = await apiClient.get<ReportFile[]>(`/report/${reportId}/file/list/`);
  return data;
}
