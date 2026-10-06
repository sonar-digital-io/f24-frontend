import { useEffect, useRef, useState } from 'react';
import { DialogHeader } from '@/components/common/dialog/DialogHeader';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

/** Log entry shape shared by every backend log endpoint (project/calculation,
 *  report) — see e.g. ProjectLogEntry/ReportLogEntry, kept as separate
 *  per-domain type aliases of this same shape. The non-minimal fields are
 *  optional here so a caller with a leaner log source still satisfies this
 *  type — Detailed mode just has less to show for it (see buildDetailLine). */
export interface LogEntry {
  level: string;
  message: string;
  module: string;
  line_number: number;
  logger?: string;
  function_name?: string;
  created?: string;
  process?: number;
  thread?: number;
}

type Verbosity = 'minimal' | 'detailed';

/** Every field Detailed mode can show, beyond what Minimal already shows
 *  (level + created + message) — omits whatever the entry doesn't have
 *  instead of printing an empty placeholder for it. */
function buildDetailLine(entry: LogEntry): string {
  const parts: string[] = [];
  if (entry.logger) parts.push(`logger=${entry.logger}`);
  parts.push(`${entry.module}.${entry.function_name ?? '?'}:${entry.line_number}`);
  if (entry.process != null) parts.push(`pid=${entry.process}`);
  if (entry.thread != null) parts.push(`tid=${entry.thread}`);
  return parts.join('  ');
}

/** How close to the bottom (px) still counts as "at the bottom" for
 *  auto-scroll purposes — an exact-equality check would stop re-sticking
 *  after a 1px rounding wobble from the browser's own scroll math. */
const AUTO_SCROLL_THRESHOLD = 24;

const LEVEL_STYLES: Record<string, string> = {
  ERROR: 'text-[#f87171]',
  WARNING: 'text-[#facc15]',
  INFO: 'text-[#93c5fd]',
  DEBUG: 'text-[#9ca3af]',
};

interface LogDialogProps {
  title: string;
  titleId: string;
  entries: LogEntry[];
  isLoading: boolean;
  isError: boolean;
  errorLabel?: string;
  emptyLabel?: string;
  onClose: () => void;
}

/** Terminal-styled log viewer shared by every "Show logs" entry point
 *  (calculation, report — same backend log format). Sticks to the bottom as
 *  new entries arrive (e.g. a polled, still-running calculation) unless the
 *  user has scrolled up to read older lines; harmless no-op for a log that
 *  never grows, like a finished report's. */
export function LogDialog({
  title,
  titleId,
  entries,
  isLoading,
  isError,
  errorLabel = 'Failed to load logs.',
  emptyLabel = 'No log entries yet.',
  onClose,
}: LogDialogProps) {
  useBodyScrollLock(true);
  useEscapeKey(onClose);

  const [verbosity, setVerbosity] = useState<Verbosity>('minimal');
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
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[70vh] w-full max-w-[720px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
      >
        <DialogHeader title={title} titleId={titleId} onClose={onClose} />
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto rounded-md bg-[#0a0a0a] p-3 font-mono text-[12px] leading-5"
        >
          {isLoading ? (
            <p className="text-[#9ca3af]">Loading logs…</p>
          ) : isError ? (
            <p className="text-[#f87171]">{errorLabel}</p>
          ) : entries.length === 0 ? (
            <p className="text-[#9ca3af]">{emptyLabel}</p>
          ) : (
            entries.map((entry, i) => {
              const detailLine = verbosity === 'detailed' ? buildDetailLine(entry) : '';
              return (
                <div key={i} className="whitespace-pre-wrap text-[#e5e7eb]">
                  <span className={LEVEL_STYLES[entry.level] ?? 'text-[#e5e7eb]'}>[{entry.level}]</span>{' '}
                  {entry.created && <span className="text-[#6b7280]">{entry.created}</span>}{' '}
                  {entry.message}
                  {detailLine && <div className="text-[#6b7280]">{detailLine}</div>}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end">
          <div className="inline-flex overflow-hidden rounded-md border border-[#e5e7eb]">
            {(['minimal', 'detailed'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVerbosity(v)}
                aria-pressed={verbosity === v}
                className={cn(
                  'h-8 px-3 text-[12px] font-medium capitalize',
                  verbosity === v
                    ? 'bg-[#006496] text-white'
                    : 'bg-white text-[#6b7280] hover:bg-[#f1f5f9]',
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
