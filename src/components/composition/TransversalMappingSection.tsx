import { useEffect, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  CrossSectionDialog,
  type TransversalMappingEntryForCs,
} from '@/components/composition/CrossSectionDialog';
import { CrossSectionProfileList } from '@/components/composition/CrossSectionProfileList';
import { TransversalProfileBoundaryPopover } from '@/components/composition/TransversalProfileBoundaryPopover';
import { ConfirmDialog } from '@/components/common/dialog/ConfirmDialog';
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
import { LAYUP_MAPPING_COLORS, TRANSVERSAL_MAPPING_COLORS } from '@/lib/crossSectionGeometry';

interface TransversalMappingSectionProps {
  compositionId: number;
  /** The composition's current geometry id, as already resolved by the parent
   *  (persisted `composition.geometry` once saved, or the locally-picked one
   *  before the first save) — this component is always mounted (hidden via
   *  CSS while another tab is active, so its own state survives tab
   *  switches), so re-deriving this from its own `compositionDetail` fetch
   *  would miss the not-yet-persisted case and leave the profile list
   *  permanently empty during composition creation. */
  geometryId: number;
  /** Reports this section's own autosave pending/error state up to the page
   *  header's shared save-status indicator — this table has no save
   *  indicator of its own. */
  onSaveStatusChange?: (status: { pending: boolean; error: boolean }) => void;
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

export function TransversalMappingSection({
  compositionId,
  geometryId,
  onSaveStatusChange,
}: TransversalMappingSectionProps) {
  const [mappings, setMappings] = useState<TransversalMapping[]>([]);
  const { data: compositionDetail } = useCompositionDetail(compositionId);
  const layupOptions = (compositionDetail?.layups ?? []).map((l) => ({
    value: String(l.id),
    label: l.name,
  }));
  const { data: geometryProfilesData } = useGeometryProfiles(geometryId);
  const crossSectionProfiles = geometryProfilesData?.profiles ?? [];
  const { data: transversalMappingData } = useCompositionMappingTransversal(compositionId);
  const { data: intersectionsData } = useCompositionIntersections(compositionId);
  const updateTransversalMutation = useUpdateCompositionMappingTransversal(compositionId);
  const [boundaryEditor, setBoundaryEditor] = useState<OpenBoundaryEditor | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // Snapshot of the last-persisted mapping state — drives the autosave
  // debounce below, and is kept in sync with hydration so loading an
  // already-saved composition doesn't immediately re-save it.
  const [savedMappingsSnapshot, setSavedMappingsSnapshot] = useState<string | null>(null);
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
      const hydrated = hydrateTransversalMappings(transversalMappingData!, crossSectionProfiles);
      setMappings(hydrated);
      setSavedMappingsSnapshot(JSON.stringify(hydrated));
    },
  );

  /** Every profile a mapping's start/end profile range covers, sorted by
   *  span position — the same "which profiles does this row touch" logic
   *  used by the span chart, the live cross-section rings below, and the
   *  cross-section dialog's entries, so all three always agree. */
  function getCoveredProfiles(mapping: TransversalMapping) {
    if (mapping.startProfileId == null || mapping.endProfileId == null) return [];
    const sorted = [...crossSectionProfiles].sort((a, b) => a.position - b.position);
    const startIdx = sorted.findIndex((p) => p.id === mapping.startProfileId);
    const endIdx = sorted.findIndex((p) => p.id === mapping.endProfileId);
    if (startIdx === -1 || endIdx === -1) return [];
    const [lo, hi] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    return sorted.slice(lo, hi + 1);
  }

  /** A mapping's color, keyed to its position in the table (not the per-profile
   *  filtered list) so it's the same green/red everywhere this mapping shows up —
   *  the cross-section dialog's rings, the table, and the boundary editor's
   *  highlight/handles — instead of drifting depending on which other mappings
   *  happen to also cover the profile being viewed. */
  function transversalMappingColorFor(mappingId: string): string {
    const idx = mappings.findIndex((m) => m.id === mappingId);
    return TRANSVERSAL_MAPPING_COLORS[(idx === -1 ? 0 : idx) % TRANSVERSAL_MAPPING_COLORS.length];
  }

  /**
   * Reference regions showing where each layup mapping (a longitudinal
   * mapping's own upper/lower boundary strip, edited on the "Layup mapping"
   * tab) sits on one profile — drawn even when no transversal mapping has
   * been created yet. The backend already resolves each longitudinal
   * mapping's two edges into `type: 'mapping'` intersections (`index` 0/1)
   * for every profile, in the same 0..1 perimeter-fraction space transversal
   * mappings use, so this just pairs them up rather than re-deriving
   * anything from the mapping's own (longitudinal_position, transversal_
   * position) curve (a different, blade-relative coordinate space).
   */
  function longitudinalMappingEntriesForProfile(profileId: number): TransversalMappingEntryForCs[] {
    const list = intersectionsData?.find((p) => p.profile_id === profileId)?.intersections ?? [];
    const bySideAndMapping = new Map<string, typeof list>();
    list.forEach((i) => {
      if (i.type !== 'mapping' || i.longitudinal_mapping_id == null || i.side == null) return;
      const key = `${i.longitudinal_mapping_id}:${i.side}`;
      const arr = bySideAndMapping.get(key) ?? [];
      arr.push(i);
      bySideAndMapping.set(key, arr);
    });
    const longitudinalEntries = [
      ...(compositionDetail?.longitudinal_mapping?.upper_side ?? []),
      ...(compositionDetail?.longitudinal_mapping?.lower_side ?? []),
    ];
    const result: TransversalMappingEntryForCs[] = [];
    bySideAndMapping.forEach((arr, key) => {
      if (arr.length < 2) return; // need both edges to draw a region
      const [a, b] = [...arr].sort((x, y) => (x.index ?? 0) - (y.index ?? 0));
      const [longitudinalMappingId, side] = key.split(':');
      const lmEntry = longitudinalEntries.find((e) => String(e.id) === longitudinalMappingId);
      result.push({
        id: `lm-${key}`,
        name: a.longitudinal_mapping_name ?? 'Layup mapping',
        layupName:
          layupOptions.find((l) => l.value === String(lmEntry?.layup))?.label ?? 'Layup mapping',
        startFrac: a.position,
        endFrac: b.position,
        startLockedToLabel: describeIntersection(a),
        endLockedToLabel: describeIntersection(b),
        color: side === 'upper' ? LAYUP_MAPPING_COLORS.upper : LAYUP_MAPPING_COLORS.lower,
      });
    });
    return result;
  }

  // Mapping rings per profile, for the list thumbnails — drawn from the
  // live editable `mappings` state (not the last-saved GET response), so an
  // in-progress, not-yet-saved mapping shows up here immediately too. Layup
  // mapping reference regions are included for every profile up front — they
  // exist independently of any transversal mapping, so the thumbnails should
  // always carry them, same as the cross-section dialog does.
  const ringsByProfileId = new Map<
    number,
    { startFrac: number; endFrac: number; color?: string }[]
  >();
  crossSectionProfiles.forEach((profile) => {
    const layupRings = longitudinalMappingEntriesForProfile(profile.id).map((e) => ({
      startFrac: e.startFrac,
      endFrac: e.endFrac,
      color: e.color,
    }));
    if (layupRings.length > 0) ringsByProfileId.set(profile.id, layupRings);
  });
  mappings.forEach((m) => {
    getCoveredProfiles(m).forEach((profile) => {
      const b = getMappingBoundary(m, profile.id);
      if (b.startPosition == null || b.endPosition == null) return;
      const rings = ringsByProfileId.get(profile.id) ?? [];
      rings.push({ startFrac: b.startPosition, endFrac: b.endPosition });
      ringsByProfileId.set(profile.id, rings);
    });
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

  function confirmDeleteMapping() {
    if (!pendingDeleteId) return;
    deleteMapping(pendingDeleteId);
    setPendingDeleteId(null);
  }

  // Autosave — debounced so it fires after the user pauses editing, and only
  // once every row is actually complete (a row still missing a profile/layup/
  // boundary position is silently left out of the request rather than
  // treated as an error; the user just hasn't finished it yet). A failed
  // save is attempted once per distinct mapping state — it does not retry in
  // a loop; it tries again only once the user changes something.
  const mappingsKey = JSON.stringify(mappings);
  const hasUnsavedMappings = mappings.length > 0 && mappingsKey !== savedMappingsSnapshot;
  const lastMappingsAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasUnsavedMappings || updateTransversalMutation.isPending) return;
    if (updateTransversalMutation.isError && lastMappingsAttemptRef.current === mappingsKey) return;

    const { payload, incomplete } = buildTransversalMappingPayload(
      mappings,
      crossSectionProfiles,
      intersectionsData,
    );
    if (incomplete > 0) return;

    const timer = setTimeout(() => {
      lastMappingsAttemptRef.current = mappingsKey;
      updateTransversalMutation.mutate(payload, {
        onSuccess: () => setSavedMappingsSnapshot(mappingsKey),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      });
    }, 800);
    return () => clearTimeout(timer);
    // updateTransversalMutation is a fresh object every render; only the
    // tracked values below should gate the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mappingsKey,
    hasUnsavedMappings,
    updateTransversalMutation.isPending,
    updateTransversalMutation.isError,
  ]);

  useEffect(() => {
    onSaveStatusChange?.({
      pending: updateTransversalMutation.isPending,
      error: updateTransversalMutation.isError,
    });
    // onSaveStatusChange is a fresh closure every render; only the tracked
    // mutation flags below should re-report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateTransversalMutation.isPending, updateTransversalMutation.isError]);

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
  return (
    <div className="flex flex-col gap-6">
      {/* Top: transversal mapping table */}
      <div className="relative flex w-full max-w-[900px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#e5e7eb]">
              <th className="h-8 w-[140px] px-2 text-left font-medium text-[#6b7280]">Name</th>
              <th className="h-8 w-[140px] px-2 text-left font-medium text-[#6b7280]">Layup</th>
              <th className="h-8 w-[190px] px-2 text-left font-medium text-[#6b7280]">
                Start profile
              </th>
              <th className="h-8 w-[190px] px-2 text-left font-medium text-[#6b7280]">
                End profile
              </th>
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
                onUpdate={(next) => updateMapping(m.id, next)}
                onEditStartBoundary={() =>
                  setBoundaryEditor({ mappingId: m.id, profileId: m.startProfileId! })
                }
                onEditEndBoundary={() =>
                  setBoundaryEditor({ mappingId: m.id, profileId: m.endProfileId! })
                }
                onDelete={() => setPendingDeleteId(m.id)}
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
        </div>

        <ConfirmDialog
          open={pendingDeleteId != null}
          title="Delete transversal mapping"
          message="This removes the mapping and saves automatically. This can't be undone."
          confirmLabel="Delete"
          danger
          onConfirm={confirmDeleteMapping}
          onCancel={() => setPendingDeleteId(null)}
        />

        {editingMapping && editingProfileId != null && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="boundary-editor-title"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setBoundaryEditor(null);
            }}
          >
            <TransversalProfileBoundaryPopover
              profileName={
                profileOptions.find((p) => p.value === String(editingProfileId))?.label ?? ''
              }
              color={transversalMappingColorFor(editingMapping.id)}
              points={pointsByProfileId.get(editingProfileId)}
              boundary={getMappingBoundary(editingMapping, editingProfileId)}
              lockOptions={editingLockOptions}
              // Picking a lock target should also move the point onto that
              // landmark — the popover only knows the labels, so the caller
              // fills in the intersection's own position.
              onChange={(patch) => {
                const enriched = { ...patch };
                if (patch.startLockedTo != null) {
                  const i = editingIntersections.find((x) => x.id === patch.startLockedTo);
                  if (i) enriched.startPosition = i.position;
                }
                if (patch.endLockedTo != null) {
                  const i = editingIntersections.find((x) => x.id === patch.endLockedTo);
                  if (i) enriched.endPosition = i.position;
                }
                updateBoundary(editingMapping.id, editingProfileId!, enriched);
              }}
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

      {/* Cross-section view dialog — SVG rings + table both come from the
          live editable `mappings` state (not the last-saved GET response),
          so a mapping you've configured but not yet saved shows up here too. */}
      {crossSectionProfile &&
        crossSectionPoints &&
        (() => {
          const prof = crossSectionProfiles.find((p) => String(p.id) === crossSectionProfile);
          if (!prof) return null;
          const profileId = Number(crossSectionProfile);
          const profileIntersections =
            intersectionsData?.find((p) => p.profile_id === profileId)?.intersections ?? [];
          const entries = mappings
            .filter((m) => getCoveredProfiles(m).some((p) => p.id === profileId))
            .map((m) => {
              const b = getMappingBoundary(m, profileId);
              return {
                id: `${m.groupId}-${profileId}`,
                name: m.name,
                layupName:
                  layupOptions.find((l) => l.value === m.layupId)?.label ?? 'Unknown layup',
                startFrac: b.startPosition ?? 0,
                endFrac: b.endPosition ?? 0,
                startLockedToLabel: describeIntersection(
                  profileIntersections.find((i) => i.id === b.startLockedTo),
                ),
                endLockedToLabel: describeIntersection(
                  profileIntersections.find((i) => i.id === b.endLockedTo),
                ),
                color: transversalMappingColorFor(m.id),
                onEdit: () => setBoundaryEditor({ mappingId: m.id, profileId }),
              };
            });
          // Layup-mapping reference regions (blue = upper, orange = lower)
          // shown alongside — these exist independently of any transversal
          // mapping, so they still show up even with an empty table above.
          const allEntries: TransversalMappingEntryForCs[] = [
            ...longitudinalMappingEntriesForProfile(profileId),
            ...entries,
          ];

          return (
            <CrossSectionDialog
              profileName={prof.name}
              points={crossSectionPoints as [number, number][]}
              entries={allEntries}
              onClose={() => setCrossSectionProfile(null)}
            />
          );
        })()}
    </div>
  );
}
