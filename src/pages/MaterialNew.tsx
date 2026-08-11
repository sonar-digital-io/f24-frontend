import { useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MainNav } from '@/components/common/layout/MainNav';
import { EditPageToolbar } from '@/components/common/layout/EditPageToolbar';
import { PropertyFormTab } from '@/components/material/PropertyFormTab';
import { MaterialGeneralTab } from '@/components/material/MaterialGeneralTab';
import { MECHANICAL_SECTIONS } from '@/data/materialFormFields';
import { FATIGUE_SECTIONS } from '@/data/materialFatigueFields';
import {
  useCreateMaterial,
  useMaterialDetail,
  useUpdateMaterial,
  useUpdateMechanicalProperties,
  useUpdateFatigueProperties,
} from '@/hooks/api/useMaterials';
import { useHydrateOnce } from '@/hooks/useHydrateOnce';
import { MECH_PROP_TYPE_REFERENCE, toKeyValueList, toValueMap, keyValueSignature } from '@/lib/materialFormMapping';
import type { MaterialPayload } from '@/api/types/materials';
import { todayISO, toIsoDateTime, toDateInputValue } from '@/lib/utils';

interface Baseline {
  name: string;
  description: string;
  date: string;
  mechValues: Record<string, string>;
  fatigueValues: Record<string, string>;
}

