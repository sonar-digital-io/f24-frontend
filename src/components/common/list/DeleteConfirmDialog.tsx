import { ConfirmDialog } from '@/components/common/dialog/ConfirmDialog';

interface DeleteConfirmDialogProps {
  /** Lowercase entity name, e.g. "material", "composition", "geometry", "load group". */
  entityLabel: string;
  pendingDelete: { id: string; name: string } | null;
  isPending: boolean;
  isError: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Row-delete confirmation dialog shared by the Material/Composition/Geometry/
 *  LoadGroup list pages — identical copy pattern, only the entity name differs. */
export function DeleteConfirmDialog({
  entityLabel,
  pendingDelete,
  isPending,
  isError,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={pendingDelete !== null}
      title={`Delete ${entityLabel}`}
      message={`Are you sure you want to delete "${pendingDelete?.name}"? This action cannot be undone.`}
      confirmLabel={isPending ? 'Deleting…' : 'Delete'}
      confirmDisabled={isPending}
      errorMessage={isError ? 'Failed to delete. Please try again.' : undefined}
      danger
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
