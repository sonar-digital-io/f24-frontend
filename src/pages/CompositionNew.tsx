import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useExitEditModeTarget } from '@/hooks/useExitEditModeTarget';
import { toast } from 'sonner';
import { MainNav } from '@/components/common/layout/MainNav';
import {
  CompositionEditToolbar,
  type CompositionTab,
} from '@/components/composition/CompositionEditToolbar';
import type { SaveStatus } from '@/components/common/layout/EditPageToolbarActions';
import { CompositionLayupMappingPanel } from '@/components/composition/CompositionLayupMappingPanel';
import { LayupPickerDialog } from '@/components/composition/LayupPickerDialog';
import { LayupMappingDialog } from '@/components/composition/LayupMappingDialog';
import { TransversalMappingSection } from '@/components/composition/TransversalMappingSection';
import { CompositionGeneralTab } from '@/components/composition/CompositionGeneralTab';
import { CompositionGeometryTab } from '@/components/composition/CompositionGeometryTab';
import { CompositionPreviewTab } from '@/components/composition/CompositionPreviewTab';
import {
  CompositionLayupTab,
  type CompositionLayup,
} from '@/components/composition/CompositionLayupTab';
import { getMaterialColor, type Ply } from '@/components/layup/LayupBuilder';
import { type LayupMapping } from '@/components/composition/LayupMappingTable';
import { nextLocalId, todayISO, toIsoDateTime, toDateInputValue } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/apiError';
import { computeMappingBounds, computeProfilesBoundingRect, niceStep } from '@/lib/bezierMath';
import type { ControlPoint } from '@/types';
import {
  useCreateComposition,
  useCompositionDetail,
  useUpdateComposition,
  useUpdateCompositionMappingLongitudinal,
  useFetchCompositionIntersections,
  useFetchCompositionMappingTransversal,
} from '@/hooks/api/useComposition';
import { useMaterialList } from '@/hooks/api/useMaterials';
import { useHydrateOnce } from '@/hooks/useHydrateOnce';
import { updateCompositionSettings } from '@/api/composition';
import { getGeometryProfile } from '@/api/geometry';
import { geometryKeys, useGeometryTopView } from '@/hooks/api/useGeometry';

/** Identifies an upper/lower mapping state for the autosave debounce and the
 *  transversal-mapping "is this already computed" check below. */
function mappingsSnapshotKey(upper: LayupMapping[], lower: LayupMapping[]): string {
  return JSON.stringify({ upper, lower });
}

