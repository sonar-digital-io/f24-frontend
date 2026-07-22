import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react';
import { BladeThumbnail } from '@/components/common/BladeThumbnail';
import { rowInteractionProps } from '@/components/common/ListTable';
import { type Calculation, type CalculationStatus } from '@/data/calculations';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<CalculationStatus, string> = {
  Draft: 'bg-[#f3f4f6] text-[#374151]',
  Running: 'bg-[#dbeafe] text-[#1e40af]',
  Finished: 'bg-[#dcfce7] text-[#166534]',
  Failed: 'bg-[#fee2e2] text-[#991b1b]',
  Stopped: 'bg-[#fef9c3] text-[#854d0e]',
};

function RunningBadge({ startedAt }: { startedAt: string }) {
  const elapsed = () => {
    const start = new Date(startedAt.replace(' ', 'T'));
    const diff = Math.max(0, Date.now() - start.getTime());
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  const [time, setTime] = useState(elapsed);

  useEffect(() => {
    const id = setInterval(() => setTime(elapsed()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#dbeafe] px-2.5 py-0.5 text-[12px] font-medium text-[#1e40af]">
      <Clock className="h-3 w-3 animate-spin" style={{ animationDuration: '2s' }} />
      Running · {time}
    </span>
  );
}

function StatusBadge({ status, timestamp }: { status: CalculationStatus; timestamp: string }) {
  if (status === 'Running') return <RunningBadge startedAt={timestamp} />;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

// ─── Detail grid ──────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 py-[5px]">
      <span className="w-[140px] shrink-0 text-[14px] leading-5 text-[#6b7280]">{label}</span>
      <span className="text-[14px] font-semibold leading-5 text-[#0a0a0a]">{value}</span>
    </div>
  );
}

function CalculationDetailGrid({ details }: { details: Calculation['details'] }) {
  return (
    <div className="flex flex-col">
      <DetailRow label="Created at" value={details.createdAt} />
      <DetailRow label="Created by" value={details.createdBy} />
      <DetailRow label="Composition" value={details.composition} />
      <DetailRow label="Load group" value={details.loadGroup} />
      <DetailRow label="Analysis method" value={details.analysisMethod} />
    </div>
  );
}

// ─── Row actions ──────────────────────────────────────────────────────────────

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group/tip relative">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[11px] leading-none text-white opacity-0 shadow-sm transition-opacity group-hover/tip:opacity-100">
        {label}
      </span>
    </div>
  );
}

function IconBtn({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={(e) => { e.stopPropagation(); onClick(e); }}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </button>
    </Tip>
  );
}

function MoreMenu({ itemId: _itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || dropRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 4, left: r.right + window.scrollX - 160 });
    }
    setOpen((o) => !o);
  }

  const items = [
    { label: 'Duplicate', icon: Copy, danger: false },
    { label: 'Export', icon: Download, danger: false },
    { label: 'Delete', icon: Trash2, danger: true },
  ] as const;

  return (
    <>
      <Tip label="More">
        <button
          ref={btnRef}
          type="button"
          aria-label="More options"
          onClick={toggle}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
        >
          <MoreVertical className="h-4 w-4" strokeWidth={2} />
        </button>
      </Tip>

      {open &&
        pos &&
        createPortal(
          <div
            ref={dropRef}
            style={{ top: pos.top, left: pos.left }}
            className="absolute z-[300] w-[160px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white py-1 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]"
          >
            {items.map(({ label, icon: Icon, danger }) => (
              <button
                key={label}
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-[14px] transition-colors hover:bg-[#f9fafb] ${
                  danger ? 'text-[#dc2626]' : 'text-[#0a0a0a]'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

function RowActions({ item }: { item: Calculation }) {
  const navigate = useNavigate();
  const isRunning = item.status === 'Running';

  return (
    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      {isRunning ? (
        <>
          <IconBtn label="Pause" icon={Pause} onClick={() => {}} />
          <IconBtn label="Stop" icon={Square} onClick={() => {}} />
          <IconBtn label="Restart" icon={RotateCcw} onClick={() => {}} />
        </>
      ) : (
        <>
          <IconBtn label="Edit" icon={Pencil} onClick={() => navigate(`/calculation/${item.id}`)} />
          <IconBtn label="Start" icon={Play} onClick={() => {}} />
          <MoreMenu itemId={item.id} />
        </>
      )}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

export interface CalculationRowProps {
  item: Calculation;
  expanded: boolean;
  onToggle: () => void;
}

export function CalculationRow({ item, expanded, onToggle }: CalculationRowProps) {
  return (
    <>
      <tr
        {...rowInteractionProps(onToggle)}
        className={`group cursor-pointer border-b border-[#e5e7eb] transition-colors ${
          expanded ? 'bg-[#f9fafb]' : 'bg-white hover:bg-[#f9fafb]'
        }`}
      >
        <td className="w-[52px] px-3 py-4 align-top">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            aria-expanded={expanded}
            className="flex h-7 w-7 items-center justify-center rounded text-[#0a0a0a] hover:bg-[#e5e7eb]"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" strokeWidth={2} />
            ) : (
              <ChevronDown className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </td>
        <td className="w-[260px] px-3 py-4 align-top text-[14px] font-medium leading-5 text-[#0a0a0a]">
          {item.name}
        </td>
        <td className="px-3 py-4 align-top text-[14px] leading-5 text-[#6b7280]">{item.description}</td>
        <td className="w-[200px] px-3 py-4 align-top text-[14px] leading-5 text-[#6b7280]">
          {item.timestamp || '–'}
        </td>
        <td className="w-[180px] px-3 py-4 align-top">
          <StatusBadge status={item.status} timestamp={item.timestamp} />
        </td>
        <td className="w-[148px] px-3 py-4 align-top" onClick={(e) => e.stopPropagation()}>
          <RowActions item={item} />
        </td>
      </tr>
      {expanded && (
        <tr
          id={`calculation-detail-${item.id}`}
          className="border-b border-[#e5e7eb] bg-white"
        >
          <td className="w-[52px]" />
          <td colSpan={5} className="px-3 pb-5 pt-1">
            <div className="flex">
              <CalculationDetailGrid details={item.details} />
              <div className="ml-10 mt-4 w-[160px] shrink-0 overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#f8fafc]">
                <BladeThumbnail />
              </div>
              <div className="flex-1" />
              <div className="mt-4 flex shrink-0 gap-4 self-start">
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="h-9 rounded-md border border-[#e5e7eb] bg-white px-4 text-[14px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="h-9 rounded-md border border-[#e5e7eb] bg-white px-4 text-[14px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
                >
                  Logs
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
