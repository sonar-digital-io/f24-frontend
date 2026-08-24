import type { ReactNode } from 'react';
import { Check, Loader2, X } from 'lucide-react';

export type SaveStatus = 'saved' | 'saving' | 'not-saved';

/** Saving…/Not saved/Saved indicator shared by every edit-page toolbar. */
export function SaveStatusIndicator({ status }: { status?: SaveStatus }) {
  return (
    <div className="flex items-center gap-[6px]">
      {status === 'saving' ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-[#737373]" strokeWidth={2} />
          <span className="text-[14px] leading-5 text-[#737373]">Saving…</span>
        </>
      ) : status === 'not-saved' ? (
        <>
          <X className="h-4 w-4 text-[#dc2626]" strokeWidth={2} />
          <span className="text-[14px] leading-5 text-[#dc2626]">Not saved</span>
        </>
      ) : status === 'saved' ? (
        <>
          <Check className="h-4 w-4 text-[#737373]" strokeWidth={2} />
          <span className="text-[14px] leading-5 text-[#737373]">Saved</span>
        </>
      ) : null}
    </div>
  );
}

/** "Exit edit mode" button shared by every edit-page toolbar — `floating`
 *  switches to the translucent/backdrop-blur style used by the toolbars that
 *  float over a 3D canvas (Composition, Geometry) instead of sitting in normal
 *  page flow (Material, Layup, LoadGroup, Calculation). */
export function ExitEditModeButton({ onClick, floating }: { onClick: () => void; floating?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0] ${
        floating ? 'bg-[#f1f5f9]/95 backdrop-blur-sm' : 'bg-[#f1f5f9]'
      }`}
    >
      Exit edit mode
      <X className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

interface SaveStatusAndExitProps {
  /** Omit when the page doesn't track save state — the indicator is hidden rather than
   *  falsely claiming "Saved". */
  status?: SaveStatus;
  onExit: () => void;
  /** See `ExitEditModeButton`. */
  floating?: boolean;
  /** Extra buttons rendered after the "Exit edit mode" button, e.g. CalculationNew's "Run calculation". */
  children?: ReactNode;
}

/** Saved/Saving/Not saved indicator + Exit button, always rendered together —
 *  shared by every edit-page toolbar (`EditPageToolbar`, `CalculationSubToolbar`,
 *  `CompositionEditToolbar`, `GeometryEditToolbar`). */
export function SaveStatusAndExit({ status, onExit, floating, children }: SaveStatusAndExitProps) {
  return (
    <div className="flex shrink-0 items-center gap-4">
      <SaveStatusIndicator status={status} />
      <ExitEditModeButton onClick={onExit} floating={floating} />
      {children}
    </div>
  );
}

interface EditPageToolbarActionsProps {
  title: string;
  onBack: () => void;
  /** Passed straight through to `SaveStatusAndExit`. */
  status?: SaveStatus;
  /** Extra buttons rendered after the "Exit edit mode" button, e.g. CalculationNew's "Run calculation". */
  children?: ReactNode;
}

/**
 * Centered title + right-side Saved/Saving/Not saved indicator / Exit button group
 * shared by all edit-page sub-toolbars (`EditPageToolbar`, `CalculationSubToolbar`).
 * Each caller renders its own tabs on the left, since those differ too much
 * (disabled states, tooltips) to share.
 */
export function EditPageToolbarActions({ title, onBack, status, children }: EditPageToolbarActionsProps) {
  return (
    <>
      <h1 className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-[18px] font-semibold leading-7 text-[#0a0a0a] lg:block">
        {title}
      </h1>

      <SaveStatusAndExit status={status} onExit={onBack}>
        {children}
      </SaveStatusAndExit>
    </>
  );
}
