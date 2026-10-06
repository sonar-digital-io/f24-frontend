import type { ProjectLogEntry } from './projects';

/** `Result` choices of the backend ReportModel. */
export type ReportResult = 'Success' | 'Error' | 'Timeout';

/** One row of `GET /report/list/` (ReportListSerializer). */
export interface ReportListItem {
  id: number;
  created_at: string;
  result: ReportResult;
  /** Project name — null once the project has been deleted (FK is SET_NULL). */
  project: string | null;
}

export interface Report {
  id: number;
  [key: string]: unknown;
}

export interface ReportFile {
  id: string;
  [key: string]: unknown;
}

export interface ReportExport {
  blob: Blob;
  filename: string;
}

/** Same shape as a calculation's own log (ProjectLogEntry) — the backend's
 *  logging format is shared across both. */
export type ReportLogEntry = ProjectLogEntry;
export interface ReportLogResponse {
  log: ProjectLogEntry[];
}
