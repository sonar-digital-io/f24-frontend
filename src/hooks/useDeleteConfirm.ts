import { useState } from 'react';

interface PendingDelete {
  id: string;
  name: string;
}

interface DeleteMutationLike<TId> {
  mutateAsync: (id: TId) => Promise<unknown>;
  isPending: boolean;
  isError: boolean;
  /** Clears isError/error back to idle — called whenever a delete dialog opens
   *  (for any row) so a previous row's failed attempt doesn't leak into it. */
  reset: () => void;
}

/**
 * Shared "row delete -> confirm dialog -> mutate" state for list pages
 * (Material/Composition/Geometry/LoadGroup/Calculation): tracks which row is
 * pending deletion; on confirm, awaits the mutation and clears it on
 * success — `mutation.isError` surfaces the failure in the dialog (see
 * `DeleteConfirmDialog`), so it stays open for retry instead of closing.
 *
 * `TId` defaults to `number` (every backend id but the project/calculation
 * one, which is a UUID string) — pass `useDeleteConfirm<string>(mutation,
 * (id) => id)` for a mutation whose id is already a string.
 */
export function useDeleteConfirm<TId = number>(
  mutation: DeleteMutationLike<TId>,
  toId: (id: string) => TId = (id) => Number(id) as TId,
) {
  const [pendingDelete, setPendingDeleteState] = useState<PendingDelete | null>(null);

  // The underlying mutation object is the same one across every row (it isn't
  // re-created per-row), so its isError/error from a previous row's failed
  // delete would otherwise still be sitting there the next time any dialog
  // opens — reset it on every open (and close; harmless either way).
  function setPendingDelete(next: PendingDelete | null) {
    mutation.reset();
    setPendingDeleteState(next);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    try {
      await mutation.mutateAsync(toId(pendingDelete.id));
      setPendingDeleteState(null);
    } catch {
      // mutation.isError surfaces the failure in the dialog — stay open so the user can retry.
    }
  }

  return { pendingDelete, setPendingDelete, handleConfirmDelete };
}
