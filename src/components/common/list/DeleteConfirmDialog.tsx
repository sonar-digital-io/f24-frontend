import { ConfirmDialog } from '@/components/common/dialog/ConfirmDialog';
import { getApiErrorMessage } from '@/lib/apiError';

interface DeleteConfirmDialogProps {
  /** Lowercase entity name, e.g. "material", "composition", "geometry", "load group". */
  entityLabel: string;
  pendingDelete: { id: string; name: string } | null;
  isPending: boolean;
  isError: boolean;
  /** The failed mutation's own error (e.g. `deleteMutation.error`) — shown via
   *  `getApiErrorMessage` when present (e.g. a 409 "still referenced by a
   *  composition" conflict), falling back to a generic message otherwise. */
  error?: unknown;
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
  error,
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
      // Blocks dismissing the dialog while the delete is in flight — otherwise
      // canceling and opening another row's dialog resets the (shared) mutation
      // mid-request, and that stale request's eventual result could surface
      // misattributed to the row now showing. See useDeleteConfirm's reset-on-open.
      cancelDisabled={isPending}
      errorMessage={isError ? getApiErrorMessage(error, 'Failed to delete. Please try again.') : undefined}
      danger
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
