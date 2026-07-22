import { useRef, useState } from 'react';
import { ChevronRight, Copy, GripVertical, Plus, Spline, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LAYUPS } from '@/data/layups';
import type { ControlPoint } from '@/types';

export interface LayupMapping {
  id: string;
  name: string;
  layupId: string | null;
  /** Bezier curve edited in LayupMappingBezierDialog; undefined = default curve. */
  points?: ControlPoint[];
}

export interface LayupMappingTableProps {
  title: string;
  copyLabel: string;
  mappings: LayupMapping[];
  activeMappingId?: string | null;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, next: Partial<LayupMapping>) => void;
  onCopy: () => void;
  onDuplicate: (id: string) => void;
  onOpenBezier: (id: string) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
  onPickLayup: (mappingId: string) => void;
}

export function LayupMappingTable({
  title,
  copyLabel,
  mappings,
  activeMappingId,
  onAdd,
  onDelete,
  onUpdate,
  onCopy,
  onDuplicate,
  onOpenBezier,
  onReorder,
  onPickLayup,
}: LayupMappingTableProps) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [insertBeforeIdx, setInsertBeforeIdx] = useState<number | null>(null);
  const dragFromHandleRef = useRef<string | null>(null);

  function handleDragStart(idx: number, e: React.DragEvent<HTMLTableRowElement>) {
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }
  function handleDragOver(idx: number, e: React.DragEvent<HTMLTableRowElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const newInsert = e.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
    if (insertBeforeIdx !== newInsert) setInsertBeforeIdx(newInsert);
  }
  function handleDragLeave() {
    setInsertBeforeIdx(null);
  }
  function handleDrop(e: React.DragEvent<HTMLTableRowElement>) {
    e.preventDefault();
    const fromIdx = Number(e.dataTransfer.getData('text/plain'));
    if (insertBeforeIdx !== null && !Number.isNaN(fromIdx) && insertBeforeIdx !== fromIdx && insertBeforeIdx !== fromIdx + 1) {
      const toIdx = insertBeforeIdx > fromIdx ? insertBeforeIdx - 1 : insertBeforeIdx;
      onReorder(fromIdx, toIdx);
    }
    setDraggingIdx(null);
    setInsertBeforeIdx(null);
  }
  function handleDragEnd() {
    dragFromHandleRef.current = null;
    setDraggingIdx(null);
    setInsertBeforeIdx(null);
  }

  return (
    <TooltipProvider>
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-semibold leading-6 text-[#0a0a0a]">{title}</h3>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-8 items-center rounded-md bg-[#f1f5f9] px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0]"
        >
          {copyLabel}
        </button>
      </div>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[#e5e7eb]">
            <th className="h-8 w-9 px-2" />
            <th className="h-8 w-12 px-2 text-left font-medium text-[#6b7280]">Index</th>
            <th className="h-8 px-2 text-left font-medium text-[#6b7280]">Name</th>
            <th className="h-8 w-[150px] px-2 text-left font-medium text-[#6b7280]">Layup</th>
            <th className="h-8 w-[120px] px-2" />
          </tr>
        </thead>
        <tbody>
          {mappings.flatMap((m, idx) => {
            const layupLabel = LAYUPS.find((l) => l.id === m.layupId)?.name;
            const isDragging = draggingIdx === idx;
            const insertLine = (key: string) => (
              <tr key={key} className="pointer-events-none">
                <td colSpan={5} className="p-0">
                  <div className="mx-2 h-0.5 rounded-full bg-[#006496]" />
                </td>
              </tr>
            );
            const row = (
              <tr
                key={m.id}
                draggable
                onDragStart={(e) => {
                  if (dragFromHandleRef.current !== m.id) {
                    e.preventDefault();
                    return;
                  }
                  handleDragStart(idx, e);
                }}
                onDragOver={(e) => handleDragOver(idx, e)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                className={`group border-b border-[#e5e7eb] last:border-b-0 transition-colors ${
                  isDragging ? 'opacity-40' : ''
                } ${activeMappingId === m.id ? 'bg-[#eef9ff]' : ''}`}
              >
                <td className="px-2 py-2 align-middle">
                  <span
                    aria-label="Drag handle"
                    onMouseDown={() => { dragFromHandleRef.current = m.id; }}
                    onMouseUp={() => { dragFromHandleRef.current = null; }}
                    className="flex h-7 w-7 cursor-grab items-center justify-center text-[#cbd5e1] opacity-0 transition-opacity hover:text-[#0a0a0a] active:cursor-grabbing group-hover:opacity-100"
                  >
                    <GripVertical className="h-4 w-4" strokeWidth={2} />
                  </span>
                </td>
                <td className="px-2 py-2 text-[#0a0a0a]">{idx}</td>
                <td className="px-2 py-2">
                  <TooltipRoot delayDuration={400}>
                    <TooltipTrigger asChild>
                      <Input
                        value={m.name}
                        onChange={(e) => onUpdate(m.id, { name: e.target.value })}
                        placeholder="Placeholder"
                        className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] text-ellipsis"
                      />
                    </TooltipTrigger>
                    {m.name && <TooltipContent>{m.name}</TooltipContent>}
                  </TooltipRoot>
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    onClick={() => onPickLayup(m.id)}
                    className={`flex h-8 w-full items-center justify-between gap-2 rounded-md border border-[#e2e8f0] bg-white px-2 py-1 text-left text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f9fafb] ${
                      layupLabel ? 'text-[#0a0a0a]' : 'text-[#6b7280]'
                    }`}
                  >
                    <span className="truncate">{layupLabel ?? 'Select'}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#6b7280]" strokeWidth={1.5} />
                  </button>
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Tooltip content="Edit mapping">
                      <button
                        type="button"
                        onClick={() => onOpenBezier(m.id)}
                        aria-label="Open mapping bezier view"
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
                      >
                        <Spline className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Duplicate">
                      <button
                        type="button"
                        onClick={() => onDuplicate(m.id)}
                        aria-label="Duplicate mapping"
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
                      >
                        <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Delete">
                      <button
                        type="button"
                        onClick={() => onDelete(m.id)}
                        aria-label="Delete mapping"
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#fef2f2] hover:text-[#dc2626]"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            );
            const result = [];
            if (draggingIdx !== null && insertBeforeIdx === idx) result.push(insertLine(`insert-before-${idx}`));
            result.push(row);
            if (draggingIdx !== null && idx === mappings.length - 1 && insertBeforeIdx === mappings.length) result.push(insertLine('insert-end'));
            return result;
          })}
          {mappings.length === 0 && (
            <tr>
              <td colSpan={5} className="px-2 py-4 text-center text-[12px] text-[#6b7280]">
                No mappings yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex h-8 items-center gap-2 self-start rounded-md border border-[#e2e8f0] bg-white px-3 text-[12px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Add layup mapping
      </button>
    </div>
    </TooltipProvider>
  );
}
