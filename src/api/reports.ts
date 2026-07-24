import { apiClient } from './client';
import type { Report, ReportFile } from './types/reports';

export async function getReportList(): Promise<Report[]> {
  const { data } = await apiClient.get<Report[]>('/report/list/');
  return data;
}

export async function getReport(reportId: number): Promise<Report> {
  const { data } = await apiClient.get<Report>(`/report/${reportId}/`);
  return data;
}

export async function deleteReport(reportId: number): Promise<void> {
  await apiClient.delete(`/report/${reportId}/`);
}

export async function exportReport(reportId: number): Promise<Blob> {
  const { data } = await apiClient.get(`/report/${reportId}/export/`, { responseType: 'blob' });
  return data;
}

export async function getReportFileList(reportId: number): Promise<ReportFile[]> {
  const { data } = await apiClient.get<ReportFile[]>(`/report/${reportId}/file/list/`);
  return data;
}
