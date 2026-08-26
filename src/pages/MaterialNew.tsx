import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useExitEditModeTarget } from '@/hooks/useExitEditModeTarget';
import { MainNav } from '@/components/common/layout/MainNav';
import { EditPageToolbar } from '@/components/common/layout/EditPageToolbar';
import type { SaveStatus } from '@/components/common/layout/EditPageToolbarActions';
import { ConfirmDialog } from '@/components/common/dialog/ConfirmDialog';
import { PropertyFormTab } from '@/components/material/PropertyFormTab';
import { MaterialGeneralTab } from '@/components/material/MaterialGeneralTab';
import {
  useCreateMaterial,
  useMaterialDetail,
  useUpdateMaterial,
  useUpdateMechanicalProperties,
  useUpdateFatigueProperties,
} from '@/hooks/api/useMaterials';
import { useMaterialSysconfig } from '@/hooks/api/useSysconfig';
import { useHydrateOnce } from '@/hooks/useHydrateOnce';
import {
  MECH_PROP_TYPE_REFERENCE,
  toKeyValueList,
  toValueMap,
  keyValueSignature,
} from '@/lib/keyValueMapping';
import {
  buildSysconfigSections,
  getMechPropTypeParameter,
  getMechPropTypeEntry,
  pickActiveFields,
} from '@/lib/sysconfigMapping';
import { isFormValid, isFormRangeValid } from '@/lib/sysconfigFormValidation';
import type { MaterialPayload } from '@/api/types/materials';
import type { FormSection } from '@/data/materialFormFields';
import { todayISO, toIsoDateTime, toDateInputValue } from '@/lib/utils';

/** A fixed field's value is entirely backend-controlled, via sysconfig's own resolved
 *  `entry.value` — always snapped to it, never left at whatever was there before, since a
 *  dependency on some *other* field (e.g. a formula-driven modulus) can recompute it any
 *  time sysconfig re-resolves. Returns `values` itself, unchanged, when nothing needs it. */
function withFixedDefaults(
  values: Record<string, string>,
  sections: FormSection[],
): Record<string, string> {
  let next = values;
  sections.forEach((section) =>
    section.fields.forEach((field) => {
      if (field.fixed && field.value !== undefined && next[field.name] !== field.value) {
        if (next === values) next = { ...values };
        next[field.name] = field.value;
      }
    }),
  );
  return next;
}

/** Loading/error placeholder shared by the Mechanical and Fatigue tabs while
 *  `useMaterialSysconfig` resolves — both tabs' fields come from that one config. */
function SysconfigLoadStatus({ isLoading, isError }: { isLoading: boolean; isError: boolean }) {
  return (
    <>
      {isLoading && (
        <p className="px-2 py-8 text-center text-[14px] text-[#6b7280]">Loading configuration…</p>
      )}
      {isError && (
        <p className="px-2 py-8 text-center text-[14px] text-[#dc2626]">
          Failed to load configuration from the server.
        </p>
      )}
    </>
  );
}

interface Baseline {
  name: string;
  description: string;
  date: string;
  mechValues: Record<string, string>;
  fatigueValues: Record<string, string>;
}

