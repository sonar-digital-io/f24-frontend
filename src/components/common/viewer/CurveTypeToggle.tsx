import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/common/dialog/ConfirmDialog';
import type { CurveType } from '@/types';

const OPTIONS: { type: CurveType; label: string }[] = [
  { type: 'bezier', label: 'Bézier' },
  { type: 'spline', label: 'Spline' },
];

interface CurveTypeToggleProps {
  value: CurveType;
  /** Fires only once the user has confirmed the switch — the caller is expected to
   *  reset the curve's points to its own default set when this fires. */
  onChange: (next: CurveType) => void;
}

/** Segmented Spline/Bézier switch — which editor renders a curve section and
 *  which `curve_type` gets saved to the backend. Switching discards the current
 *  curve's points (a Bézier's control points and a Spline's knots aren't
 *  interchangeable), so a confirm dialog gates the switch before `onChange` fires. */
export function CurveTypeToggle({ value, onChange }: CurveTypeToggleProps) {
  const [pendingType, setPendingType] = useState<CurveType | null>(null);

  return (
    <>
      <div className="inline-flex overflow-hidden rounded-md border border-[#e5e7eb]">
        {OPTIONS.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              if (type === value) return;
              setPendingType(type);
            }}
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
      <ConfirmDialog
        open={pendingType !== null}
        title="Switch curve type?"
        message="Switching between Bézier and Spline discards the current curve's points — the new canvas starts from a default curve. This can't be undone."
        confirmLabel="Switch"
        danger
        onConfirm={() => {
          if (pendingType) onChange(pendingType);
          setPendingType(null);
        }}
        onCancel={() => setPendingType(null)}
      />
    </>
  );
}
