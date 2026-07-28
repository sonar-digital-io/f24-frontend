import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MainNav } from '@/components/common/layout/MainNav';
import { EditPageToolbar } from '@/components/common/layout/EditPageToolbar';
import { PropertyFormTab } from '@/components/material/PropertyFormTab';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownSelect as Select } from '@/components/common/form/DropdownSelect';
import { MECHANICAL_SECTIONS, FATIGUE_SECTIONS } from '@/data/materialFormFields';
import {
  useCreateMaterial,
  useMaterialDetail,
  useUpdateMaterial,
  useUpdateMechanicalProperties,
  useUpdateFatigueProperties,
} from '@/hooks/api/useMaterials';
import type { MaterialPayload } from '@/api/types/materials';
import type { KeyValuePair } from '@/api/types/common';
import { todayISO, toIsoDateTime, toDateInputValue } from '@/lib/utils';

const TABS = [
  { value: 'general', label: 'General' },
  { value: 'mechanical', label: 'Mechanical properties' },
  { value: 'fatigue', label: 'Fatigue properties' },
];

const MATERIAL_TYPES = [
  'UD ply',
  'Biaxial Ply (±45°)',
  'Consolidated Ply',
  'Hybrid Ply',
  'Random Mat Ply',
  'Surface Ply',
  'Core (PET Foam)',
  'Core (Balsa)',
];

interface Baseline {
  name: string;
  type: string;
  description: string;
  date: string;
  mechValues: Record<string, string>;
  fatigueValues: Record<string, string>;
}

function toKeyValueList(values: Record<string, string>) {
  return Object.entries(values)
    .filter(([, value]) => value.trim() !== '')
    .map(([reference, value]) => ({ reference, value }));
}

function toValueMap(list?: KeyValuePair[]): Record<string, string> {
  const map: Record<string, string> = {};
  (list ?? []).forEach((kv) => {
    map[kv.reference] = String(kv.value);
  });
  return map;
}

