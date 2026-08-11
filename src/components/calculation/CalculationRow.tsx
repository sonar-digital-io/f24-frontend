import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
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
import { Tip } from '@/components/common/list/Tip';
import { RowIconButton } from '@/components/common/list/RowIconButton';
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

// ─── Row actions ──────────────────────────────────────────────────────────────

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
          <RowIconButton label="Pause" icon={Pause} onClick={() => {}} />
          <RowIconButton label="Stop" icon={Square} onClick={() => {}} />
          <RowIconButton label="Restart" icon={RotateCcw} onClick={() => {}} />
        </>
      ) : (
        <>
          <RowIconButton label="Edit" icon={Pencil} onClick={() => navigate(`/calculation/${item.id}`)} />
          <RowIconButton label="Start" icon={Play} onClick={() => {}} />
          <MoreMenu itemId={item.id} />
        </>
      )}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

export interface CalculationRowProps {
  item: Calculation;
}

export function CalculationRow({ item }: CalculationRowProps) {
  const navigate = useNavigate();
  return (
    <tr
      onClick={() => navigate(`/calculation/${item.id}`)}
      className="group cursor-pointer border-b border-[#e5e7eb] bg-white transition-colors hover:bg-[#f9fafb]"
    >
      <td className="w-[260px] px-3 py-4 align-top text-[14px] font-medium leading-5 text-[#0a0a0a]">
        {item.name}
      </td>
      <td className="w-[180px] px-3 py-4 align-top">
        <StatusBadge status={item.status} timestamp={item.timestamp} />
      </td>
      <td className="w-[200px] px-3 py-4 align-top text-[14px] leading-5 text-[#6b7280]">
        {item.timestamp || '–'}
      </td>
      <td className="px-3 py-4 align-top text-[14px] leading-5 text-[#6b7280]">{item.description}</td>
      <td className="w-[148px] px-3 py-4 align-top" onClick={(e) => e.stopPropagation()}>
        <RowActions item={item} />
      </td>
    </tr>
  );
}
