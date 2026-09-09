import { useNavigate } from 'react-router-dom';
import { Download, Pencil, Play, ScrollText, Square, Trash2 } from 'lucide-react';
import { RowIconButton } from '@/components/common/list/RowIconButton';
import { formatDateTime } from '@/lib/utils';
import { type Calculation, type CalculationStatus } from '@/data/calculations';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<CalculationStatus, string> = {
  Draft: 'bg-[#f3f4f6] text-[#374151]',
  Running: 'bg-[#dbeafe] text-[#1e40af]',
  Finished: 'bg-[#dcfce7] text-[#166534]',
  Failed: 'bg-[#fee2e2] text-[#991b1b]',
  Stopped: 'bg-[#fef9c3] text-[#854d0e]',
};

function StatusBadge({ status }: { status: CalculationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

// ─── Row actions ──────────────────────────────────────────────────────────────

interface RowActionsProps {
  item: Calculation;
  onDelete: () => void;
  onStart: () => void;
  onStop: () => void;
  onExport: () => void;
  onShowLog: () => void;
}

function RowActions({ item, onDelete, onStart, onStop, onExport, onShowLog }: RowActionsProps) {
  const navigate = useNavigate();
  const isRunning = item.status === 'Running';

  return (
    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <RowIconButton label="Edit" icon={Pencil} onClick={() => navigate(`/calculation/${item.id}`)} disabled={isRunning} />
      {isRunning ? (
        <>
          <RowIconButton label="Stop" icon={Square} onClick={onStop} />
        </>
      ) : (
        <>
          <RowIconButton label="Start" icon={Play} onClick={onStart} />
        </>
      )}
      <RowIconButton label="Logs" icon={ScrollText} onClick={onShowLog} />
      <RowIconButton label="Export" icon={Download} onClick={onExport} />
      <RowIconButton label="Delete" icon={Trash2} onClick={onDelete} variant="danger" disabled={isRunning} />
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

export interface CalculationRowProps {
  item: Calculation;
  onDelete: () => void;
  onStart: () => void;
  onStop: () => void;
  onExport: () => void;
  onShowLog: () => void;
}

export function CalculationRow({ item, onDelete, onStart, onStop, onExport, onShowLog }: CalculationRowProps) {
  const navigate = useNavigate();
  const isRunning = item.status === 'Running';
  return (
    <tr
      onClick={() => !isRunning && navigate(`/calculation/${item.id}`)}
      className={`group border-b border-[#e5e7eb] bg-white transition-colors ${
        isRunning ? '' : 'cursor-pointer hover:bg-[#f9fafb]'
      }`}
    >
      <td className="w-[260px] px-3 py-4 align-top text-[14px] font-medium leading-5 text-[#0a0a0a]">
        {item.name}
      </td>
      <td className="px-3 py-4 align-top text-[14px] leading-5 text-[#6b7280]">{item.description}</td>
      <td className="w-[180px] px-3 py-4 align-top">
        <StatusBadge status={item.status} />
      </td>
      <td className="w-[200px] px-3 py-4 align-top text-[14px] leading-5 text-[#6b7280]">
        {formatDateTime(item.lastUpdated)}
      </td>
      <td className="w-[220px] px-3 py-4 align-top" onClick={(e) => e.stopPropagation()}>
        <RowActions
          item={item}
          onDelete={onDelete}
          onStart={onStart}
          onStop={onStop}
          onExport={onExport}
          onShowLog={onShowLog}
        />
      </td>
    </tr>
  );
}
