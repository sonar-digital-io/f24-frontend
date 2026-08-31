import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { CrossSectionDialog } from '@/components/composition/CrossSectionDialog';
import { CrossSectionProfileList } from '@/components/composition/CrossSectionProfileList';
import { TransversalProfileBoundaryPopover } from '@/components/composition/TransversalProfileBoundaryPopover';
import {
  TransversalMappingRow,
  getMappingBoundary,
  type ProfileBoundary,
  type TransversalMapping,
} from '@/components/composition/TransversalMappingRow';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  describeIntersection,
  buildTransversalMappingPayload,
  hydrateTransversalMappings,
  resizeMappingRange,
} from '@/lib/transversalMapping';
import { useHydrateOnce } from '@/hooks/useHydrateOnce';
import {
  useCompositionDetail,
  useCompositionMappingTransversal,
  useCompositionIntersections,
  useUpdateCompositionMappingTransversal,
} from '@/hooks/api/useComposition';
import { geometryKeys, useGeometryProfiles, useGeometryProfile } from '@/hooks/api/useGeometry';
import { getGeometryProfile } from '@/api/geometry';

interface TransversalMappingSectionProps {
  compositionId: number;
}

function newDraft(): TransversalMapping {
  return {
    id: crypto.randomUUID(),
    groupId: crypto.randomUUID(),
    name: '',
    layupId: null,
    startProfileId: null,
    endProfileId: null,
    profileBoundaries: {},
  };
}

interface OpenBoundaryEditor {
  mappingId: string;
  profileId: number;
}