export function CompositionNew() {
  const navigate = useNavigate();
  const exitTarget = useExitEditModeTarget('/composition');
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(id);
  const compositionId = isEditing ? Number(id) : NaN;
  const duplicateFromRaw = !isEditing ? searchParams.get('duplicateFrom') : null;
  const duplicateSourceId = duplicateFromRaw ? Number(duplicateFromRaw) : NaN;

  const queryClient = useQueryClient();
  const detailQuery = useCompositionDetail(compositionId);
  const duplicateQuery = useCompositionDetail(duplicateSourceId);
  const createMutation = useCreateComposition();
  const updateMutation = useUpdateComposition(compositionId);
  const updateMappingLongitudinalMutation = useUpdateCompositionMappingLongitudinal(compositionId);
  const fetchIntersectionsMutation = useFetchCompositionIntersections();
  const fetchMappingTransversalMutation = useFetchCompositionMappingTransversal();
  const layupMappingSavePending =
    updateMappingLongitudinalMutation.isPending ||
    fetchIntersectionsMutation.isPending ||
    fetchMappingTransversalMutation.isPending;
  const layupMappingSaveError =
    updateMappingLongitudinalMutation.isError ||
    fetchIntersectionsMutation.isError ||
    fetchMappingTransversalMutation.isError;
  const layupOptions = detailQuery.data?.layups ?? [];
  const materialsQuery = useMaterialList();

  // Geometry pick
  const [geomQuery, setGeomQuery] = useState('');
  const [selectedGeometryId, setSelectedGeometryId] = useState<string | null>(null);

  // The top-view data (blade planform, used by the layup mapping charts) has
  // to come from whichever geometry is current — the persisted composition's
  // geometry once saved, but the locally-picked one during creation/before
  // the first save, since there's no persisted composition yet to read it from.
  const geometryId =
    typeof detailQuery.data?.geometry === 'number'
      ? detailQuery.data.geometry
      : selectedGeometryId
        ? Number(selectedGeometryId)
        : NaN;
  const topViewQuery = useGeometryTopView(geometryId);
  const leadingEdge = (topViewQuery.data?.leading_edge ?? []).map(([x, y]) => ({ x, y }));
  const trailingEdge = (topViewQuery.data?.trailing_edge ?? []).map(([x, y]) => ({ x, y }));
  // Longitudinal/transversal mapping points are stored by the API as a
  // fraction of the geometry's nominal_radius; the bezier editor works in
  // that same absolute (real) scale as the top-view leading/trailing edge.
  const nominalRadius = topViewQuery.data?.nominal_radius || 1;

  const [activeTab, setActiveTab] = useState<CompositionTab>('general');

  // General — hydrated from the backend for edit/duplicate. Layup mapping and
  // transversal mapping stay on local state: they carry rich shapes (bezier
  // curves, per-side tables) the typed backend payloads don't fully describe
  // yet — wiring those needs a real data-source swap, left for a follow-up.
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());
  const [solidCore, setSolidCore] = useState(false);
  const [targetWeight, setTargetWeight] = useState('');
  const [baseline, setBaseline] = useState<{
    name: string;
    description: string;
    date: string;
  } | null>(null);
  // Separate from `baseline` (name/description/date): target weight saves
  // only on blur, on its own schedule, so it needs its own "last persisted
  // value" to diff against instead of riding along with the debounced autosave.
  const [targetWeightBaseline, setTargetWeightBaseline] = useState('');

  useHydrateOnce(isEditing && !detailQuery.isFetching && !!detailQuery.data, () => {
    const c = detailQuery.data!;
    const hydratedDescription = c.description ?? '';
    const hydratedDate =
      typeof c.created_at === 'string' ? toDateInputValue(c.created_at) : todayISO();
    const hydratedTargetWeight = c.settings?.find((s) => s.reference === 'target_weight')?.value;
    const hydratedTargetWeightStr =
      hydratedTargetWeight !== undefined ? String(hydratedTargetWeight) : '';
    setName(c.name);
    setDescription(hydratedDescription);
    setDate(hydratedDate);
    if (hydratedTargetWeightStr) setTargetWeight(hydratedTargetWeightStr);
    if (c.geometry != null) setSelectedGeometryId(String(c.geometry));
    setBaseline({ name: c.name, description: hydratedDescription, date: hydratedDate });
    setTargetWeightBaseline(hydratedTargetWeightStr);
  });

  useHydrateOnce(
    !isEditing &&
      Number.isFinite(duplicateSourceId) &&
      !duplicateQuery.isFetching &&
      !!duplicateQuery.data,
    () => {
      const c = duplicateQuery.data!;
      setName(`${c.name}_copy`);
      setDescription(c.description ?? '');
      setDate(typeof c.created_at === 'string' ? toDateInputValue(c.created_at) : todayISO());
    },
  );

  // Layup — locally-created layups for this composition, separate from the
  // per-side layup mapping below (which maps the shared LAYUPS catalog).
  const [layups, setLayups] = useState<CompositionLayup[]>([]);
  // Layup mapping/Transversal mapping build on a persisted layup — gates those
  // tabs (see CompositionEditToolbar) until one exists, either hydrated from the
  // backend or just saved via CompositionLayupTab's "Save" button.
  const [layupsSaved, setLayupsSaved] = useState(false);
  const [layupSaveState, setLayupSaveState] = useState({ pending: false, error: false });
  const handleLayupSaveStatusChange = useCallback(
    (status: { pending: boolean; error: boolean }) => setLayupSaveState(status),
    [],
  );
  function addLayup(name: string) {
    setLayups((arr) => [...arr, { id: nextLocalId('layup'), name, plies: [] }]);
  }
  function renameLayup(layupId: string, name: string) {
    setLayups((arr) => arr.map((l) => (l.id === layupId ? { ...l, name } : l)));
  }
  function deleteLayup(layupId: string) {
    setLayups((arr) => arr.filter((l) => l.id !== layupId));
  }
  function updateLayupPlies(layupId: string, updater: (current: Ply[]) => Ply[]) {
    setLayups((arr) => arr.map((l) => (l.id === layupId ? { ...l, plies: updater(l.plies) } : l)));
  }

  // Hydrate saved layups (and their layers) from the backend — separate from
  // the general hydration above since it also needs the materials list
  // loaded, to resolve each layer's material id back to a name.
  useHydrateOnce(
    isEditing && !detailQuery.isFetching && !!detailQuery.data && !materialsQuery.isLoading,
    () => {
      const materials = materialsQuery.data ?? [];
      const savedLayups = detailQuery.data!.layups ?? [];
      setLayupsSaved(savedLayups.length > 0);
      setLayups(
        savedLayups.map((l) => ({
          id: String(l.id),
          name: l.name,
          plies: l.layers.map((layer) => {
            const materialName = materials.find((m) => m.id === layer.material)?.name ?? 'Select';
            return {
              id: String(layer.id),
              name: layer.name,
              material: materialName,
              thickness: layer.thickness,
              orientation: layer.orientation,
              color: getMaterialColor(materialName),
            };
          }),
        })),
      );
    },
  );

  // Layup mapping — no mapping rows by default; the user adds them explicitly.
  const [upperMappings, setUpperMappings] = useState<LayupMapping[]>([]);
  const [lowerMappings, setLowerMappings] = useState<LayupMapping[]>([]);
  // Snapshot of the last-persisted upper/lower mapping state — drives the
  // autosave debounce below and is kept in sync with hydration so loading an
  // existing composition doesn't immediately re-save it.
  const [savedMappingsSnapshot, setSavedMappingsSnapshot] = useState(() =>
    mappingsSnapshotKey(upperMappings, lowerMappings),
  );
  // Tracks which mapping snapshot the transversal-mapping tab's intersection
  // data was last computed for — recomputed only when the mapping changes.
  const [transversalReadySnapshot, setTransversalReadySnapshot] = useState<string | null>(null);

  // Hydrate saved layup mapping rows (upper/lower side) from the backend.
  // Waits on the top-view fetch too — the API stores longitudinal/transversal
  // position as a fraction of nominal_radius; the bezier editor works in that
  // same absolute scale (see the matching /nominalRadius conversion in
  // saveLayupMappingData below).
  useHydrateOnce(
    isEditing &&
      !detailQuery.isFetching &&
      !!detailQuery.data &&
      !(Number.isFinite(geometryId) && !topViewQuery.data),
    () => {
      const c = detailQuery.data!;
      const toLayupMapping = (
        entry: NonNullable<typeof c.longitudinal_mapping>['upper_side'][number],
      ): LayupMapping => ({
        id: String(entry.id),
        name: entry.name,
        layupId: String(entry.layup),
        points: entry.mappings.map((m) => ({
          x: m.longitudinal_position * nominalRadius,
          y: m.transversal_position * nominalRadius,
        })),
      });
      const longitudinalMapping = c.longitudinal_mapping;
      if (longitudinalMapping) {
        const upper = longitudinalMapping.upper_side.map(toLayupMapping);
        const lower = longitudinalMapping.lower_side.map(toLayupMapping);
        setUpperMappings(upper);
        setLowerMappings(lower);
        setSavedMappingsSnapshot(mappingsSnapshotKey(upper, lower));
      }
    },
  );

  const [layupPicker, setLayupPicker] = useState<{
    side: 'upper' | 'lower';
    mappingId: string;
  } | null>(null);

  const layupPanelRef = useRef<HTMLDivElement>(null);

  const [bezierFor, setBezierFor] = useState<{
    side: 'upper' | 'lower';
    mappingId: string;
    anchorRight?: number;
    anchorTop?: number;
    anchorLeft?: number;
  } | null>(null);

  const pickerCurrentLayupId = (() => {
    if (!layupPicker) return null;
    const arr = layupPicker.side === 'upper' ? upperMappings : lowerMappings;
    return arr.find((m) => m.id === layupPicker.mappingId)?.layupId ?? null;
  })();

  const bezierTitle = (() => {
    if (!bezierFor) return '';
    const arr = bezierFor.side === 'upper' ? upperMappings : lowerMappings;
    const m = arr.find((x) => x.id === bezierFor.mappingId);
    const sideLabel = bezierFor.side === 'upper' ? 'Upper side' : 'Lower side';
    return `${sideLabel} / ${m?.name?.trim() || 'untitled'}`;
  })();

  // Chart bounds — the blade's real leading/trailing edge extents (padded),
  // expanded to fit any already-saved mapping point. See computeMappingBounds.
  const mappingBounds = computeMappingBounds(
    leadingEdge,
    trailingEdge,
    [...upperMappings, ...lowerMappings].flatMap((m) => m.points ?? []),
  );
  const mappingXStep = niceStep(mappingBounds.longitudinalMax - mappingBounds.longitudinalMin);
  const mappingYStep = niceStep(mappingBounds.transversalMax - mappingBounds.transversalMin);

  // A brand-new mapping's rectangle is seeded from the top-view API's
  // `profiles` (root/tip cross-section boundary points, and any others) —
  // the extreme top-left/top-right/bottom-left/bottom-right corners across
  // all of them, padded 10% in each direction. See computeProfilesBoundingRect.
  const profilePoints = (topViewQuery.data?.profiles ?? []).map((segment) =>
    segment.map(([x, y]) => ({ x, y })),
  );
  const profileRect = computeProfilesBoundingRect(profilePoints);
  const defaultMappingPoints: ControlPoint[] = [
    { x: profileRect.longitudinalMin, y: profileRect.transversalMin },
    { x: profileRect.longitudinalMin, y: profileRect.transversalMax },
    { x: profileRect.longitudinalMax, y: profileRect.transversalMax },
    { x: profileRect.longitudinalMax, y: profileRect.transversalMin },
  ];

  const bezierPoints = (() => {
    if (!bezierFor) return defaultMappingPoints;
    const arr = bezierFor.side === 'upper' ? upperMappings : lowerMappings;
    return arr.find((x) => x.id === bezierFor.mappingId)?.points ?? defaultMappingPoints;
  })();

  function duplicateMapping(side: 'upper' | 'lower', id: string) {
    const setter = side === 'upper' ? setUpperMappings : setLowerMappings;
    setter((arr) => {
      const idx = arr.findIndex((m) => m.id === id);
      if (idx === -1) return arr;
      const src = arr[idx];
      const dup: LayupMapping = {
        ...src,
        id: nextLocalId(side[0]),
        name: src.name ? `${src.name} (copy)` : '',
      };
      const next = [...arr];
      next.splice(idx + 1, 0, dup);
      return next;
    });
  }

  function reorderMapping(side: 'upper' | 'lower', fromIdx: number, toIdx: number) {
    const setter = side === 'upper' ? setUpperMappings : setLowerMappings;
    setter((arr) => {
      const next = [...arr];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }

  const titleText = isEditing ? name.trim() || 'Loading…' : name.trim() || 'New composition';

  const generalValid = Boolean(name.trim() && description.trim() && date);
  const hasUnsavedGeneralFields =
    !baseline ||
    name !== baseline.name ||
    description !== baseline.description ||
    date !== baseline.date;
  const hasUnsavedTargetWeight = targetWeight !== targetWeightBaseline;
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState(false);
  const creatingRef = useRef<Promise<number> | null>(null);

  const generalSavePending = createMutation.isPending || updateMutation.isPending || settingsSaving;
  const saveError = createMutation.isError || updateMutation.isError || settingsError;
  const anyAutosavePending =
    generalSavePending || layupSaveState.pending || layupMappingSavePending;
  const saveStatus: SaveStatus | undefined = anyAutosavePending
    ? 'saving'
    : generalValid && !hasUnsavedGeneralFields && !hasUnsavedTargetWeight
      ? 'saved'
      : undefined;

  async function saveTargetWeightSetting(id: number) {
    setSettingsSaving(true);
    setSettingsError(false);
    try {
      await updateCompositionSettings(id, {
        settings: [{ reference: 'target_weight', value: targetWeight }],
      });
      setTargetWeightBaseline(targetWeight);
    } catch (err) {
      setSettingsError(true);
      toast.error(getApiErrorMessage(err));
    } finally {
      setSettingsSaving(false);
    }
  }

  // Creates the composition if needed, or updates name/description/date —
  // shared by the General-tab autosave and by the target-weight blur handler
  // below (which needs a real composition id before it can save its setting).
  async function saveGeneralFields(): Promise<number> {
    if (isEditing) {
      if (hasUnsavedGeneralFields) {
        await updateMutation.mutateAsync({ name, description, created_at: toIsoDateTime(date) });
      }
      setBaseline({ name, description, date });
      return compositionId;
    }
    // Autosave can fire again while a create is still in flight (e.g. the
    // debounce timer re-triggers right as the mutation starts) — share the
    // one in-progress create instead of racing a second one.
    if (creatingRef.current) {
      return creatingRef.current;
    }
    creatingRef.current = (async () => {
      const created = await createMutation.mutateAsync({
        name,
        description,
        created_at: toIsoDateTime(date),
      });
      setBaseline({ name, description, date });
      // /composition/new and /composition/:id share a route, so this navigate does NOT
      // remount the component — switching the URL just flips isEditing to true.
      navigate(`/composition/${created.id}`, { replace: true });
      return created.id;
    })();
    try {
      return await creatingRef.current;
    } finally {
      creatingRef.current = null;
    }
  }

  // Autosave name/description/date once all are filled — debounced so it
  // fires after the user pauses typing, not on every keystroke. Target
  // weight is intentionally excluded: it only saves on blur (see below).
  // Retries once per distinct value: a failed save doesn't get silently
  // retried in a loop — the same (name, description, date) combination is
  // only attempted again once the user actually changes something.
  const generalMutationError = createMutation.isError || updateMutation.isError;
  const lastGeneralAttemptRef = useRef<string | null>(null);
  useEffect(() => {
    if (!generalValid || generalSavePending || !hasUnsavedGeneralFields) return;
    const key = `${name}|${description}|${date}`;
    if (generalMutationError && lastGeneralAttemptRef.current === key) return;
    const timer = setTimeout(() => {
      lastGeneralAttemptRef.current = key;
      saveGeneralFields();
    }, 800);
    return () => clearTimeout(timer);
    // saveGeneralFields is a fresh closure every render; only the tracked
    // values below should gate the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name,
    description,
    date,
    generalValid,
    generalSavePending,
    hasUnsavedGeneralFields,
    generalMutationError,
  ]);

  // Target weight saves only when the field loses focus, not on every
  // keystroke — avoids a PUT /composition/:id/settings/ per character typed.
  async function handleTargetWeightBlur() {
    if (!hasUnsavedTargetWeight) return;
    const id = generalValid ? await saveGeneralFields() : isEditing ? compositionId : null;
    if (id == null) return;
    await saveTargetWeightSetting(id);
  }

  // Enter-to-submit shortcut on the General tab's form — saves everything
  // immediately instead of waiting on the debounce/blur triggers above.
  async function handleGeneralFormSubmit() {
    const id = await saveGeneralFields();
    if (hasUnsavedTargetWeight) await saveTargetWeightSetting(id);
  }

  function handleExit() {
    navigate(exitTarget);
  }

  function addUpper() {
    setUpperMappings((arr) => [...arr, { id: nextLocalId('u'), name: '', layupId: null }]);
  }
  function addLower() {
    setLowerMappings((arr) => [...arr, { id: nextLocalId('l'), name: '', layupId: null }]);
  }
  function updateMapping(side: 'upper' | 'lower', id: string, next: Partial<LayupMapping>) {
    const setter = side === 'upper' ? setUpperMappings : setLowerMappings;
    setter((arr) => arr.map((m) => (m.id === id ? { ...m, ...next } : m)));
  }
  function deleteMapping(side: 'upper' | 'lower', id: string) {
    const setter = side === 'upper' ? setUpperMappings : setLowerMappings;
    setter((arr) => arr.filter((m) => m.id !== id));
  }
  function copyUpperToLower() {
    setLowerMappings(
      upperMappings.map((m) => ({
        ...m,
        id: nextLocalId('l-copy'),
        name: m.name ? `${m.name} copy` : '',
      })),
    );
  }
  function copyLowerToUpper() {
    setUpperMappings(
      lowerMappings.map((m) => ({
        ...m,
        id: nextLocalId('u-copy'),
        name: m.name ? `${m.name} copy` : '',
      })),
    );
  }

  const mappingsKey = mappingsSnapshotKey(upperMappings, lowerMappings);
  const hasUnsavedMappings = mappingsKey !== savedMappingsSnapshot;

  // The bezier editor works in the blade's absolute (real) scale; the API
  // expects longitudinal/transversal position as a fraction of nominal_radius.
  // A row's id is only a real backend id once hydrated (String(entry.id), a
  // plain digit string) — rows added locally get nextLocalId's prefixed id
  // (e.g. "u-kx3f2a1-4") and must not send one, so the backend creates it.
  async function saveLayupMappingData() {
    const toEntries = (mappings: LayupMapping[]) =>
      mappings
        .filter((m) => m.layupId)
        .map((m) => ({
          ...(/^\d+$/.test(m.id) ? { id: Number(m.id) } : {}),
          name: m.name,
          layup: Number(m.layupId),
          mappings: (m.points ?? defaultMappingPoints).map((p) => ({
            longitudinal_position: p.x / nominalRadius,
            transversal_position: p.y / nominalRadius,
          })),
        }));

    await updateMappingLongitudinalMutation.mutateAsync({
      upper_side: toEntries(upperMappings),
      lower_side: toEntries(lowerMappings),
    });
    setSavedMappingsSnapshot(mappingsKey);
  }

  // Autosave the layup mapping — debounced so it fires after the user pauses
  // editing rather than on every drag/keystroke. A failed save is attempted
  // once per distinct mapping state — it does not retry in a loop; it tries
  // again only once the user changes the mapping further.
  const lastMappingsAttemptRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hasUnsavedMappings || updateMappingLongitudinalMutation.isPending) return;
    if (updateMappingLongitudinalMutation.isError && lastMappingsAttemptRef.current === mappingsKey)
      return;
    const timer = setTimeout(() => {
      lastMappingsAttemptRef.current = mappingsKey;
      saveLayupMappingData();
    }, 800);
    return () => clearTimeout(timer);
    // saveLayupMappingData is a fresh closure every render; only the tracked
    // values below should gate the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mappingsKey,
    hasUnsavedMappings,
    updateMappingLongitudinalMutation.isPending,
    updateMappingLongitudinalMutation.isError,
  ]);

  // The mapping data feeds the transversal-mapping tab's intersection
  // computation — make sure it's persisted and the intersections are fresh
  // before switching into that tab (replaces the old manual "Save" button,
  // which used to trigger this same sequence).
  async function ensureTransversalMappingReady() {
    if (hasUnsavedMappings) await saveLayupMappingData();
    if (transversalReadySnapshot === mappingsKey) return;
    const intersections = await fetchIntersectionsMutation.mutateAsync(compositionId);
    await fetchMappingTransversalMutation.mutateAsync(compositionId);
    setTransversalReadySnapshot(mappingsKey);

    if (Number.isFinite(geometryId)) {
      await Promise.all(
        intersections.map(({ profile_id }) =>
          queryClient.prefetchQuery({
            queryKey: geometryKeys.profile(geometryId, profile_id),
            queryFn: () => getGeometryProfile(geometryId, profile_id),
          }),
        ),
      );
    }
  }

  async function handleTabChange(tab: CompositionTab) {
    setBezierFor(null);
    if (tab === 'transversal-mapping') await ensureTransversalMappingReady();
    setActiveTab(tab);
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <MainNav />

      <main className="relative flex-1 overflow-hidden bg-[#f8fafc]">
        <CompositionEditToolbar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          titleText={titleText}
          onExit={handleExit}
          saveStatus={saveStatus}
          isSaved={isEditing}
          layupsSaved={layupsSaved}
          geometrySelected={Number.isFinite(geometryId)}
        />
        {saveError && (
          <div className="absolute inset-x-0 top-[52px] z-30 px-4 py-1 text-center text-[13px] text-[#dc2626]">
            Failed to {isEditing ? 'update' : 'create'} composition. Please try again.
          </div>
        )}
        {layupSaveState.error && (
          <div className="absolute inset-x-0 top-[52px] z-30 px-4 py-1 text-center text-[13px] text-[#dc2626]">
            Failed to save layups. Please try again.
          </div>
        )}
        {layupMappingSaveError && (
          <div className="absolute inset-x-0 top-[52px] z-30 px-4 py-1 text-center text-[13px] text-[#dc2626]">
            Failed to save layup mapping. Please try again.
          </div>
        )}

        {/* Tab content panels */}
        <div className="absolute bottom-4 left-4 right-4 top-[60px]">
          {activeTab === 'general' && (
            <CompositionGeneralTab
              name={name}
              onNameChange={setName}
              date={date}
              onDateChange={setDate}
              description={description}
              onDescriptionChange={setDescription}
              solidCore={solidCore}
              onSolidCoreChange={setSolidCore}
              targetWeight={targetWeight}
              onTargetWeightChange={setTargetWeight}
              onTargetWeightBlur={handleTargetWeightBlur}
              onSubmit={handleGeneralFormSubmit}
            />
          )}

          {activeTab === 'geometry' && (
            <CompositionGeometryTab
              compositionId={compositionId}
              geomQuery={geomQuery}
              onGeomQueryChange={setGeomQuery}
              selectedGeometryId={selectedGeometryId}
              onSelectGeometry={setSelectedGeometryId}
              onAfterSelect={() => setActiveTab('layup')}
            />
          )}

          {activeTab === 'layup' && (
            <CompositionLayupTab
              compositionId={compositionId}
              layups={layups}
              onAddLayup={addLayup}
              onRenameLayup={renameLayup}
              onDeleteLayup={deleteLayup}
              onUpdateLayupPlies={updateLayupPlies}
              onSaved={() => setLayupsSaved(true)}
              onSaveStatusChange={handleLayupSaveStatusChange}
            />
          )}

          <CompositionLayupMappingPanel
            ref={layupPanelRef}
            visible={activeTab === 'layup-mapping'}
            upperMappings={upperMappings}
            lowerMappings={lowerMappings}
            layupOptions={layupOptions}
            activeBezierSide={bezierFor?.side ?? null}
            activeBezierMappingId={bezierFor?.mappingId ?? null}
            onAdd={(side) => (side === 'upper' ? addUpper() : addLower())}
            onDelete={deleteMapping}
            onUpdate={updateMapping}
            onCopyUpperToLower={copyUpperToLower}
            onCopyLowerToUpper={copyLowerToUpper}
            onDuplicate={duplicateMapping}
            onOpenBezier={(side, id) => {
              const rect = layupPanelRef.current?.getBoundingClientRect();
              setBezierFor({
                side,
                mappingId: id,
                anchorRight: rect?.right,
                anchorTop: rect?.top,
                anchorLeft: rect?.left,
              });
            }}
            onReorder={reorderMapping}
            onPickLayup={(side, id) => setLayupPicker({ side, mappingId: id })}
          />

          {/* Always mounted — hidden instead of unmounted so internal state survives tab switches */}
          <div
            className={`pointer-events-auto max-h-[calc(100vh_-_145px)] overflow-y-auto${activeTab !== 'transversal-mapping' ? ' hidden' : ''}`}
          >
            <TransversalMappingSection compositionId={compositionId} />
          </div>

          {activeTab === 'preview' && (
            <CompositionPreviewTab compositionId={compositionId} geometryId={geometryId} />
          )}
        </div>
      </main>

      <LayupPickerDialog
        compositionId={compositionId}
        open={layupPicker !== null}
        currentLayupId={pickerCurrentLayupId}
        onSelect={(layupId) => {
          if (layupPicker) {
            updateMapping(layupPicker.side, layupPicker.mappingId, { layupId });
            const rect = layupPanelRef.current?.getBoundingClientRect();
            setBezierFor({
              side: layupPicker.side,
              mappingId: layupPicker.mappingId,
              anchorRight: rect?.right,
              anchorTop: rect?.top,
              anchorLeft: rect?.left,
            });
          }
          setLayupPicker(null);
        }}
        onClose={() => setLayupPicker(null)}
      />

      {bezierFor && (
        <LayupMappingDialog
          key={`${bezierFor.side}-${bezierFor.mappingId}`}
          open
          title={bezierTitle}
          points={bezierPoints}
          onChange={(pts) => updateMapping(bezierFor.side, bezierFor.mappingId, { points: pts })}
          leadingEdge={leadingEdge}
          trailingEdge={trailingEdge}
          xMin={mappingBounds.longitudinalMin}
          xMax={mappingBounds.longitudinalMax}
          xStep={mappingXStep}
          yMin={mappingBounds.transversalMin}
          yMax={mappingBounds.transversalMax}
          yStep={mappingYStep}
          anchorRight={bezierFor.anchorRight}
          anchorTop={bezierFor.anchorTop}
          anchorLeft={bezierFor.anchorLeft}
          onClose={() => setBezierFor(null)}
        />
      )}
    </div>
  );
}