export function MaterialNew() {
  const navigate = useNavigate();
  const exitTarget = useExitEditModeTarget('/material');
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
    [MECH_PROP_TYPE_REFERENCE]: 'ud_ply',
  });
  const [fatigueValues, setFatigueValues] = useState<Record<string, string>>({});
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Set once the user chooses to stay after the exit-confirm warning — forces every
  // missing required field on the Mechanical/Fatigue tabs into its error state.
  const [showMissingFieldErrors, setShowMissingFieldErrors] = useState(false);
  // Set right after the blur-autosave creates the material, so the loading state below
  // doesn't flash "Loading material…" over the tab the user is actively filling in —
  // we already have its data locally; the background refetch is just React Query's habit.
  const [justCreatedId, setJustCreatedId] = useState<number | null>(null);
  // Latest in-flight blur-autosave PUT, if any — the tab-switch refetch below awaits this
  // first so it can't land in between the blur firing and its PUT resolving and overwrite
  // the just-typed value with the pre-edit server snapshot.
  const pendingSaveRef = useRef<Promise<unknown> | null>(null);

  const type = mechValues[MECH_PROP_TYPE_REFERENCE] ?? 'ud_ply';

  // Always fetched — with `?material=:id` once the material exists, or without it for a
  // brand new one (materialId is NaN) — drives the General tab's Type options plus the
  // Mechanical/Fatigue tabs' fields, all straight from the backend.
  const sysconfigQuery = useMaterialSysconfig(materialId);
  const typeParameter = useMemo(
    () => (sysconfigQuery.data ? getMechPropTypeParameter(sysconfigQuery.data) : undefined),
    [sysconfigQuery.data],
  );
  const typeEntry = useMemo(
    () => (sysconfigQuery.data ? getMechPropTypeEntry(sysconfigQuery.data) : undefined),
    [sysconfigQuery.data],
  );
  const mechanicalSections = useMemo(
    () =>
      sysconfigQuery.data
        ? buildSysconfigSections(
            sysconfigQuery.data,
            sysconfigQuery.data.configuration.mechanical_properties,
          )
        : [],
    [sysconfigQuery.data],
  );
  const fatigueSections = useMemo(
    () =>
      sysconfigQuery.data
        ? buildSysconfigSections(
            sysconfigQuery.data,
            sysconfigQuery.data.configuration.fatigue_properties,
          )
        : [],
    [sysconfigQuery.data],
  );

  // Re-sync fixed fields to sysconfig's resolved value every time sysconfig itself
  // changes — including right after a blur-autosave, now that saving mechanical/fatigue
  // properties always invalidates sysconfig too. Patches `baseline` alongside the values
  // so this backend-driven sync is never mistaken for an in-progress user edit.
  useEffect(() => {
    setMechValues((prev) => withFixedDefaults(prev, mechanicalSections));
    setBaseline((prev) =>
      prev ? { ...prev, mechValues: withFixedDefaults(prev.mechValues, mechanicalSections) } : prev,
    );
  }, [mechanicalSections]);

  useEffect(() => {
    setFatigueValues((prev) => withFixedDefaults(prev, fatigueSections));
    setBaseline((prev) =>
      prev ? { ...prev, fatigueValues: withFixedDefaults(prev.fatigueValues, fatigueSections) } : prev,
    );
  }, [fatigueSections]);

  // Values (including Type) always come from GET /material/:id/ — the direct,
  // authoritative source — not sysconfig, which only supplies structure (labels, units,
  // required, min/max, active, fixed). This effect keeps fixed/computed fields and Type
  // in sync every time the detail endpoint refetches (e.g. after a blur-autosave PUT).
  // Non-fixed fields are left alone so this never clobbers an in-progress edit elsewhere.
  useEffect(() => {
    if (!detailQuery.data) return;

    const freshMech = toValueMap(detailQuery.data.mechanical_properties);
    const mechUpdates: Record<string, string> = {};
    const mechDeletes = new Set<string>();
    for (const field of mechanicalSections.flatMap((s) => s.fields)) {
      if (!field.fixed) continue;
      // Fixed fields are always backend-controlled — resolve fully to the material's own
      // saved value, falling back to sysconfig's default, and drop it if neither has one
      // (e.g. it lost relevance after a type change and was never saved).
      const resolved = freshMech[field.name] ?? field.value;
      if (resolved === undefined) {
        if (mechValues[field.name] !== undefined) mechDeletes.add(field.name);
      } else if (mechValues[field.name] !== resolved) {
        mechUpdates[field.name] = resolved;
      }
    }
    if (
      freshMech[MECH_PROP_TYPE_REFERENCE] !== undefined &&
      mechValues[MECH_PROP_TYPE_REFERENCE] !== freshMech[MECH_PROP_TYPE_REFERENCE]
    ) {
      mechUpdates[MECH_PROP_TYPE_REFERENCE] = freshMech[MECH_PROP_TYPE_REFERENCE];
    }

    const freshFatigue = toValueMap(detailQuery.data.fatigue_properties);
    const fatigueUpdates: Record<string, string> = {};
    const fatigueDeletes = new Set<string>();
    for (const field of fatigueSections.flatMap((s) => s.fields)) {
      if (!field.fixed) continue;
      const resolved = freshFatigue[field.name] ?? field.value;
      if (resolved === undefined) {
        if (fatigueValues[field.name] !== undefined) fatigueDeletes.add(field.name);
      } else if (fatigueValues[field.name] !== resolved) {
        fatigueUpdates[field.name] = resolved;
      }
    }

    if (
      Object.keys(mechUpdates).length === 0 &&
      Object.keys(fatigueUpdates).length === 0 &&
      mechDeletes.size === 0 &&
      fatigueDeletes.size === 0
    ) {
      return;
    }
    if (Object.keys(mechUpdates).length > 0 || mechDeletes.size > 0) {
      setMechValues((prev) => {
        const next = { ...prev, ...mechUpdates };
        mechDeletes.forEach((name) => delete next[name]);
        return next;
      });
    }
    if (Object.keys(fatigueUpdates).length > 0 || fatigueDeletes.size > 0) {
      setFatigueValues((prev) => {
        const next = { ...prev, ...fatigueUpdates };
        fatigueDeletes.forEach((name) => delete next[name]);
        return next;
      });
    }
    setBaseline((prev) => {
      if (!prev) return prev;
      const mechValuesNext = { ...prev.mechValues, ...mechUpdates };
      mechDeletes.forEach((name) => delete mechValuesNext[name]);
      const fatigueValuesNext = { ...prev.fatigueValues, ...fatigueUpdates };
      fatigueDeletes.forEach((name) => delete fatigueValuesNext[name]);
      return { ...prev, mechValues: mechValuesNext, fatigueValues: fatigueValuesNext };
    });
    // mechValues/fatigueValues intentionally excluded — this only needs to react to a new
    // detail fetch, not every keystroke; the values read here are current as of that fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQuery.data, mechanicalSections, fatigueSections]);

  // Populate the form once the (forced, never-cached) detail fetch AND sysconfig have both
  // settled, and record a baseline snapshot so saving can tell which of the 3 tabs actually
  // changed. Sysconfig only supplies structure here — every field's value (Type included)
  // comes straight from the detail endpoint, the direct, authoritative source. Waiting on
  // `isFetching` — not just `data` — means we never hydrate from a stale cache hit that
  // React Query may return before the real refetch resolves.
  const hydrated = useHydrateOnce(
    isEditing && !detailQuery.isFetching && !!detailQuery.data && !!sysconfigQuery.data,
    () => {
      // If we just created this material in this same session, local state (set
      // synchronously from the create payload, including whatever the user already typed
      // into Mechanical/Fatigue before this forced refetch resolved) is already correct —
      // re-hydrating from this response would clobber it with the pre-edit snapshot.
      if (materialId === justCreatedId) return;
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
    },
  );

  // Switching into the Mechanical or Fatigue tab re-fetches GET /material/:id/ and fully
  // re-syncs both tabs' fields from its mechanical_properties/fatigue_properties arrays —
  // filling in whatever has a saved value, clearing whatever doesn't. Safe to overwrite
  // in-progress edits here: switching tabs blurs the previous tab's fields first, so
  // anything editable has already autosaved by the time this runs.
  useEffect(() => {
    if (!isEditing || !hydrated || (activeTab !== 'mechanical' && activeTab !== 'fatigue')) return;
    Promise.resolve(pendingSaveRef.current)
      .catch(() => {})
      .then(() => detailQuery.refetch())
      .then((result) => {
        const data = result.data;
        if (!data) return;
        const freshMech = withFixedDefaults(
          toValueMap(data.mechanical_properties),
          mechanicalSections,
        );
        const freshFatigue = withFixedDefaults(
          toValueMap(data.fatigue_properties),
          fatigueSections,
        );
        setMechValues(freshMech);
        setFatigueValues(freshFatigue);
        setBaseline((prev) =>
          prev ? { ...prev, mechValues: freshMech, fatigueValues: freshFatigue } : prev,
        );
      });
    // Deliberately re-runs only on tab changes — detailQuery/mechanicalSections/fatigueSections
    // are read fresh via closure, and isEditing/hydrated never flip back after becoming true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Duplicate: prefill a NEW (create-mode) form from another material's data, with
  // "_copy" appended to the name. No baseline needed — Save always does a plain POST here.
  const duplicateHydrated = useHydrateOnce(
    !isEditing &&
      Number.isFinite(duplicateSourceId) &&
      !duplicateQuery.isFetching &&
      !!duplicateQuery.data,
    () => {
      const m = duplicateQuery.data!;
      setName(`${m.name}_copy`);
      setDescription(m.description ?? '');
      setDate(toDateInputValue(m.date));
      setMechValues(toValueMap(m.mechanical_properties));
      setFatigueValues(toValueMap(m.fatigue_properties));
    },
  );

  // Title: editing shows the material name everywhere; creating shows "New material" on General.
  const titleText = isEditing
    ? name || 'Loading…'
    : activeTab === 'general'
      ? 'New material'
      : name || 'New material';

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
    !baseline ||
    name !== baseline.name ||
    date !== baseline.date ||
    description !== baseline.description;
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
        mechanical_properties: toKeyValueList(pickActiveFields(mechValues, mechanicalSections)),
        fatigue_properties: toKeyValueList(pickActiveFields(fatigueValues, fatigueSections)),
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

  // Only "Saving…"/"Saved" is shown here — an incomplete-but-persisted tab still reads
  // as "Saved" (its missing required fields are surfaced separately, via the exit-confirm flow).
  const generalStatus: SaveStatus =
    createMaterialMutation.isPending || updateGeneralMutation.isPending ? 'saving' : 'saved';

  // Autosave the General tab once every required field is filled — fires when focus
  // leaves a field (blur) or the form itself (click-out), not on every keystroke. Gates
  // only on its own mutations (not the aggregate savePending) — otherwise a Mechanical/
  // Fatigue save still in flight (e.g. from handleTypeChange) would silently swallow this.
  async function handleGeneralBlur() {
    if (
      !generalValid ||
      !hasUnsavedGeneral ||
      createMaterialMutation.isPending ||
      updateGeneralMutation.isPending
    ) {
      return;
    }
    try {
      await saveGeneralFields();
    } catch {
      // saveGeneralFields's onError (global mutation cache) already toasts.
    }
  }

  // Type lives on the General tab but is actually a mechanical property. On an
  // already-created material, persist it immediately: PUT general (only if something
  // there is actually unsaved) and PUT just the mech_prop_type entry — isolated from
  // whatever else might be pending on the Mechanical tab. The two PUTs target unrelated
  // endpoints and neither depends on the other's result, so they run in parallel. On a
  // material that doesn't exist yet, just update local state; it rides along in the
  // initial create POST once General gets saved.
  async function handleTypeChange(newType: string) {
    setMechValues((prev) => ({ ...prev, [MECH_PROP_TYPE_REFERENCE]: newType }));
    if (!isEditing) return;
    const savePromise = Promise.all([
      // Same guard as handleGeneralBlur — never PUT general fields while a required
      // one (e.g. Name) is empty.
      generalValid ? saveGeneralFields() : Promise.resolve(materialId),
      updateMechanicalMutation.mutateAsync({
        payload: {
          mechanical_properties: [{ reference: MECH_PROP_TYPE_REFERENCE, value: newType }],
        },
      }),
    ]);
    pendingSaveRef.current = savePromise;
    try {
      await savePromise;
      setBaseline((prev) =>
        prev
          ? { ...prev, mechValues: { ...prev.mechValues, [MECH_PROP_TYPE_REFERENCE]: newType } }
          : prev,
      );
    } catch {
      // saveGeneralFields/updateMechanicalMutation's onError (global mutation cache) already toasts.
    }
  }

  // Whether every mandatory Mechanical-tab field is filled AND every filled field is
  // within its min/max — gates moving to the Fatigue tab and the header's status.
  // Autosaving itself only needs the (looser) range check: partial/incomplete data is
  // fine to save, out-of-range data isn't.
  const mechanicalValid = isFormValid(mechanicalSections, mechValues);
  const mechanicalRangeValid = isFormRangeValid(mechanicalSections, mechValues);
  const mechanicalUnsaved =
    keyValueSignature(mechValues) !== keyValueSignature(baseline?.mechValues ?? {});
  const mechanicalStatus: SaveStatus = updateMechanicalMutation.isPending ? 'saving' : 'saved';

  // Autosave the Mechanical tab on every blur, even before all mandatory fields are
  // filled — same PUT as before, just no longer gated on completeness.
  async function handleMechanicalBlur() {
    if (!mechanicalRangeValid || !mechanicalUnsaved || updateMechanicalMutation.isPending) return;
    const savePromise = updateMechanicalMutation.mutateAsync({
      payload: {
        mechanical_properties: toKeyValueList(pickActiveFields(mechValues, mechanicalSections)),
      },
    });
    pendingSaveRef.current = savePromise;
    try {
      await savePromise;
      setBaseline((prev) => (prev ? { ...prev, mechValues } : prev));
    } catch {
      // updateMechanicalMutation's onError (global mutation cache) already toasts.
    }
  }

  // Whether every mandatory Fatigue-tab field is filled AND every filled field is
  // within its min/max — same structure as the Mechanical tab above.
  const fatigueValid = isFormValid(fatigueSections, fatigueValues);
  const fatigueRangeValid = isFormRangeValid(fatigueSections, fatigueValues);
  const fatigueUnsaved =
    keyValueSignature(fatigueValues) !== keyValueSignature(baseline?.fatigueValues ?? {});
  const fatigueStatus: SaveStatus = updateFatigueMutation.isPending ? 'saving' : 'saved';

  // Autosave the Fatigue tab on every blur, even before all mandatory fields are
  // filled — same structure as Mechanical above.
  async function handleFatigueBlur() {
    if (!fatigueRangeValid || !fatigueUnsaved || updateFatigueMutation.isPending) return;
    const savePromise = updateFatigueMutation.mutateAsync({
      fatigue_properties: toKeyValueList(pickActiveFields(fatigueValues, fatigueSections)),
    });
    pendingSaveRef.current = savePromise;
    try {
      await savePromise;
      setBaseline((prev) => (prev ? { ...prev, fatigueValues } : prev));
    } catch {
      // updateFatigueMutation's onError (global mutation cache) already toasts.
    }
  }

  // Only meaningful once the material actually exists — a blank/in-progress draft that
  // was never created has nothing incomplete to warn about.
  const isIncomplete = isEditing && (!mechanicalValid || !fatigueValid);

  function handleExit() {
    if (isIncomplete) {
      setShowExitConfirm(true);
      return;
    }
    navigate(exitTarget);
  }

  // Everything already autosaves on blur — exiting anyway just means leaving with
  // whatever's already persisted, incomplete or not.
  function handleExitAnyway() {
    setShowExitConfirm(false);
    navigate(exitTarget);
  }

  // Staying surfaces exactly what's missing, on whichever tab it's on.
  function handleStayAndReview() {
    setShowExitConfirm(false);
    setShowMissingFieldErrors(true);
  }

  const isDuplicating = !isEditing && Number.isFinite(duplicateSourceId);
  const showLoadingState =
    (isEditing &&
      materialId !== justCreatedId &&
      !hydrated &&
      (detailQuery.isLoading ||
        detailQuery.isFetching ||
        sysconfigQuery.isLoading ||
        sysconfigQuery.isFetching)) ||
    (isDuplicating &&
      !duplicateHydrated &&
      (duplicateQuery.isLoading || duplicateQuery.isFetching));
  // Scoped to !hydrated so a later background sysconfig refetch failure (e.g. after a
  // blur-autosave PUT) doesn't blank out an already-loaded Mechanical/Fatigue tab — those
  // handle that case inline via their own sysconfigQuery.isError check further down.
  const showLoadErrorState =
    (isEditing && !hydrated && (detailQuery.isError || sysconfigQuery.isError)) ||
    (isDuplicating && duplicateQuery.isError);

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
        status={
          activeTab === 'mechanical'
            ? mechanicalStatus
            : activeTab === 'fatigue'
              ? fatigueStatus
              : activeTab === 'general'
                ? generalStatus
                : undefined
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
            onTypeChange={handleTypeChange}
            typeLabel={typeParameter?.name}
            typeOptions={typeParameter?.options}
            typeDisabled={typeEntry?.fixed}
            date={date}
            onDateChange={setDate}
            description={description}
            onDescriptionChange={setDescription}
            onBlur={handleGeneralBlur}
          />
        )}

        {!showLoadingState && !showLoadErrorState && activeTab === 'mechanical' && (
          <>
            <SysconfigLoadStatus
              isLoading={sysconfigQuery.isLoading}
              isError={sysconfigQuery.isError}
            />
            {sysconfigQuery.data && (
              <PropertyFormTab
                sections={mechanicalSections}
                values={mechValues}
                onChange={(name, value) => setMechValues((prev) => ({ ...prev, [name]: value }))}
                onBlur={handleMechanicalBlur}
                forceShowErrors={showMissingFieldErrors}
              />
            )}
          </>
        )}

        {!showLoadingState && !showLoadErrorState && activeTab === 'fatigue' && (
          <>
            <SysconfigLoadStatus
              isLoading={sysconfigQuery.isLoading}
              isError={sysconfigQuery.isError}
            />
            {sysconfigQuery.data && (
              <PropertyFormTab
                sections={fatigueSections}
                values={fatigueValues}
                onChange={(name, value) => setFatigueValues((prev) => ({ ...prev, [name]: value }))}
                onBlur={handleFatigueBlur}
                forceShowErrors={showMissingFieldErrors}
              />
            )}
          </>
        )}
      </main>

      <ConfirmDialog
        open={showExitConfirm}
        title="Exit without finishing?"
        message="Not all required fields are filled in. You can exit anyway — your data is saved, but this material won't be usable in a layup until it's complete."
        confirmLabel="Exit anyway"
        cancelLabel="Stay and review"
        onConfirm={handleExitAnyway}
        onCancel={handleStayAndReview}
      />
    </div>
  );
}
