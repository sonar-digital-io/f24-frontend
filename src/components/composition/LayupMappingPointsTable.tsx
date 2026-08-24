import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { ControlPoint } from '@/types';

interface LayupMappingPointsTableProps {
  points: ControlPoint[];
  /** Delete is disabled once the polygon is down to this many points. */
  minPoints: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  getInputValue: (idx: number, field: 'x' | 'y') => string;
  onInputChange: (idx: number, field: 'x' | 'y', raw: string) => void;
  onInputBlur: (idx: number, field: 'x' | 'y') => void;
  onDelete: (idx: number) => void;
  onAdd: () => void;
}

/** Longitudinal/transversal point-editing table shown alongside the LayupMappingChart. */
export function LayupMappingPointsTable({
  points,
  minPoints,
  xMin,
  xMax,
  yMin,
  yMax,
  getInputValue,
  onInputChange,
  onInputBlur,
  onDelete,
  onAdd,
}: LayupMappingPointsTableProps) {
  return (
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
                    min={xMin}
                    max={xMax}
                    value={getInputValue(idx, 'x')}
                    onChange={(e) => onInputChange(idx, 'x', e.target.value)}
                    onBlur={() => onInputBlur(idx, 'x')}
                    className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:opacity-60"
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    step="0.001"
                    min={yMin}
                    max={yMax}
                    value={getInputValue(idx, 'y')}
                    onChange={(e) => onInputChange(idx, 'y', e.target.value)}
                    onBlur={() => onInputBlur(idx, 'y')}
                    className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                  />
                </td>
                <td className="px-2 py-2">
                  {!isEndpoint && (
                    <button
                      type="button"
                      onClick={() => onDelete(idx)}
                      aria-label={`Delete row ${idx}`}
                      disabled={points.length <= minPoints}
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
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-1.5 border-t border-[#e5e7eb] py-2 text-[13px] font-medium text-[#006496] hover:bg-[#f0f9ff]"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        Add point
      </button>
    </div>
  );
}
