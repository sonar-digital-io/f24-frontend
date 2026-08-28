import { ConfirmDialog } from '@/components/common/dialog/ConfirmDialog';

interface ExitConfirmDialogProps {
  open: boolean;
  /** e.g. "material", "geometry" — used in the body copy. */
  entityLabel: string;
  /** Where the incomplete record can't be used yet, e.g. "a layup", "a composition". */
  usedInLabel: string;
  onExitAnyway: () => void;
  onStayAndReview: () => void;
}

/** "Exit without finishing?" warning for autosave-on-blur edit pages — shown when
 *  navigating away with mandatory fields still missing. Everything already autosaves on
 *  blur, so exiting anyway just leaves it incomplete rather than losing data. Shared by
 *  every edit page with this pattern (Material, Geometry, ...) via `useExitConfirm`. */
export function ExitConfirmDialog({
  open,
  entityLabel,
  usedInLabel,
  onExitAnyway,
  onStayAndReview,
}: ExitConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="Exit without finishing?"
      message={`Not all required fields are filled in. You can exit anyway — your data is saved, but this ${entityLabel} won't be usable in ${usedInLabel} until it's complete.`}
      confirmLabel="Exit anyway"
      cancelLabel="Stay and review"
      onConfirm={onExitAnyway}
      onCancel={onStayAndReview}
    />
  );
}
