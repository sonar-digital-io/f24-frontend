import { cn } from '@/lib/utils';
import type { CurveType } from '@/types';

const OPTIONS: { type: CurveType; label: string }[] = [
  { type: 'bezier', label: 'Bézier' },
  { type: 'spline', label: 'Spline' },
];

interface CurveTypeToggleProps {
  value: CurveType;
  /** The caller converts the curve's points to approximate the same shape under the
   *  new curve type (see `convertCurvePoints` in `@/lib/bezierMath`) rather than
   *  resetting them, so switching no longer needs a confirm-before-switch gate. */
  onChange: (next: CurveType) => void;
}

/** Segmented Spline/Bézier switch — which editor renders a curve section and
 *  which `curve_type` gets saved to the backend. */
export function CurveTypeToggle({ value, onChange }: CurveTypeToggleProps) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-[#e5e7eb]">
      {OPTIONS.map(({ type, label }) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          aria-pressed={value === type}
          className={cn(
            'h-8 px-2.5 text-[12px] font-medium',
            value === type ? 'bg-[#006496] text-white' : 'bg-white text-[#6b7280] hover:bg-[#f1f5f9]',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
