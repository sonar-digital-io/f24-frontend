import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, Redo2, Undo2 } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayupPickerDialog } from '@/components/composition/LayupPickerDialog';
import { LayupMappingBezierDialog } from '@/components/composition/LayupMappingBezierDialog';
import { TransversalMappingSection } from '@/components/composition/TransversalMappingSection';
import { CompositionGeneralTab } from '@/components/composition/CompositionGeneralTab';
import { CompositionGeometryTab } from '@/components/composition/CompositionGeometryTab';
import { CompositionPreviewTab } from '@/components/composition/CompositionPreviewTab';
import { CompositionLayupTab, type CompositionLayup } from '@/components/composition/CompositionLayupTab';
import { getMaterialColor, type Ply } from '@/components/layup/LayupBuilder';
import { LayupMappingTable, type LayupMapping } from '@/components/composition/LayupMappingTable';
import { nextLocalId, todayISO, toIsoDateTime, toDateInputValue } from '@/lib/utils';
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

export function CompositionNew() {
  const navigate = useNavigate();
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
  const layupOptions = detailQuery.data?.layups ?? [];
  const materialsQuery = useMaterialList();

  // Geometry pick
  const [geomQuery, setGeomQuery] = useState('');
  const [geomView, setGeomView] = useState<'list' | 'grid'>('grid');
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

  const [activeTab, setActiveTab] = useState<
    'general' | 'geometry' | 'layup' | 'layup-mapping' | 'transversal-mapping' | 'preview'
  >('general');

  // General — hydrated from the backend for edit/duplicate. Layup mapping and
  // transversal mapping stay on local state: they carry rich shapes (bezier
  // curves, per-side tables) the typed backend payloads don't fully describe
  // yet — wiring those needs a real data-source swap, left for a follow-up.
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());
  const [solidCore, setSolidCore] = useState(false);
  const [targetWeight, setTargetWeight] = useState('');
  const [baseline, setBaseline] = useState<
    { name: string; description: string; date: string; targetWeight: string } | null
  >(null);

  useHydrateOnce(isEditing && !detailQuery.isFetching && !!detailQuery.data, () => {
    const c = detailQuery.data!;
    const hydratedDescription = c.description ?? '';
    const hydratedDate =
      typeof c.created_at === 'string' ? toDateInputValue(c.created_at) : todayISO();
    const hydratedTargetWeight = c.settings?.find((s) => s.reference === 'target_weight')?.value;
    const hydratedTargetWeightStr = hydratedTargetWeight !== undefined ? String(hydratedTargetWeight) : '';
    setName(c.name);
    setDescription(hydratedDescription);
    setDate(hydratedDate);
    if (hydratedTargetWeightStr) setTargetWeight(hydratedTargetWeightStr);
    if (c.geometry != null) setSelectedGeometryId(String(c.geometry));
    setBaseline({ name: c.name, description: hydratedDescription, date: hydratedDate, targetWeight: hydratedTargetWeightStr });
  });

  useHydrateOnce(
    !isEditing && Number.isFinite(duplicateSourceId) && !duplicateQuery.isFetching && !!duplicateQuery.data,
    () => {
      const c = duplicateQuery.data!;
      setName(`${c.name}_copy`);
      setDescription(c.description ?? '');
      setDate(typeof c.created_at === 'string' ? toDateInputValue(c.created_at) : todayISO());
    }
  );

  // Layup — locally-created layups for this composition, separate from the
  // per-side layup mapping below (which maps the shared LAYUPS catalog).
  const [layups, setLayups] = useState<CompositionLayup[]>([]);
  function addLayup(name: string) {
    setLayups((arr) => [...arr, { id: nextLocalId('layup'), name, plies: [] }]);
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
        }))
      );
    }
  );

  // Layup mapping — no mapping rows by default; the user adds them explicitly.
  const [upperMappings, setUpperMappings] = useState<LayupMapping[]>([]);
  const [lowerMappings, setLowerMappings] = useState<LayupMapping[]>([]);

  // Hydrate saved layup mapping rows (upper/lower side) from the backend.
  // Waits on the top-view fetch too — the API stores longitudinal/transversal
  // position as a fraction of nominal_radius; the bezier editor works in that
  // same absolute scale (see the matching /nominalRadius conversion in
  // handleSaveLayupMapping below).
  useHydrateOnce(
    isEditing &&
      !detailQuery.isFetching &&
      !!detailQuery.data &&
      !(Number.isFinite(geometryId) && !topViewQuery.data),
    () => {
      const c = detailQuery.data!;
      const toLayupMapping = (entry: NonNullable<typeof c.longitudinal_mapping>['upper_side'][number]): LayupMapping => ({
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
        setUpperMappings(longitudinalMapping.upper_side.map(toLayupMapping));
        setLowerMappings(longitudinalMapping.lower_side.map(toLayupMapping));
      }
    }
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
    segment.map(([x, y]) => ({ x, y }))
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

  const savePending = createMutation.isPending || updateMutation.isPending;
  const saveError = createMutation.isError || updateMutation.isError;

  async function handleGeneralSubmit() {
    if (isEditing) {
      if (
        !baseline ||
        name !== baseline.name ||
        description !== baseline.description ||
        date !== baseline.date
      ) {
        await updateMutation.mutateAsync({ name, description, created_at: toIsoDateTime(date) });
      }
      if (!baseline || targetWeight !== baseline.targetWeight) {
        await updateCompositionSettings(compositionId, {
          settings: [{ reference: 'target_weight', value: targetWeight }],
        });
      }
      return;
    }
    const created = await createMutation.mutateAsync({ name, description, created_at: toIsoDateTime(date) });
    await updateCompositionSettings(created.id, {
      settings: [{ reference: 'target_weight', value: targetWeight }],
    });
    // /composition/new and /composition/:id share a route, so this navigate does NOT
    // remount the component — switching the URL just flips isEditing to true.
    setActiveTab('geometry');
    navigate(`/composition/${created.id}`, { replace: true });
  }

  function handleExit() {
    navigate('/composition');
  }

  function addUpper() {
    setUpperMappings((arr) => [
      ...arr,
      { id: nextLocalId('u'), name: '', layupId: null },
    ]);
  }
  function addLower() {
    setLowerMappings((arr) => [
      ...arr,
      { id: nextLocalId('l'), name: '', layupId: null },
    ]);
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
    setLowerMappings(upperMappings.map((m) => ({ ...m, id: nextLocalId('l-copy'), name: m.name ? `${m.name} copy` : '' })));
  }
  function copyLowerToUpper() {
    setUpperMappings(lowerMappings.map((m) => ({ ...m, id: nextLocalId('u-copy'), name: m.name ? `${m.name} copy` : '' })));
  }

  const layupMappingSavePending =
    updateMappingLongitudinalMutation.isPending ||
    fetchIntersectionsMutation.isPending ||
    fetchMappingTransversalMutation.isPending;
  const layupMappingSaveError =
    updateMappingLongitudinalMutation.isError ||
    fetchIntersectionsMutation.isError ||
    fetchMappingTransversalMutation.isError;

  async function handleSaveLayupMapping() {
    // The bezier editor works in the blade's absolute (real) scale; the API
    // expects longitudinal/transversal position as a fraction of nominal_radius.
    // A row's id is only a real backend id once hydrated (String(entry.id), a
    // plain digit string) — rows added locally get nextLocalId's prefixed id
    // (e.g. "u-kx3f2a1-4") and must not send one, so the backend creates it.
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
    const intersections = await fetchIntersectionsMutation.mutateAsync(compositionId);
    setActiveTab('transversal-mapping');
    await fetchMappingTransversalMutation.mutateAsync(compositionId);

    if (Number.isFinite(geometryId)) {
      await Promise.all(
        intersections.map(({ profile_id }) =>
          queryClient.prefetchQuery({
            queryKey: geometryKeys.profile(geometryId, profile_id),
            queryFn: () => getGeometryProfile(geometryId, profile_id),
          })
        )
      );
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <MainNav />

      <main className="relative flex-1 overflow-hidden bg-[#f8fafc]">
      {/* Sub-toolbar */}
      <div className="absolute inset-x-0 top-0 z-40 h-[52px] border-b border-[#e5e7eb]/70">
        <div className="absolute inset-y-0 left-4 flex items-center">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as typeof activeTab); setBezierFor(null); }} className="h-9">
            <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
              {[
                { value: 'general', label: 'General' },
                { value: 'geometry', label: 'Geometry' },
                { value: 'layup', label: 'Layup' },
                { value: 'layup-mapping', label: 'Layup mapping' },
                { value: 'transversal-mapping', label: 'Transversal mapping' },
                { value: 'preview', label: 'Preview' },
              ].map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <h1 className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-[18px] font-semibold leading-7 text-[#0a0a0a] lg:block">
          {titleText}
        </h1>

        <div className="absolute inset-y-0 right-4 flex items-center gap-4">
          <div className="flex items-center gap-[6px]">
            <Check className="h-4 w-4 text-[#737373]" strokeWidth={2} />
            <span className="text-[14px] leading-5 text-[#737373]">Saved</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Undo"
              className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f5f9]/95 text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:bg-[#e2e8f0] hover:text-[#0a0a0a]"
            >
              <Undo2 className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Redo"
              className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f5f9]/95 text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:bg-[#e2e8f0] hover:text-[#0a0a0a]"
            >
              <Redo2 className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleExit}
            className="inline-flex h-8 items-center rounded-md bg-[#f1f5f9]/95 px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:bg-[#e2e8f0]"
          >
            Back to Compositions
          </button>
          {activeTab === 'general' && (
            <button
              type="button"
              onClick={handleGeneralSubmit}
              disabled={!name.trim() || !description.trim() || !date || savePending}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-[#006496] px-3 py-2 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savePending ? 'Saving…' : isEditing ? 'Update composition' : 'Create composition'}
            </button>
          )}
          {activeTab === 'layup-mapping' && (
            <button
              type="button"
              onClick={handleSaveLayupMapping}
              disabled={layupMappingSavePending}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-[#006496] px-3 py-2 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {layupMappingSavePending ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>
      {saveError && (
        <div className="absolute inset-x-0 top-[52px] z-30 px-4 py-1 text-center text-[13px] text-[#dc2626]">
          Failed to {isEditing ? 'update' : 'create'} composition. Please try again.
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
            onSubmit={handleGeneralSubmit}
          />
        )}

        {activeTab === 'geometry' && (
          <CompositionGeometryTab
            compositionId={compositionId}
            geomQuery={geomQuery}
            onGeomQueryChange={setGeomQuery}
            geomView={geomView}
            onGeomViewChange={setGeomView}
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
            onUpdateLayupPlies={updateLayupPlies}
            onSaved={() => setActiveTab('layup-mapping')}
          />
        )}

        {/* Always mounted — hidden instead of unmounted so mapping state survives tab switches */}
        <div ref={layupPanelRef} className={`pointer-events-auto flex max-h-[calc(100vh-145px)] w-full max-w-[560px] flex-col gap-6 overflow-y-auto rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur-sm${activeTab !== 'layup-mapping' ? ' hidden' : ''}`}>
            <LayupMappingTable
              title="Upper side"
              copyLabel="Copy to lower side"
              mappings={upperMappings}
              layupOptions={layupOptions}
              activeMappingId={bezierFor?.side === 'upper' ? bezierFor.mappingId : null}
              onAdd={addUpper}
              onDelete={(id) => deleteMapping('upper', id)}
              onUpdate={(id, next) => updateMapping('upper', id, next)}
              onCopy={copyUpperToLower}
              onDuplicate={(id) => duplicateMapping('upper', id)}
              onOpenBezier={(id) => {
                const rect = layupPanelRef.current?.getBoundingClientRect();
                setBezierFor({ side: 'upper', mappingId: id, anchorRight: rect?.right, anchorTop: rect?.top, anchorLeft: rect?.left });
              }}
              onReorder={(from, to) => reorderMapping('upper', from, to)}
              onPickLayup={(id) => setLayupPicker({ side: 'upper', mappingId: id })}
            />

            <LayupMappingTable
              title="Lower side"
              copyLabel="Copy to upper side"
              mappings={lowerMappings}
              layupOptions={layupOptions}
              activeMappingId={bezierFor?.side === 'lower' ? bezierFor.mappingId : null}
              onAdd={addLower}
              onDelete={(id) => deleteMapping('lower', id)}
              onUpdate={(id, next) => updateMapping('lower', id, next)}
              onCopy={copyLowerToUpper}
              onDuplicate={(id) => duplicateMapping('lower', id)}
              onOpenBezier={(id) => {
                const rect = layupPanelRef.current?.getBoundingClientRect();
                setBezierFor({ side: 'lower', mappingId: id, anchorRight: rect?.right, anchorTop: rect?.top, anchorLeft: rect?.left });
              }}
              onReorder={(from, to) => reorderMapping('lower', from, to)}
              onPickLayup={(id) => setLayupPicker({ side: 'lower', mappingId: id })}
            />
          </div>

        {/* Always mounted — hidden instead of unmounted so internal state survives tab switches */}
        <div className={`pointer-events-auto max-h-[calc(100vh-145px)] overflow-y-auto${activeTab !== 'transversal-mapping' ? ' hidden' : ''}`}>
          <TransversalMappingSection
            compositionId={compositionId}
            useDefaultData={isEditing}
          />
        </div>

        {activeTab === 'preview' && (
          <CompositionPreviewTab
            compositionId={compositionId}
            geometryId={geometryId}
          />
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
        <LayupMappingBezierDialog
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
