import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { geometryKeys, useGeometryProfiles, useGeometryTopView } from '@/hooks/api/useGeometry';
import { getGeometryProfile } from '@/api/geometry';
import { useSparsState } from '@/hooks/useSparsState';
import { SparsPreviewPanel } from '@/components/geometry/SparsPreviewPanel';
import { SparsTable } from '@/components/geometry/SparsTable';

interface SparsSectionProps {
  geometryId: number;
}

export function SparsSection({ geometryId }: SparsSectionProps) {
  const topViewQuery = useGeometryTopView(geometryId);
  const profilesQuery = useGeometryProfiles(geometryId);
  const profiles = profilesQuery.data?.profiles ?? [];
  const { spars, addSpar, updateSpar, deleteSpar, twist, setTwist, parallel, setParallel } =
    useSparsState(geometryId);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expandedSpar = spars.find((s) => s.localId === expandedId);
  const highlightProfileIds = expandedSpar
    ? [expandedSpar.startProfileId, expandedSpar.endProfileId].filter((id): id is number => id != null)
    : [];

  // The preview canvas needs each spar's start/end profile's real contour to
  // turn its arc-length position into a chordwise location (see
  // SparsPreviewPanel) — fetch only the profiles actually referenced by a spar.
  const referencedProfileIds = Array.from(
    new Set(spars.flatMap((s) => [s.startProfileId, s.endProfileId]).filter((id): id is number => id != null)),
  );
  const profilePointsQueries = useQueries({
    queries: referencedProfileIds.map((profileId) => ({
      queryKey: geometryKeys.profile(geometryId, profileId),
      queryFn: () => getGeometryProfile(geometryId, profileId),
    })),
  });
  const profilePointsById = new Map<number, [number, number][]>();
  referencedProfileIds.forEach((profileId, i) => {
    const data = profilePointsQueries[i]?.data;
    if (data) profilePointsById.set(profileId, data as [number, number][]);
  });

  return (
    <div className="flex flex-col gap-4">
      <SparsPreviewPanel
        topView={topViewQuery.data}
        isLoading={topViewQuery.isLoading}
        isError={topViewQuery.isError}
        profiles={profiles}
        spars={spars}
        profilePointsById={profilePointsById}
        highlightProfileIds={highlightProfileIds}
        noTwist={!twist}
        onNoTwistChange={(v) => setTwist(!v)}
        parallel={parallel}
        onParallelChange={setParallel}
      />

      <SparsTable
        geometryId={geometryId}
        spars={spars}
        profiles={profiles}
        onAdd={addSpar}
        onChange={updateSpar}
        onDelete={(localId) => {
          deleteSpar(localId);
          setExpandedId((cur) => (cur === localId ? null : cur));
        }}
        expandedId={expandedId}
        onToggleExpand={(localId) => setExpandedId((cur) => (cur === localId ? null : localId))}
      />
    </div>
  );
}
