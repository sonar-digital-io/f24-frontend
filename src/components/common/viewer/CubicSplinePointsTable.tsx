import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ControlPoint } from '@/types';

type Field = 'x' | 'y';

/** Point-editing callbacks passed down through `ProfileDistributionSectionBody`/
 *  `StackingSectionBody` into this table unchanged (`onInputChange`/`onInputBlur`
 *  there map to this table's `onChange`/`onBlur`) — shared here so each caller's
 *  props interface doesn't redeclare the same four signatures. */
export interface PointsTableEditCallbacks {
  getInputValue: (idx: number, field: Field) => string;
  onInputChange: (idx: number, field: Field, raw: string) => void;
  onInputBlur: (idx: number, field: Field) => void;
  onAddPoint: () => void;
  onRemovePoint: (idx: number) => void;
}

interface CubicSplinePointsTableProps {
  points: ControlPoint[];
  /** Y column header, e.g. "Max Cam (%)" or "Sweep (m)". */
  valueLabel: string;
  /** Namespaces the `<Input>` ids — pass the section key. */
  idPrefix: string;
  getInputValue: (idx: number, field: Field) => string;
  onChange: (idx: number, field: Field, raw: string) => void;
  onBlur: (idx: number, field: Field) => void;
  onAddPoint: () => void;
  onRemovePoint: (idx: number) => void;
  /** A curve needs at least this many points — the delete button disables
   *  once only that many remain, same floor as the chart's double-click delete. */
  minPoints?: number;
}

/**
 * Editable index/x/y table for a cubic-spline section, with an "Add point"
 * footer button and a per-row delete button. Paired with `CurveEditor`
 * in ProfileDistributionPanel and StackingPanel — same table, different
 * section data/bounds.
 */
export function CubicSplinePointsTable({
  points,
  valueLabel,
  idPrefix,
  getInputValue,
  onChange,
  onBlur,
  onAddPoint,
  onRemovePoint,
  minPoints = 2,
}: CubicSplinePointsTableProps) {
  return (
    <div className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
      <table className="w-full border-collapse text-[14px]">
        <thead>
          <tr className="border-b border-[#e5e7eb]">
            <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Index</th>
            <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Relative radius</th>
            <th className="h-10 px-3 text-left font-medium text-[#6b7280]">{valueLabel}</th>
            <th className="h-10 w-10 px-2" />
          </tr>
        </thead>
        <tbody>
          {points.map((_p, idx) => {
            return (
              <tr key={idx} className="border-b border-[#e5e7eb] last:border-b-0">
                <td className="px-3 py-2 text-[#0a0a0a]">{idx}</td>
                <td className="px-2 py-2">
                  <Label htmlFor={`${idPrefix}-${idx}-x`} className="sr-only">
                    Relative radius
                  </Label>
                  <Input
                    id={`${idPrefix}-${idx}-x`}
                    type="text"
                    inputMode="decimal"
                    value={getInputValue(idx, 'x')}
                    onChange={(e) => onChange(idx, 'x', e.target.value)}
                    onBlur={() => onBlur(idx, 'x')}
                    className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                  />
                </td>
                <td className="px-2 py-2">
                  <Label htmlFor={`${idPrefix}-${idx}-y`} className="sr-only">
                    {valueLabel}
                  </Label>
                  <Input
                    id={`${idPrefix}-${idx}-y`}
                    type="text"
                    inputMode="decimal"
                    value={getInputValue(idx, 'y')}
                    onChange={(e) => onChange(idx, 'y', e.target.value)}
                    onBlur={() => onBlur(idx, 'y')}
                    className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onRemovePoint(idx)}
                    disabled={points.length <= minPoints}
                    aria-label={`Remove point ${idx}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6b7280] hover:bg-[#fef2f2] hover:text-[#dc2626] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#6b7280]"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        type="button"
        onClick={onAddPoint}
        className="flex w-full items-center justify-center gap-1.5 border-t border-[#e5e7eb] py-2 text-[13px] font-medium text-[#006496] hover:bg-[#f0f9ff]"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        Add point
      </button>
    </div>
  );
}
