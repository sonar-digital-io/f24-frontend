import { useState } from 'react';
import { toast } from 'sonner';
import { useGeometrySpars, useUpdateGeometrySpars } from '@/hooks/api/useGeometry';
import { useHydrateOnce } from '@/hooks/useHydrateOnce';
import { nextLocalId } from '@/lib/utils';
import type { GeometrySpar } from '@/api/types/geometry';

export interface SparDraft {
  localId: string;
  id?: number;
  startProfileId: number | null;
  endProfileId: number | null;
  startUpper: number | null;
  startLower: number | null;
  endUpper: number | null;
  endLower: number | null;
}

function toDraft(spar: GeometrySpar): SparDraft {
  return {
    localId: String(spar.id ?? nextLocalId('spar')),
    id: spar.id,
    startProfileId: spar.start_profile,
    endProfileId: spar.end_profile,
    startUpper: spar.start_upper_position,
    startLower: spar.start_lower_position,
    endUpper: spar.end_upper_position,
    endLower: spar.end_lower_position,
  };
}

/** A spar is only complete (savable) once both profiles and all four
 *  positions have been explicitly set — there are no default values. */
function isComplete(draft: SparDraft): boolean {
  return (
    draft.startProfileId != null &&
    draft.endProfileId != null &&
    draft.startUpper != null &&
    draft.startLower != null &&
    draft.endUpper != null &&
    draft.endLower != null
  );
}

function toPayload(draft: SparDraft): GeometrySpar {
  return {
    ...(draft.id !== undefined ? { id: draft.id } : {}),
    start_profile: draft.startProfileId!,
    start_upper_position: draft.startUpper!,
    start_lower_position: draft.startLower!,
    end_profile: draft.endProfileId!,
    end_upper_position: draft.endUpper!,
    end_lower_position: draft.endLower!,
  };
}

/** Local editable state for the Spars tab's table + twist/parallel toggles,
 *  hydrated from GET /geometry/:id/spars/ and saved back via PUT on demand. */
export function useSparsState(geometryId: number) {
  const sparsQuery = useGeometrySpars(geometryId);
  const updateMutation = useUpdateGeometrySpars(geometryId);

  const [spars, setSpars] = useState<SparDraft[]>([]);
  const [twist, setTwist] = useState(false);
  const [parallel, setParallel] = useState(false);

  useHydrateOnce(!sparsQuery.isFetching && !!sparsQuery.data, () => {
    const data = sparsQuery.data!;
    setSpars(data.spars.map(toDraft));
    setTwist(data.twist);
    setParallel(data.parallel);
  });

  function addSpar() {
    setSpars((arr) => [
      ...arr,
      {
        localId: nextLocalId('spar'),
        startProfileId: null,
        endProfileId: null,
        startUpper: null,
        startLower: null,
        endUpper: null,
        endLower: null,
      },
    ]);
  }

  function updateSpar(localId: string, patch: Partial<SparDraft>) {
    setSpars((arr) => arr.map((s) => (s.localId === localId ? { ...s, ...patch } : s)));
  }

  function deleteSpar(localId: string) {
    setSpars((arr) => arr.filter((s) => s.localId !== localId));
  }

  async function save() {
    const complete = spars.filter(isComplete);
    if (complete.length < spars.length) {
      toast.error('Some spars are missing a profile or position and were not saved.');
    }
    await updateMutation.mutateAsync({
      twist,
      parallel,
      spars: complete.map(toPayload),
    });
  }

  return {
    spars,
    addSpar,
    updateSpar,
    deleteSpar,
    twist,
    setTwist,
    parallel,
    setParallel,
    save,
    saving: updateMutation.isPending,
    loading: sparsQuery.isLoading,
    loadError: sparsQuery.isError,
  };
}
