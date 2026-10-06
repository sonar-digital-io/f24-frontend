import { LogDialog } from '@/components/common/dialog/LogDialog';
import { useProjectLog } from '@/hooks/api/useProjects';

interface CalculationLogDialogProps {
  projectId: string;
  projectName: string;
  /** Only a running calculation's log can still grow — a stopped/finished
   *  one's log is already final, so there's nothing to poll for. */
  isRunning: boolean;
  onClose: () => void;
}

/** Tails a calculation's server-side log — polled every 5s while open and
 *  running, same cadence as the list page itself, so the log keeps moving
 *  without the user having to reopen the dialog. A stopped/finished
 *  calculation's log is already final, so it's fetched once and left alone. */
export function CalculationLogDialog({ projectId, projectName, isRunning, onClose }: CalculationLogDialogProps) {
  const { data, isLoading, isError } = useProjectLog(projectId, {
    refetchInterval: isRunning ? 5000 : undefined,
  });

  return (
    <LogDialog
      title={`Logs — ${projectName}`}
      titleId="calculation-log-title"
      entries={data?.log ?? []}
      isLoading={isLoading}
      isError={isError}
      onClose={onClose}
    />
  );
}
