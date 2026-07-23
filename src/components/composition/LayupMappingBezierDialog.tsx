import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Plus, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { LayupMappingChart } from '@/components/composition/LayupMappingChart';
import type { ControlPoint } from '@/types';
import { clamp } from '@/lib/bezierMath';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useDraggablePosition } from '@/hooks/useDraggablePosition';

/** Layup mapping bezier: longitudinal (m) along x, transversal (m) along y.
 *  X range 5..55 m, Y range -14..0 m (default — caller can override). */
const X_MIN = 5;
const X_MAX = 55;
const X_STEP = 5;
const Y_MIN = -14;
const Y_MAX = 0;
const Y_STEP = 2;

/** Default curve for mapping rows that haven't been edited yet. */
export const DEFAULT_MAPPING_POINTS: ControlPoint[] = [
  { x: 8, y: -13.598 },
  { x: 8, y: 1.13015 },
  { x: 52, y: 1.14 },
  { x: 52, y: -13.5 },
];

const INIT_W = 986;
const MIN_W = 640;
const MIN_H_FLOOR = 300;

// BezierEditor has a fixed h-[260px]; table rows are ~48px each + 40px header + 37px add-button.
const BEZIER_H = 260;
const TABLE_HEAD_H = 40;
const TABLE_ROW_H = 48;
const TABLE_ADD_BTN_H = 37;
const DIALOG_CHROME = 24 + 36 + 16 + 24; // p-6 top + title + gap-4 + p-6 bottom

function calcMinH(rowCount: number) {
  const tableH = TABLE_HEAD_H + rowCount * TABLE_ROW_H + TABLE_ADD_BTN_H;
  return Math.max(MIN_H_FLOOR, DIALOG_CHROME + Math.max(BEZIER_H, tableH));
}

/** Keep a point's x between its neighbours (endpoints stay put) so the table
 *  edits can't break the x-ordering the chart relies on. */
function applyXConstraints(pts: ControlPoint[], idx: number, nextX: number): number {
  if (idx === 0) return pts[0].x;
  if (idx === pts.length - 1) return pts[pts.length - 1].x;
  return Math.max(pts[idx - 1].x, Math.min(pts[idx + 1].x, nextX));
}

interface LayupMappingBezierDialogProps {
  open: boolean;
  /** Side + mapping name combined into the title, e.g. "Upper side / layup1". */
  title: string;
  /** Controlled: the parent owns the curve per mapping row. */
  points: ControlPoint[];
  onChange: (points: ControlPoint[]) => void;
  onClose: () => void;
  /** Right edge of the anchor panel — dialog opens to its right. */
  anchorRight?: number;
  /** Top edge of the anchor panel — dialog aligns vertically to it. */
  anchorTop?: number;
  /** Left edge of the anchor panel — used for expand target position. */
  anchorLeft?: number;
}