export function TransversalMappingSection({ compositionId }: TransversalMappingSectionProps) {
  const [mappings, setMappings] = useState<TransversalMapping[]>([]);
  const { data: compositionDetail } = useCompositionDetail(compositionId);
  const layupOptions = (compositionDetail?.layups ?? []).map((l) => ({
    value: String(l.id),
    label: l.name,
  }));
  const geometryId =
    typeof compositionDetail?.geometry === 'number' ? compositionDetail.geometry : NaN;
  const { data: geometryProfilesData } = useGeometryProfiles(geometryId);
  const crossSectionProfiles = geometryProfilesData?.profiles ?? [];
  const { data: transversalMappingData } = useCompositionMappingTransversal(compositionId);
  const { data: intersectionsData } = useCompositionIntersections(compositionId);
  const updateTransversalMutation = useUpdateCompositionMappingTransversal(compositionId);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [boundaryEditor, setBoundaryEditor] = useState<OpenBoundaryEditor | null>(null);
  // Real geometry profile id (as a string) for the Cross-section view.
  const [crossSectionProfile, setCrossSectionProfile] = useState<string | null>(null);
  const crossSectionProfileId = crossSectionProfile ? Number(crossSectionProfile) : NaN;
  const { data: crossSectionPoints } = useGeometryProfile(geometryId, crossSectionProfileId);

  // The list shows every profile's own cross-section preview, not just the
  // selected one — fetch each profile's raw contour up front.
  const profilePointsQueries = useQueries({
    queries: crossSectionProfiles.map((p) => ({
      queryKey: geometryKeys.profile(geometryId, p.id),
      queryFn: () => getGeometryProfile(geometryId, p.id),
    })),
  });
  const pointsByProfileId = new Map<number, [number, number][]>();
  crossSectionProfiles.forEach((p, i) => {
    const data = profilePointsQueries[i]?.data;
    if (data) pointsByProfileId.set(p.id, data as [number, number][]);
  });

  const profileOptions = crossSectionProfiles.map((p) => ({
    value: String(p.id),
    label: `${p.name} (${p.position})`,
  }));

  // Hydrate the editable table from whatever's already saved — group the
  // per-profile entries (GET's shape) back into rows by group_id.
  useHydrateOnce(
    mappings.length === 0 && !!transversalMappingData && crossSectionProfiles.length > 0,
    () => {
      setMappings(hydrateTransversalMappings(transversalMappingData!, crossSectionProfiles));
    },
  );

  // Saved mapping rings per profile, for the list thumbnails — drawn from
  // whatever the backend has (freshest right after a save, since the mutation
  // writes its response straight into this same query's cache).
  const ringsByProfileId = new Map<number, { startFrac: number; endFrac: number }[]>();
  transversalMappingData?.transversal_mapping.forEach((p) => {
    ringsByProfileId.set(
      p.profile_id,
      p.mappings.map((m) => ({ startFrac: m.start_position, endFrac: m.end_position })),
    );
  });

  function updateMapping(id: string, patch: Partial<TransversalMapping>) {
    setMappings((arr) =>
      arr.map((m) => {
        if (m.id !== id) return m;
        const next = { ...m, ...patch };
        if ('startProfileId' in patch || 'endProfileId' in patch) {
          return resizeMappingRange(next, crossSectionProfiles);
        }
        return next;
      }),
    );
  }

  function updateBoundary(id: string, profileId: number, patch: Partial<ProfileBoundary>) {
    setMappings((arr) =>
      arr.map((m) => {
        if (m.id !== id) return m;
        const current = getMappingBoundary(m, profileId);
        return {
          ...m,
          profileBoundaries: { ...m.profileBoundaries, [profileId]: { ...current, ...patch } },
        };
      }),
    );
  }

  function deleteMapping(id: string) {
    setMappings((arr) => arr.filter((m) => m.id !== id));
  }

  async function handleSave() {
    const { payload, incomplete } = buildTransversalMappingPayload(
      mappings,
      crossSectionProfiles,
      intersectionsData,
    );
    if (incomplete > 0) {
      toast.error(
        incomplete === 1
          ? 'One transversal mapping is missing a profile, layup, or boundary position and was not saved.'
          : `${incomplete} transversal mappings are missing a profile, layup, or boundary position and were not saved.`,
      );
    }
    try {
      await updateTransversalMutation.mutateAsync(payload);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  const editingMapping = boundaryEditor
    ? mappings.find((m) => m.id === boundaryEditor.mappingId)
    : undefined;
  const editingProfileId = editingMapping ? boundaryEditor!.profileId : null;
  const editingIntersections =
    intersectionsData?.find((p) => p.profile_id === editingProfileId)?.intersections ?? [];
  const editingLockOptions = [
    { value: 'unlocked', label: 'Unlocked' },
    ...editingIntersections.map((i) => ({ value: String(i.id), label: describeIntersection(i) })),
  ];
  // Other mappings that also touch this same profile at one of their own
  // ends — shown as context when "Show all layups" is checked.
  const otherRings =
    editingMapping && editingProfileId != null
      ? mappings
          .filter((m) => m.id !== editingMapping.id)
          .flatMap((m) => {
            const rings: { startFrac: number; endFrac: number }[] = [];
            const b = getMappingBoundary(m, editingProfileId);
            if (b.startPosition != null && b.endPosition != null) {
              rings.push({ startFrac: b.startPosition, endFrac: b.endPosition });
            }
            return rings;
          })
      : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Top: transversal mapping table */}
      <div className="relative flex w-full max-w-[900px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#e5e7eb]">
              <th className="h-8 w-[140px] px-2 text-left font-medium text-[#6b7280]">Name</th>
              <th className="h-8 w-[160px] px-2 text-left font-medium text-[#6b7280]">Layup</th>
              <th className="h-8 px-2 text-left font-medium text-[#6b7280]">Start profile</th>
              <th className="h-8 px-2 text-left font-medium text-[#6b7280]">End profile</th>
              <th className="h-8 w-[40px] px-2" />
            </tr>
          </thead>
          <tbody>
            {mappings.map((m) => (
              <TransversalMappingRow
                key={m.id}
                mapping={m}
                layupOptions={layupOptions}
                profileOptions={profileOptions}
                editingName={editingNameId === m.id}
                onStartEditingName={() => setEditingNameId(m.id)}
                onStopEditingName={() => setEditingNameId(null)}
                onUpdate={(next) => updateMapping(m.id, next)}
                onEditStartProfile={() =>
                  m.startProfileId != null &&
                  setBoundaryEditor({ mappingId: m.id, profileId: m.startProfileId })
                }
                onEditEndProfile={() =>
                  m.endProfileId != null &&
                  setBoundaryEditor({ mappingId: m.id, profileId: m.endProfileId })
                }
                onDelete={() => deleteMapping(m.id)}
              />
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMappings((arr) => [...arr, newDraft()])}
            className="inline-flex h-8 items-center gap-2 self-start rounded-md border border-[#e2e8f0] bg-white px-3 text-[12px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add transversal mapping
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateTransversalMutation.isPending || mappings.length === 0}
            className="inline-flex h-8 items-center gap-2 rounded-md bg-[#006496] px-3 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {updateTransversalMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>

        {editingMapping && editingProfileId != null && (
          <div className="absolute left-0 top-[calc(100%+8px)] z-40">
            <TransversalProfileBoundaryPopover
              profileName={
                profileOptions.find((p) => p.value === String(editingProfileId))?.label ?? ''
              }
              points={pointsByProfileId.get(editingProfileId)}
              boundary={getMappingBoundary(editingMapping, editingProfileId)}
              lockOptions={editingLockOptions}
              otherRings={otherRings}
              onChange={(patch) => updateBoundary(editingMapping.id, editingProfileId!, patch)}
              onClose={() => setBoundaryEditor(null)}
            />
          </div>
        )}
      </div>

      {/* Cross-section view list */}
      <div className="flex flex-row items-start gap-6">
        <CrossSectionProfileList
          profiles={crossSectionProfiles}
          pointsByProfileId={pointsByProfileId}
          ringsByProfileId={ringsByProfileId}
          selected={crossSectionProfile}
          onSelect={setCrossSectionProfile}
        />
      </div>

      {/* Cross-section view dialog — SVG rings + table both come straight
          from GET /composition/:id/mapping/transversal/ for this profile. */}
      {crossSectionProfile &&
        crossSectionPoints &&
        (() => {
          const prof = crossSectionProfiles.find((p) => String(p.id) === crossSectionProfile);
          if (!prof) return null;
          const profileMappings =
            transversalMappingData?.transversal_mapping.find(
              (p) => p.profile_id === Number(crossSectionProfile),
            )?.mappings ?? [];
          const profileIntersections =
            intersectionsData?.find((p) => p.profile_id === Number(crossSectionProfile))
              ?.intersections ?? [];
          const entries = profileMappings.map((m, i) => ({
            id: m.group_id || `${crossSectionProfile}-${i}`,
            name: m.name,
            layupName:
              layupOptions.find((l) => Number(l.value) === m.layup)?.label ?? 'Unknown layup',
            startFrac: m.start_position,
            endFrac: m.end_position,
            startLockedToLabel: describeIntersection(
              profileIntersections.find((i) => i.id === m.start_locked_to),
            ),
            endLockedToLabel: describeIntersection(
              profileIntersections.find((i) => i.id === m.end_locked_to),
            ),
          }));

          return (
            <CrossSectionDialog
              profileName={prof.name}
              points={crossSectionPoints as [number, number][]}
              entries={entries}
              onClose={() => setCrossSectionProfile(null)}
            />
          );
        })()}
    </div>
  );
}
