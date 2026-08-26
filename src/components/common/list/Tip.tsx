import type { ReactNode } from 'react';

interface TipProps {
  label: string;
  children: ReactNode;
  /** 'top' (default) opens above the trigger — clipped when the trigger sits near the
   *  top of its scroll container (e.g. the first field of a panel). Use 'bottom' there. */
  placement?: 'top' | 'bottom';
}

/** Hover tooltip wrapper for icon-only row action buttons. */
export function Tip({ label, children, placement = 'top' }: TipProps) {
  return (
    <div className="group/tip relative">
      {children}
      <span
        className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[11px] leading-none text-white opacity-0 shadow-sm transition-opacity group-hover/tip:opacity-100 ${
          placement === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