/** Order-independent signature of a values record, for change detection. */
function keyValueSignature(values: Record<string, string>): string {
  return JSON.stringify(
    toKeyValueList(values).sort((a, b) => a.reference.localeCompare(b.reference))
  );
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
  const [type, setType] = useState('UD ply');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());
  const [activeTab, setActiveTab] = useState('general');
  const [mechValues, setMechValues] = useState<Record<string, string>>({});
  const [fatigueValues, setFatigueValues] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [duplicateHydrated, setDuplicateHydrated] = useState(false);

  // Populate the form once the (forced, never-cached) detail fetch settles, and record a
  // baseline snapshot so saving can tell which of the 3 tabs actually changed. Waiting on
  // `isFetching` — not just `data` — means we never hydrate from a stale cache hit that
  // React Query may return synchronously before the real network refetch resolves.
  useEffect(() => {
    if (!isEditing || hydrated || detailQuery.isFetching || !detailQuery.data) return;
    const m = detailQuery.data;
    const hydratedDescription = m.description ?? '';
    const hydratedDate = toDateInputValue(m.date);
    const hydratedMech = toValueMap(m.mechanical_properties);
    const hydratedFatigue = toValueMap(m.fatigue_properties);
    setName(m.name);
    setType(m.type);
    setDescription(hydratedDescription);
    setDate(hydratedDate);
    setMechValues(hydratedMech);
    setFatigueValues(hydratedFatigue);
    setBaseline({
      name: m.name,
      type: m.type,
      description: hydratedDescription,
      date: hydratedDate,
      mechValues: hydratedMech,
      fatigueValues: hydratedFatigue,
    });
    setHydrated(true);
  }, [isEditing, hydrated, detailQuery.isFetching, detailQuery.data]);

  // Duplicate: prefill a NEW (create-mode) form from another material's data, with
  // "_copy" appended to the name. No baseline needed — Save always does a plain POST here.
  useEffect(() => {
    if (
      isEditing ||
      duplicateHydrated ||
      !Number.isFinite(duplicateSourceId) ||
      duplicateQuery.isFetching ||
      !duplicateQuery.data
    ) {
      return;
    }
    const m = duplicateQuery.data;
    setName(`${m.name}_copy`);
    setType(m.type);
    setDescription(m.description ?? '');
    setDate(toDateInputValue(m.date));
    setMechValues(toValueMap(m.mechanical_properties));
    setFatigueValues(toValueMap(m.fatigue_properties));
    setDuplicateHydrated(true);
  }, [isEditing, duplicateHydrated, duplicateSourceId, duplicateQuery.isFetching, duplicateQuery.data]);

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

  /**
   * Creating sends one POST with everything. Editing calls only the endpoints whose
   * tab actually changed: PUT /material/:id/ (general, minus type), PUT .../mechanical-properties/
   * (mechanical tab + type), PUT .../fatigue-properties/ (fatigue tab).
   */
  async function handleSave() {
    if (!isEditing) {
      const payload: MaterialPayload = {
        name,
        date: toIsoDateTime(date),
        description,
        mechanical_properties: toKeyValueList(mechValues),
        fatigue_properties: toKeyValueList(fatigueValues),
      };
      await createMaterialMutation.mutateAsync(payload);
      navigate('/material');
      return;
    }

    if (!baseline) return;

    const generalChanged =
      name !== baseline.name || date !== baseline.date || description !== baseline.description;
    const mechanicalChanged =
      type !== baseline.type || keyValueSignature(mechValues) !== keyValueSignature(baseline.mechValues);
    const fatigueChanged = keyValueSignature(fatigueValues) !== keyValueSignature(baseline.fatigueValues);

    const tasks: Promise<unknown>[] = [];
    if (generalChanged) {
      tasks.push(updateGeneralMutation.mutateAsync({ name, date: toIsoDateTime(date), description }));
    }
    if (mechanicalChanged) {
      tasks.push(updateMechanicalMutation.mutateAsync({ type, mechanical_properties: toKeyValueList(mechValues) }));
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
    (isEditing && !hydrated && (detailQuery.isLoading || detailQuery.isFetching)) ||
    (isDuplicating && !duplicateHydrated && (duplicateQuery.isLoading || duplicateQuery.isFetching));
  const showLoadErrorState = (isEditing && detailQuery.isError) || (isDuplicating && duplicateQuery.isError);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#f8fafc]">
      <MainNav />

      <EditPageToolbar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title={titleText}
        backLabel="Back to Materials"
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
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex w-full max-w-[468px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
          >
            <div className="flex w-full flex-col gap-2">
              <Label
                htmlFor="material-name"
                className="text-[14px] font-medium leading-none text-[#0a0a0a]"
              >
                Name<span className="text-[#dc2626]">*</span>
              </Label>
              <Input
                id="material-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ST-UD-C600-EP"
                required
                className="h-9 rounded-md border-[#e2e8f0] bg-white px-3 py-1 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              />
            </div>

            <div className="flex w-full flex-col gap-2">
              <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
                Type<span className="text-[#dc2626]">*</span>
              </Label>
              <Select value={type} onChange={setType} options={MATERIAL_TYPES} />
            </div>

            <div className="flex w-full flex-col gap-2">
              <Label
                htmlFor="material-date"
                className="text-[14px] font-medium leading-none text-[#0a0a0a]"
              >
                Date<span className="text-[#dc2626]">*</span>
              </Label>
              <Input
                id="material-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-9 rounded-md border-[#e2e8f0] bg-white px-3 py-1 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              />
            </div>

            <div className="flex w-full flex-col gap-2">
              <Label
                htmlFor="material-description"
                className="text-[14px] font-medium leading-none text-[#0a0a0a]"
              >
                Description<span className="text-[#dc2626]">*</span>
              </Label>
              <Textarea
                id="material-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Carbon/Epoxy UD lamina. Fiber: Toray T700 (600gsm). Matrix: ST-Epoxy-Standard."
                required
                rows={4}
                className="min-h-[98px] rounded-md border-[#e2e8f0] bg-white px-3 py-2 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              />
            </div>
          </form>
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
