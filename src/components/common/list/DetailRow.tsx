import type { ReactNode } from 'react';

interface DetailRowProps {
  label: string;
  value: ReactNode;
  labelWidthClassName?: string;
}

/** Label/value line used in expanded-row detail grids (Calculation, Material). */
export function DetailRow({ label, value, labelWidthClassName = 'w-[140px]' }: DetailRowProps) {
  return (
    <div className="flex items-center gap-4 py-[5px]">
      <span className={`${labelWidthClassName} shrink-0 text-[14px] leading-5 text-[#6b7280]`}>
        {label}
      </span>
      <span className="text-[14px] font-semibold leading-5 text-[#0a0a0a]">{value}</span>
    </div>
  );
}
