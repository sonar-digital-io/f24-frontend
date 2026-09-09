import { useEffect, useRef } from 'react';
import { DialogHeader } from '@/components/common/dialog/DialogHeader';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useProjectLog } from '@/hooks/api/useProjects';

/** How close to the bottom (px) still counts as "at the bottom" for
 *  auto-scroll purposes — a exact-equality check would stop re-sticking
 *  after a 1px rounding wobble from the browser's own scroll math. */
const AUTO_SCROLL_THRESHOLD = 24;

interface CalculationLogDialogProps {
  projectId: string;
  projectName: string;
  /** Only a running calculation's log can still grow — a stopped/finished
   *  one's log is already final, so there's nothing to poll for. */
  isRunning: boolean;
  onClose: () => void;
}

const LEVEL_STYLES: Record<string, string> = {
  ERROR: 'text-[#f87171]',
  WARNING: 'text-[#facc15]',
  INFO: 'text-[#93c5fd]',
  DEBUG: 'text-[#9ca3af]',
};

/** Tails a calculation's server-side log — polled every 5s while open and
 *  running, same cadence as the list page itself, so the log keeps moving
 *  without the user having to reopen the dialog. A stopped/finished
 *  calculation's log is already final, so it's fetched once and left alone. */
export function CalculationLogDialog({ projectId, projectName, isRunning, onClose }: CalculationLogDialogProps) {
  useBodyScrollLock(true);
  useEscapeKey(onClose);
  const { data, isLoading, isError } = useProjectLog(projectId, {
    refetchInterval: isRunning ? 5000 : undefined,
  });
  const entries = data?.log ?? [];

  // Sticks to the bottom as new entries arrive (the actual "tailing" — see
  // the doc comment below) unless the user has scrolled up to read older
  // lines, in which case a poll landing mid-read won't yank the view away.
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < AUTO_SCROLL_THRESHOLD;
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="calculation-log-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[70vh] w-full max-w-[720px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
      >
        <DialogHeader title={`Logs — ${projectName}`} titleId="calculation-log-title" onClose={onClose} />
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto rounded-md bg-[#0a0a0a] p-3 font-mono text-[12px] leading-5"
        >
          {isLoading ? (
            <p className="text-[#9ca3af]">Loading logs…</p>
          ) : isError ? (
            <p className="text-[#f87171]">Failed to load logs.</p>
          ) : entries.length === 0 ? (
            <p className="text-[#9ca3af]">No log entries yet.</p>
          ) : (
            entries.map((entry, i) => (
              <div key={i} className="whitespace-pre-wrap text-[#e5e7eb]">
                <span className={LEVEL_STYLES[entry.level] ?? 'text-[#e5e7eb]'}>[{entry.level}]</span>{' '}
                <span className="text-[#6b7280]">
                  {entry.module}:{entry.line_number}
                </span>{' '}
                {entry.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