export function LayupMappingBezierDialog({
  open,
  title,
  points,
  onChange,
  onClose,
  anchorRight,
  anchorTop,
  anchorLeft,
}: LayupMappingBezierDialogProps) {
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const { pos, setPos, startDrag } = useDraggablePosition({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: INIT_W, h: calcMinH(points.length) });
  const [expanded, setExpanded] = useState(false);
  const savedPosSize = useRef<{ pos: { x: number; y: number }; size: { w: number; h: number } } | null>(null);

  const resizing = useRef(false);
  const resizeStart = useRef({ mx: 0, my: 0, w: 0, h: 0 });

  // Position and reset when opened
  useEffect(() => {
    if (!open) return;
    const initH = calcMinH(points.length);
    setPos({
      x: anchorRight !== undefined ? anchorRight + 16 : Math.max(0, (window.innerWidth - INIT_W) / 2),
      y: Math.max(0, window.innerHeight - initH - 100),
    });
    setSize({ w: INIT_W, h: initH });
    setExpanded(false);
    savedPosSize.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleExpand() {
    savedPosSize.current = { pos, size };
    const left = anchorLeft ?? pos.x;
    const top = anchorTop ?? pos.y;
    setPos({ x: left, y: top });
    setSize({ w: window.innerWidth - 16 - left, h: window.innerHeight - 24 - top });
    setExpanded(true);
  }

  function handleCollapse() {
    if (savedPosSize.current) {
      setPos(savedPosSize.current.pos);
      setSize(savedPosSize.current.size);
    }
    setExpanded(false);
  }

  useEscapeKey(onClose, open);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = true;
    resizeStart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
    const minH = calcMinH(points.length);
    function onMove(ev: MouseEvent) {
      if (!resizing.current) return;
      setSize({
        w: Math.max(MIN_W, resizeStart.current.w + ev.clientX - resizeStart.current.mx),
        h: Math.max(minH, resizeStart.current.h + ev.clientY - resizeStart.current.my),
      });
    }
    function onUp() {
      resizing.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function fieldKey(idx: number, field: 'x' | 'y') {
    return `${idx}-${field}`;
  }
  function getInputValue(idx: number, field: 'x' | 'y') {
    const key = fieldKey(idx, field);
    if (editingValues[key] !== undefined) return editingValues[key];
    const p = points[idx];
    return field === 'x' ? p.x.toFixed(2) : p.y.toFixed(3);
  }
  function handleInputChange(idx: number, field: 'x' | 'y', raw: string) {
    setEditingValues((v) => ({ ...v, [fieldKey(idx, field)]: raw }));
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) return;
    onChange(
      points.map((p, i) => {
        if (i !== idx) return p;
        if (field === 'x') return { ...p, x: applyXConstraints(points, idx, parsed) };
        return { ...p, y: clamp(parsed, Y_MIN, Y_MAX) };
      }),
    );
  }
  function handleInputBlur(idx: number, field: 'x' | 'y') {
    setEditingValues((v) => {
      const k = fieldKey(idx, field);
      if (v[k] === undefined) return v;
      const next = { ...v };
      delete next[k];
      return next;
    });
  }
  function handleDelete(idx: number) {
    // Match the chart's rules: endpoints stay, minimum 3 points.
    if (idx === 0 || idx === points.length - 1) return;
    if (points.length <= 3) return;
    onChange(points.filter((_, i) => i !== idx));
  }

  function handleAdd() {
    const secondLast = points[points.length - 2];
    const last = points[points.length - 1];
    const newX = (secondLast.x + last.x) / 2;
    const newY = (secondLast.y + last.y) / 2;
    onChange([...points.slice(0, points.length - 1), { x: newX, y: newY }, last]);
  }

  if (!open) return null;

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      <div
        className="pointer-events-auto relative flex h-full w-full select-none flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button, input, textarea, select, [role="listbox"]')) return;
          startDrag(e);
        }}
      >
        {/* Header */}
        <div className="flex shrink-0 cursor-move items-center justify-between gap-4">
          <h2 className="text-[18px] font-semibold leading-7 text-[#0a0a0a]">{title}</h2>
          <div className="flex items-center gap-1">
            {expanded ? (
              <button
                type="button"
                onClick={handleCollapse}
                aria-label="Collapse"
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
              >
                <Minimize2 className="h-4 w-4" strokeWidth={2} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExpand}
                aria-label="Expand"
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
              >
                <Maximize2 className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Chart + table */}
        <div className="flex min-h-0 flex-1 gap-6">
          <div className="min-h-0 min-w-0 flex-1">
            <LayupMappingChart
              className="h-full"
              points={points}
              onChange={onChange}
              xMin={X_MIN}
              xMax={X_MAX}
              xStep={X_STEP}
              yMin={Y_MIN}
              yMax={Y_MAX}
              yStep={Y_STEP}
            />
          </div>

          <div className="w-[457px] shrink-0 self-start rounded-md border border-[#e5e7eb] bg-white">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="h-10 w-[60px] px-3 text-left font-medium text-[#6b7280]">Index</th>
                  <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Longitudinal (m)</th>
                  <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Transversal (m)</th>
                  <th className="h-10 w-12 px-2" />
                </tr>
              </thead>
              <tbody>
                {points.map((_p, idx) => {
                  const isEndpoint = idx === 0 || idx === points.length - 1;
                  return (
                    <tr key={idx} className="border-b border-[#e5e7eb] last:border-b-0">
                      <td className="px-3 py-2 text-[#0a0a0a]">{idx}</td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min={X_MIN}
                          max={X_MAX}
                          value={getInputValue(idx, 'x')}
                          onChange={(e) => handleInputChange(idx, 'x', e.target.value)}
                          onBlur={() => handleInputBlur(idx, 'x')}
                          disabled={isEndpoint}
                          className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:opacity-60"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          step="0.001"
                          min={Y_MIN}
                          max={Y_MAX}
                          value={getInputValue(idx, 'y')}
                          onChange={(e) => handleInputChange(idx, 'y', e.target.value)}
                          onBlur={() => handleInputBlur(idx, 'y')}
                          className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        {!isEndpoint && (
                          <button
                            type="button"
                            onClick={() => handleDelete(idx)}
                            aria-label={`Delete row ${idx}`}
                            disabled={points.length <= 3}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b7280] hover:bg-[#fef2f2] hover:text-[#dc2626] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button
              type="button"
              onClick={handleAdd}
              className="flex w-full items-center justify-center gap-1.5 border-t border-[#e5e7eb] py-2 text-[13px] font-medium text-[#006496] hover:bg-[#f0f9ff]"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Add point
            </button>
          </div>
        </div>

        {/* Resize handle — bottom-right corner */}
        <div
          className="absolute bottom-0 right-0 h-5 w-5 cursor-se-resize"
          onMouseDown={startResize}
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-full w-full">
            <path
              d="M19 5L5 19M19 10L10 19M19 15L15 19"
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
