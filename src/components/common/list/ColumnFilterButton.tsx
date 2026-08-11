import { Filter } from 'lucide-react';
import type { RefObject } from 'react';

interface ColumnFilterButtonProps {
  ariaLabel: string;
  active: boolean;
  onClick: () => void;
  buttonRef: RefObject<HTMLButtonElement>;
}

/** Small "Filter by …" icon button rendered inside a sortable column header. */
export function ColumnFilterButton({ ariaLabel, active, onClick, buttonRef }: ColumnFilterButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#f1f5f9] ${
        active ? 'text-[#006496]' : 'text-[#9ca3af]'
      }`}
    >
      <Filter className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}
