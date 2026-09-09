import type { ElementType, MouseEvent } from 'react';
import { Tip } from '@/components/common/list/Tip';

interface RowIconButtonProps {
  label: string;
  icon: ElementType;
  onClick: (e: MouseEvent) => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

/** Icon-only row action button (Edit/Export/Duplicate/Delete/…) with hover tooltip. */
export function RowIconButton({
  label,
  icon: Icon,
  onClick,
  variant = 'default',
  disabled = false,
}: RowIconButtonProps) {
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onClick(e);
        }}
        className={`flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white ${
          variant === 'danger'
            ? 'text-[#6b7280] hover:bg-[#fee2e2] hover:text-[#dc2626]'
            : 'text-[#0a0a0a]'
        }`}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </button>
    </Tip>
  );
}
