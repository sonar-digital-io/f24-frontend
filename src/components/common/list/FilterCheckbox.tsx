import { Check, Minus } from 'lucide-react';

interface FilterCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
}

/** Tri-state checkbox for "select all" / filter-dropdown rows. */
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