export function MaterialNew() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(id);
  const materialId = id ? Number(id) : NaN;
  const duplicateFromRaw = !isEditing ? searchParams.get('duplicateFrom') : null;
  const duplicateSourceId = duplicateFromRaw ? Number(duplicateFromRaw) : NaN;

  const detailQuery = useMaterialDetail(materialId);
  const duplicateQuery = useMaterialDetail(duplicateSourceId);
  const createMaterialMutation = useCreateMaterial();
  const updateGeneralMutation = useUpdateMaterial(materialId);
  const updateMechanicalMutation = useUpdateMechanicalProperties(materialId);
  const updateFatigueMutation = useUpdateFatigueProperties(materialId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());
  const [activeTab, setActiveTab] = useState('general');
  const [mechValues, setMechValues] = useState<Record<string, string>>({
    [MECH_PROP_TYPE_REFERENCE]: 'UD ply',
  });
  const [fatigueValues, setFatigueValues] = useState<Record<string, string>>({});
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  // Set right after the blur-autosave creates the material, so the loading state below
  // doesn't flash "Loading material…" over the tab the user is actively filling in —
  // we already have its data locally; the background refetch is just React Query's habit.
  const [justCreatedId, setJustCreatedId] = useState<number | null>(null);

  const type = mechValues[MECH_PROP_TYPE_REFERENCE] ?? 'UD ply';
  function setType(value: string) {
    setMechValues((prev) => ({ ...prev, [MECH_PROP_TYPE_REFERENCE]: value }));
  }

  // Populate the form once the (forced, never-cached) detail fetch settles, and record a
  // baseline snapshot so saving can tell which of the 3 tabs actually changed. Waiting on
  // `isFetching` — not just `data` — means we never hydrate from a stale cache hit that
  // React Query may return synchronously before the real network refetch resolves.
  const hydrated = useHydrateOnce(isEditing && !detailQuery.isFetching && !!detailQuery.data, () => {
    const m = detailQuery.data!;
    const hydratedDescription = m.description ?? '';
    const hydratedDate = toDateInputValue(m.date);
    const hydratedMech = toValueMap(m.mechanical_properties);
    const hydratedFatigue = toValueMap(m.fatigue_properties);
    setName(m.name);
    setDescription(hydratedDescription);
    setDate(hydratedDate);
    setMechValues(hydratedMech);
    setFatigueValues(hydratedFatigue);
    setBaseline({
      name: m.name,
      description: hydratedDescription,
      date: hydratedDate,
      mechValues: hydratedMech,
      fatigueValues: hydratedFatigue,
    });
  });

  // Duplicate: prefill a NEW (create-mode) form from another material's data, with
  // "_copy" appended to the name. No baseline needed — Save always does a plain POST here.
  const duplicateHydrated = useHydrateOnce(
    !isEditing && Number.isFinite(duplicateSourceId) && !duplicateQuery.isFetching && !!duplicateQuery.data,
    () => {
      const m = duplicateQuery.data!;
      setName(`${m.name}_copy`);
      setDescription(m.description ?? '');
      setDate(toDateInputValue(m.date));
      setMechValues(toValueMap(m.mechanical_properties));
      setFatigueValues(toValueMap(m.fatigue_properties));
    }
  );

  // Title: editing shows the material name everywhere; creating shows "New material" on General.
  const titleText = isEditing
    ? name || 'Loading…'
    : activeTab === 'general'
      ? 'New material'
      : name || 'New material';

  const savePending =
    createMaterialMutation.isPending ||
    updateGeneralMutation.isPending ||
    updateMechanicalMutation.isPending ||
    updateFatigueMutation.isPending;
  const saveError =
    createMaterialMutation.isError ||
    updateGeneralMutation.isError ||
    updateMechanicalMutation.isError ||
    updateFatigueMutation.isError;

  // General tab is "done" once the material exists on the backend — gates the
  // Mechanical/Fatigue tabs, which need a real material id to save against.
  const isSaved = isEditing;
  const generalValid = Boolean(name.trim() && description.trim() && date);
  const hasUnsavedGeneral =
    !baseline || name !== baseline.name || date !== baseline.date || description !== baseline.description;
  const creatingRef = useRef<Promise<number> | null>(null);

  // Creates the material (POSTing the current mechanical/fatigue defaults along with
  // it, since the backend requires them) the first time General is complete, or PUTs
  // name/date/description on an already-created one. Shared by the blur-autosave below
  // and by the final Save button on the Fatigue tab.
  async function saveGeneralFields(): Promise<number> {
    if (isEditing) {
      if (hasUnsavedGeneral) {
        await updateGeneralMutation.mutateAsync({ name, date: toIsoDateTime(date), description });
        setBaseline((prev) => (prev ? { ...prev, name, date, description } : prev));
      }
      return materialId;
    }
    // Blur can fire again while a create is still in flight (e.g. tabbing through
    // several fields quickly) — share the one in-progress create instead of racing a second one.
    if (creatingRef.current) return creatingRef.current;
    creatingRef.current = (async () => {
      const payload: MaterialPayload = {
        name,
        date: toIsoDateTime(date),
        description,
        mechanical_properties: toKeyValueList(mechValues),
        fatigue_properties: toKeyValueList(fatigueValues),
      };
      const created = await createMaterialMutation.mutateAsync(payload);
      setBaseline({ name, description, date, mechValues, fatigueValues });
      setJustCreatedId(created.id);
      // /material/new and /material/:id share a route, so this navigate does NOT
      // remount the component — switching the URL just flips isEditing to true.
      navigate(`/material/${created.id}`, { replace: true });
      return created.id;
    })();
    try {
      return await creatingRef.current;
    } finally {
      creatingRef.current = null;
    }
  }

  // Autosave the General tab once every required field is filled — fires when focus
  // leaves a field (blur) or the form itself (click-out), not on every keystroke.
  function handleGeneralBlur() {
    if (!generalValid || !hasUnsavedGeneral || savePending) return;
    saveGeneralFields();
  }

  /**
   * By the time this is reachable, General has already created/saved the material (the
   * Mechanical/Fatigue tabs are disabled until then) — this only needs to PUT whichever
   * of the 3 tabs actually changed since: PUT /material/:id/ (general), PUT
   * .../mechanical-properties/ (mechanical tab, including Type as the "mech_prop_type"
   * entry), PUT .../fatigue-properties/ (fatigue tab).
   */
  async function handleSave() {
    if (!baseline) return;

    const generalChanged =
      name !== baseline.name || date !== baseline.date || description !== baseline.description;
    const mechanicalChanged = keyValueSignature(mechValues) !== keyValueSignature(baseline.mechValues);
    const fatigueChanged = keyValueSignature(fatigueValues) !== keyValueSignature(baseline.fatigueValues);

    const tasks: Promise<unknown>[] = [];
    if (generalChanged) {
      tasks.push(updateGeneralMutation.mutateAsync({ name, date: toIsoDateTime(date), description }));
    }
    if (mechanicalChanged) {
      tasks.push(updateMechanicalMutation.mutateAsync({ mechanical_properties: toKeyValueList(mechValues) }));
    }
    if (fatigueChanged) {
      tasks.push(updateFatigueMutation.mutateAsync({ fatigue_properties: toKeyValueList(fatigueValues) }));
    }

    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
    navigate('/material');
  }

  function handleExit() {
    navigate('/material');
  }

  const isDuplicating = !isEditing && Number.isFinite(duplicateSourceId);
  const showLoadingState =
    (isEditing && materialId !== justCreatedId && !hydrated && (detailQuery.isLoading || detailQuery.isFetching)) ||
    (isDuplicating && !duplicateHydrated && (duplicateQuery.isLoading || duplicateQuery.isFetching));
  const showLoadErrorState = (isEditing && detailQuery.isError) || (isDuplicating && duplicateQuery.isError);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#f8fafc]">
      <MainNav />

      <EditPageToolbar
        tabs={[
          { value: 'general', label: 'General' },
          { value: 'mechanical', label: 'Mechanical properties', disabled: !isSaved },
          { value: 'fatigue', label: 'Fatigue properties', disabled: !isSaved },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title={titleText}
        onBack={handleExit}
        actions={
          activeTab === 'fatigue' &&
          !showLoadingState &&
          !showLoadErrorState && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || !description.trim() || !date || savePending}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-[#006496] px-3 py-2 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savePending ? 'Saving…' : isEditing ? 'Update material' : 'Create material'}
            </button>
          )
        }
      />
      {saveError && (
        <p className="px-4 text-[13px] text-[#dc2626]">
          Failed to {isEditing ? 'update' : 'create'} material. Please try again.
        </p>
      )}

      {/* Main content area */}
      <main className="flex-1 overflow-hidden px-4 pb-6 pt-4">
        {showLoadingState && (
          <p className="px-2 py-8 text-center text-[14px] text-[#6b7280]">Loading material…</p>
        )}
        {showLoadErrorState && (
          <p className="px-2 py-8 text-center text-[14px] text-[#dc2626]">
            Failed to load this material from the server.
          </p>
        )}

        {!showLoadingState && !showLoadErrorState && activeTab === 'general' && (
          <MaterialGeneralTab
            name={name}
            onNameChange={setName}
            type={type}
            onTypeChange={setType}
            date={date}
            onDateChange={setDate}
            description={description}
            onDescriptionChange={setDescription}
            onBlur={handleGeneralBlur}
          />
        )}

        {!showLoadingState && !showLoadErrorState && activeTab === 'mechanical' && (
          <PropertyFormTab
            sections={MECHANICAL_SECTIONS}
            values={mechValues}
            onChange={(name, value) => setMechValues((prev) => ({ ...prev, [name]: value }))}
            optionalAfterIndex={0}
          />
        )}

        {!showLoadingState && !showLoadErrorState && activeTab === 'fatigue' && (
          <PropertyFormTab
            sections={FATIGUE_SECTIONS}
            values={fatigueValues}
            onChange={(name, value) => setFatigueValues((prev) => ({ ...prev, [name]: value }))}
            optionalAfterIndex={-1}
          />
        )}
      </main>
    </div>
  );
}
