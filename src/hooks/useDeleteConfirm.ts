import { useState } from 'react';

interface PendingDelete {
  id: string;
  name: string;
}

interface DeleteMutationLike {
  mutateAsync: (id: number) => Promise<unknown>;
  isPending: boolean;
  isError: boolean;
}

/**
 * Shared "row delete -> confirm dialog -> mutate" state for list pages
 * (Material/Composition/Geometry/LoadGroup): tracks which row is pending
 * deletion; on confirm, awaits the mutation and clears it on success —
 * `mutation.isError` surfaces the failure in the dialog (see
 * `DeleteConfirmDialog`), so it stays open for retry instead of closing.
 */
export function useDeleteConfirm(mutation: DeleteMutationLike) {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    try {
      await mutation.mutateAsync(Number(pendingDelete.id));
      setPendingDelete(null);
    } catch {
      // mutation.isError surfaces the failure in the dialog — stay open so the user can retry.
    }
  }

  return { pendingDelete, setPendingDelete, handleConfirmDelete };
}
