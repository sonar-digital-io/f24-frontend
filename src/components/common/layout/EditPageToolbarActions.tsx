import type { ReactNode } from 'react';
import { Check, Redo2, Undo2 } from 'lucide-react';

interface EditPageToolbarActionsProps {
  title: string;
  backLabel: string;
  onBack: () => void;
  /** Extra buttons rendered after the "Back to …" button, e.g. CalculationNew's "Run calculation". */
  children?: ReactNode;
}

/**
 * Centered title + right-side "Saved" indicator / Undo / Redo / Back button
 * group shared by all edit-page sub-toolbars (`EditPageToolbar`,
 * `CalculationSubToolbar`). Each caller renders its own tabs on the left,
 * since those differ too much (disabled states, tooltips) to share.
 */
export function EditPageToolbarActions({ title, backLabel, onBack, children }: EditPageToolbarActionsProps) {
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
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Undo"
            className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f5f9] text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0] hover:text-[#0a0a0a]"
          >
            <Undo2 className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Redo"
            className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f5f9] text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0] hover:text-[#0a0a0a]"
          >
            <Redo2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-8 items-center rounded-md bg-[#f1f5f9] px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0]"
        >
          {backLabel}
        </button>
        {children}
      </div>
    </>
  );
}
