import { useEffect, useState } from 'react';
import { Redo2, Trash2, Undo2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { BezierEditor, type ControlPoint } from '@/components/BezierEditor';

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

function applyXConstraints(points: ControlPoint[], idx: number, nextX: number): number {
  if (idx === 0) return points[0].x;
  if (idx === points.length - 1) return points[points.length - 1].x;
  const minX = points[idx - 1].x;
  const maxX = points[idx + 1].x;
  return Math.max(minX, Math.min(maxX, nextX));
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

interface LayupMappingBezierDialogProps {
  open: boolean;
  /** Side + mapping name combined into the title, e.g. "Upper side / layup1". */
  title: string;
  /** Controlled: the parent owns the curve per mapping row. */
  points: ControlPoint[];
  onChange: (points: ControlPoint[]) => void;
  onClose: () => void;
}

export function LayupMappingBezierDialog({
  open,
  title,
  points,
  onChange,
  onClose,
}: LayupMappingBezierDialogProps) {
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

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

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="layup-bezier-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[986px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h2 id="layup-bezier-title" className="text-[18px] font-semibold leading-7 text-[#0a0a0a]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Undo"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
          >
            <Undo2 className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Redo"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
          >
            <Redo2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Chart + table */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,457px)]">
          <div>
            <BezierEditor
              points={points}
              onChange={onChange}
              xMin={X_MIN}
              xMax={X_MAX}
              xStep={X_STEP}
              yMin={Y_MIN}
              yMax={Y_MAX}
              yStep={Y_STEP}
              rootX={X_MIN}
            />
          </div>

          <div className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="h-10 w-[60px] px-3 text-left font-medium text-[#6b7280]">Index</th>
                  <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                    Longitudinal (m)
                  </th>
                  <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                    Transversal (m)
                  </th>
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
          </div>
        </div>
      </div>
    </div>
  );
}
