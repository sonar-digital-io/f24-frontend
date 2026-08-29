import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { LayupMappingChart } from '@/components/composition/LayupMappingChart';
import { LayupMappingPointsTable } from '@/components/composition/LayupMappingPointsTable';
import type { ControlPoint } from '@/types';
import { clamp, isConvexPolygon, MIN_LAYUP_POLYGON_POINTS } from '@/lib/bezierMath';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useDraggablePosition } from '@/hooks/useDraggablePosition';

const INIT_W = 986;
const MIN_W = 640;
const MIN_H_FLOOR = 300;

// The polygon chart has a fixed h-[260px]; table rows are ~48px each + 40px header + 37px add-button.
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

interface LayupMappingDialogProps {
  open: boolean;
  /** Side + mapping name combined into the title, e.g. "Upper side / layup1". */
  title: string;
  /** Controlled: the parent owns the curve per mapping row. */
  points: ControlPoint[];
  onChange: (points: ControlPoint[]) => void;
  /** Blade planform background — from GET /geometry/:id/top-view/, in the chart's own data scale. */
  leadingEdge: ControlPoint[];
  trailingEdge: ControlPoint[];
  /** Chart axis bounds — computed from the blade's real geometry, see computeMappingBounds. */
  xMin: number;
  xMax: number;
  xStep: number;
  yMin: number;
  yMax: number;
  yStep: number;
  onClose: () => void;
  /** Right edge of the anchor panel — dialog opens to its right. */
  anchorRight?: number;
  /** Top edge of the anchor panel — dialog aligns vertically to it. */
  anchorTop?: number;
  /** Left edge of the anchor panel — used for expand target position. */
  anchorLeft?: number;
}

export function LayupMappingDialog({
  open,
  title,
  points,
  onChange,
  leadingEdge,
  trailingEdge,
  xMin,
  xMax,
  xStep,
  yMin,
  yMax,
  yStep,
  onClose,
  anchorRight,
  anchorTop,
  anchorLeft,
}: LayupMappingDialogProps) {
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
    const next = points.map((p, i) => {
      if (i !== idx) return p;
      if (field === 'x') return { ...p, x: applyXConstraints(points, idx, parsed) };
      return { ...p, y: clamp(parsed, yMin, yMax) };
    });
    // A typed value that would fold the polygon in on itself is rejected — the
    // input keeps showing what was typed (via editingValues above) but the
    // point itself doesn't move there. If the polygon was already concave,
    // don't lock all further edits — only block convex-to-concave moves.
    if (isConvexPolygon(points) && !isConvexPolygon(next)) return;
    onChange(next);
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
    // Match the chart's rules: endpoints stay, minimum MIN_LAYUP_POLYGON_POINTS points.
    if (idx === 0 || idx === points.length - 1) return;
    if (points.length <= MIN_LAYUP_POLYGON_POINTS) return;
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
              leadingEdge={leadingEdge}
              trailingEdge={trailingEdge}
              xMin={xMin}
              xMax={xMax}
              xStep={xStep}
              yMin={yMin}
              yMax={yMax}
              yStep={yStep}
              xUnit="mm"
              yUnit="mm"
            />
          </div>

          <LayupMappingPointsTable
            points={points}
            minPoints={MIN_LAYUP_POLYGON_POINTS}
            xMin={xMin}
            xMax={xMax}
            yMin={yMin}
            yMax={yMax}
            getInputValue={getInputValue}
            onInputChange={handleInputChange}
            onInputBlur={handleInputBlur}
            onDelete={handleDelete}
            onAdd={handleAdd}
          />
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
