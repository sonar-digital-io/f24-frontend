import type { ReactNode } from 'react';

interface TipProps {
  label: string;
  children: ReactNode;
}

/** Hover tooltip wrapper for icon-only row action buttons. */
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
