import { LogDialog } from '@/components/common/dialog/LogDialog';
import { useReportLog } from '@/hooks/api/useReports';

interface ReportLogDialogProps {
  reportId: number;
  reportLabel: string;
  onClose: () => void;
}

/** A report's log is already final by the time it exists — no polling/tailing
 *  needed, unlike a still-running calculation's. */
export function ReportLogDialog({ reportId, reportLabel, onClose }: ReportLogDialogProps) {
  const { data, isLoading, isError } = useReportLog(reportId);

  return (
    <LogDialog
      title={`Logs — ${reportLabel}`}
      titleId="report-log-title"
      entries={data?.log ?? []}
      isLoading={isLoading}
      isError={isError}
      onClose={onClose}
    />
  );
}
