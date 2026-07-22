import type { ReactNode } from 'react';
import { Check, Minus } from 'lucide-react';

/**
 * Small shared building blocks reused across the list pages (Geometry,
 * Composition, Material, Calculation) and their row components: a tri-state
 * checkbox for "select all" / filter-dropdown rows, and a hover tooltip
 * wrapper for icon-only row action buttons.
 */

interface FilterCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
}

export function FilterCheckbox({ checked, indeterminate }: FilterCheckboxProps) {
  return (
    <div
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded ${
        checked || indeterminate ? 'bg-[#171717]' : 'border border-[#d1d5db] bg-white'
      }`}
    >
      {indeterminate ? (
        <Minus className="h-3 w-3 text-white" strokeWidth={3} />
      ) : checked ? (
        <Check className="h-3 w-3 text-white" strokeWidth={3} />
      ) : null}
    </div>
  );
}

interface TipProps {
  label: string;
  children: ReactNode;
}

export function Tip({ label, children }: TipProps) {
  return (
    <div className="group/tip relative">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[11px] leading-none text-white opacity-0 shadow-sm transition-opacity group-hover/tip:opacity-100">
        {label}
      </span>
    </div>
  );
}
