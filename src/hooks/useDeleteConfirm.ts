import { useState } from 'react';

interface PendingDelete {
  id: string;
  name: string;
}

interface DeleteMutationLike<TId> {
  mutateAsync: (id: TId) => Promise<unknown>;
  isPending: boolean;
  isError: boolean;
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
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    try {
      await mutation.mutateAsync(toId(pendingDelete.id));
      setPendingDelete(null);
    } catch {
      // mutation.isError surfaces the failure in the dialog — stay open so the user can retry.
    }
  }

  return { pendingDelete, setPendingDelete, handleConfirmDelete };
}
