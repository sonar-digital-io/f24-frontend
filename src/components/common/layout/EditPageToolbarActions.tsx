import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

interface EditPageToolbarActionsProps {
  title: string;
  onBack: () => void;
  /** Extra buttons rendered after the "Exit edit mode" button, e.g. CalculationNew's "Run calculation". */
  children?: ReactNode;
}

/**
 * Centered title + right-side "Saved" indicator / Exit button group shared
 * by all edit-page sub-toolbars (`EditPageToolbar`, `CalculationSubToolbar`).
 * Each caller renders its own tabs on the left, since those differ too much
 * (disabled states, tooltips) to share.
 */
export function EditPageToolbarActions({ title, onBack, children }: EditPageToolbarActionsProps) {
  return (
    <>
      <h1 className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-[18px] font-semibold leading-7 text-[#0a0a0a] lg:block">
        {title}
      </h1>

      <div className="flex shrink-0 items-center gap-4">
        <div className="flex items-center gap-[6px]">
          <Check className="h-4 w-4 text-[#737373]" strokeWidth={2} />
          <span className="text-[14px] leading-5 text-[#737373]">Saved</span>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-8 items-center rounded-md bg-[#f1f5f9] px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0]"
        >
          Exit edit mode
        </button>
        {children}
      </div>
    </>
  );
}
