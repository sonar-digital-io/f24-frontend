import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MainNav } from '@/components/common/layout/MainNav';
import { EditPageToolbar } from '@/components/common/layout/EditPageToolbar';
import { LoadGroupGeneralTab } from '@/components/load-group/LoadGroupGeneralTab';
import { LoadGroupLoadCasesTab } from '@/components/load-group/LoadGroupLoadCasesTab';
import { LoadGroupLimitsTab } from '@/components/load-group/LoadGroupLimitsTab';
import { LoadGroupFatigueProfilesTab } from '@/components/load-group/LoadGroupFatigueProfilesTab';
import { LoadCasePickerDialog } from '@/components/load-group/LoadCasePickerDialog';
import {
  useCreateLoadGroup,
  useFatigueProfiles,
  useLoadCases,
  useLoadGroupDetail,
  useUpdateFatigueProfiles,
  useUpdateLoadCases,
  useUpdateLoadGroup,
  useUpdateLoadGroupLimits,
} from '@/hooks/api/useLoadGroups';
import { todayISO, toIsoDateTime, toDateInputValue } from '@/lib/utils';
import { loadCaseHasErrors } from '@/lib/loadCaseValidation';
import { fatigueProfilesHaveErrors } from '@/lib/fatigueValidation';
import type { FatigueCase, FatigueProfile, LoadCase, LoadLimitRange } from '@/api/types/loadGroups';
import {
  INITIAL_LOAD_LIMITS,
  type LimitsSubTab,
  type LoadGroupTab,
} from '@/data/loadGroupForm';

const LOAD_GROUP_TABS = [
  { value: 'general', label: 'General' },
  { value: 'load-cases', label: 'Load cases' },
  { value: 'limits', label: 'Limits' },
  { value: 'fatigue-profiles', label: 'Fatigue profiles' },
];

export function LoadGroupNew() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = !id || id === 'new';
  const loadGroupId = isNew ? NaN : Number(id);
  const duplicateFromRaw = isNew ? searchParams.get('duplicateFrom') : null;
  const duplicateSourceId = duplicateFromRaw ? Number(duplicateFromRaw) : NaN;

  const detailQuery = useLoadGroupDetail(loadGroupId);
  const duplicateQuery = useLoadGroupDetail(duplicateSourceId);
  const createMutation = useCreateLoadGroup();
  const updateMutation = useUpdateLoadGroup(loadGroupId);

  const [activeTab, setActiveTab] = useState<LoadGroupTab>('general');

  // General — hydrated from the backend for edit/duplicate; a fresh POST/PUT
  // {name, description, created_at} is the only real endpoint this page wires
  // up so far. The other 3 tabs (load cases/limits/fatigue profiles) stay on
  // local mock state: their UI models carry many fields the typed backend
  // payloads don't define (e.g. load case altitude/disa/inflow*), so wiring
  // them would mean silently dropping data — left for a follow-up once
  // that's resolved.
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());
  const [hydrated, setHydrated] = useState(false);
  const [baseline, setBaseline] = useState<{ name: string; description: string; date: string } | null>(null);
  const [duplicateHydrated, setDuplicateHydrated] = useState(false);

  useEffect(() => {
    if (isNew || hydrated || detailQuery.isFetching || !detailQuery.data) return;
    const g = detailQuery.data;
    const hydratedDescription = g.description ?? '';
    const hydratedDate = typeof g.created_at === 'string' ? toDateInputValue(g.created_at) : todayISO();
    setName(g.name);
    setDescription(hydratedDescription);
    setDate(hydratedDate);
    setBaseline({ name: g.name, description: hydratedDescription, date: hydratedDate });
    // A freshly-created load group's limits come back with an empty curve
    // (no points saved yet) rather than being omitted — keep the default
    // 2-point curve in that case instead of collapsing the chart to nothing.
    const withCurve = (incoming: LoadLimitRange | undefined, fallback: LoadLimitRange) =>
      incoming && incoming.curve.length >= 2 ? incoming : fallback;
    setLimits((prev) => ({
      thrust: withCurve(g.rpm_thrust_limit, prev.thrust),
      torque: withCurve(g.rpm_torque_limit, prev.torque),
      power: withCurve(g.rpm_power_limit, prev.power),
    }));
    setHydrated(true);
  }, [isNew, hydrated, detailQuery.isFetching, detailQuery.data]);

  useEffect(() => {
    if (
      !isNew ||
      duplicateHydrated ||
      !Number.isFinite(duplicateSourceId) ||
      duplicateQuery.isFetching ||
      !duplicateQuery.data
    ) {
      return;
    }
    const g = duplicateQuery.data;
    setName(`${g.name}_copy`);
    setDescription(g.description ?? '');
    setDate(typeof g.created_at === 'string' ? toDateInputValue(g.created_at) : todayISO());
    setDuplicateHydrated(true);
  }, [isNew, duplicateHydrated, duplicateSourceId, duplicateQuery.isFetching, duplicateQuery.data]);

  // Load cases — 0 by default until the user adds one; hydrated from the
  // backend for edit/duplicate, saved via a dedicated PUT /load/:id/load-cases/.
  const loadCasesQuery = useLoadCases(loadGroupId);
  const updateLoadCasesMutation = useUpdateLoadCases(loadGroupId);
  const [loadCases, setLoadCases] = useState<LoadCase[]>([]);
  const [loadCasesHydrated, setLoadCasesHydrated] = useState(false);

  useEffect(() => {
    if (isNew || loadCasesHydrated || loadCasesQuery.isFetching || !loadCasesQuery.data) return;
    setLoadCases(
      loadCasesQuery.data.load_cases.map((lc) => ({ ...lc, __KEY__: lc.__KEY__ || crypto.randomUUID() }))
    );
    setLoadCasesHydrated(true);
  }, [isNew, loadCasesHydrated, loadCasesQuery.isFetching, loadCasesQuery.data]);

  // A fatigue case's load_case references a load case's backend id — only
  // load cases that have already been saved (and so have one) are pickable.
  const pickableLoadCases = loadCases
    .filter((lc): lc is LoadCase & { id: number } => lc.id !== undefined)
    .map((lc) => ({ id: lc.id, name: lc.name }));
  const loadCaseNamesById = Object.fromEntries(pickableLoadCases.map((lc) => [lc.id, lc.name]));

  // Limits — no GET for this yet, so it's local-only until saved via the
  // dedicated PUT /load/:id/limits/.
  const updateLimitsMutation = useUpdateLoadGroupLimits(loadGroupId);
  const [limitsSubTab, setLimitsSubTab] = useState<LimitsSubTab>('thrust');
  const [limits, setLimits] = useState<Record<LimitsSubTab, LoadLimitRange>>(INITIAL_LOAD_LIMITS);

  // Fatigue profiles — 0 by default until the user adds one; hydrated from
  // the backend for edit/duplicate, saved via a dedicated PUT
  // /load/:id/fatigue-profiles/ (sent as a raw array).
  const fatigueProfilesQuery = useFatigueProfiles(loadGroupId);
  const updateFatigueProfilesMutation = useUpdateFatigueProfiles(loadGroupId);
  const [fatigueProfiles, setFatigueProfiles] = useState<FatigueProfile[]>([]);
  const [fatigueProfilesHydrated, setFatigueProfilesHydrated] = useState(false);
  // Accordion open/closed — pure UI state, not part of the saved payload.
  const [openFatigueProfiles, setOpenFatigueProfiles] = useState<Record<string, boolean>>({});
  const [fatigueSearch, setFatigueSearch] = useState('');
  const [pickingLoadCase, setPickingLoadCase] = useState<{
    profileKey: string;
    caseKey: string;
  } | null>(null);

  useEffect(() => {
    if (isNew || fatigueProfilesHydrated || fatigueProfilesQuery.isFetching || !fatigueProfilesQuery.data) return;
    const hydratedProfiles = fatigueProfilesQuery.data.map((p) => ({
      ...p,
      __KEY__: p.__KEY__ || crypto.randomUUID(),
      fatigue_cases: p.fatigue_cases.map((c) => ({
        ...c,
        __KEY__: c.__KEY__ || crypto.randomUUID(),
        cycles: c.cycles ?? null,
      })),
    }));
    setFatigueProfiles(hydratedProfiles);
    setFatigueProfilesHydrated(true);
  }, [isNew, fatigueProfilesHydrated, fatigueProfilesQuery.isFetching, fatigueProfilesQuery.data]);

  const titleText = isNew ? name.trim() || 'New load group' : name.trim() || 'Loading…';

  const savePending = createMutation.isPending || updateMutation.isPending;
  const saveError = createMutation.isError || updateMutation.isError;

  // ── Exit / save ──────────────────────────────────────────────────────────
  async function handleSaveGeneral() {
    if (isNew) {
      const created = await createMutation.mutateAsync({ name, description, created_at: toIsoDateTime(date) });
      // /load-group/new and /load-group/:id share a route, so this navigate does
      // NOT remount the component — switching the URL just flips isNew to false.
      setActiveTab('load-cases');
      navigate(`/load-group/${created.id}`, { replace: true });
      return;
    }
    if (!baseline || name !== baseline.name || description !== baseline.description || date !== baseline.date) {
      await updateMutation.mutateAsync({ name, description, created_at: toIsoDateTime(date) });
    }
    navigate('/load-group');
  }

  function handleExit() {
    navigate('/load-group');
  }

  // ── Load cases helpers ───────────────────────────────────────────────────
  function updateLoadCase<K extends keyof LoadCase>(key: string, field: K, val: LoadCase[K]) {
    setLoadCases((prev) => prev.map((c) => (c.__KEY__ === key ? { ...c, [field]: val } : c)));
  }

  function addLoadCase() {
    const lc: LoadCase = {
      __KEY__: crypto.randomUUID(),
      name: '',
      // pitch and rpm can't both be 'range' — only one dimension can vary at a time.
      pitch_flag: 'fix',
      pitch_min: 0,
      pitch_max: null,
      rpm_flag: 'range',
      rpm_min: 0,
      rpm_max: 15,
      altitude: 0,
      disa: 0,
      inflow_velocity: 10,
      inflow_angle: 0,
      target_type: 'power',
      target_value: 0,
    };
    setLoadCases((prev) => [...prev, lc]);
  }

  function deleteLoadCase(key: string) {
    setLoadCases((prev) => prev.filter((c) => c.__KEY__ !== key));
  }

  function duplicateLoadCase(key: string) {
    setLoadCases((prev) => {
      const idx = prev.findIndex((c) => c.__KEY__ === key);
      if (idx === -1) return prev;
      const src = prev[idx];
      const clone: LoadCase = {
        ...src,
        __KEY__: crypto.randomUUID(),
        name: src.name ? `${src.name} copy` : 'copy',
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }

  async function handleSaveLoadCases() {
    await updateLoadCasesMutation.mutateAsync({ load_cases: loadCases });
  }

  const loadCasesHaveErrors = loadCases.some(loadCaseHasErrors);

  // ── Limits helpers ───────────────────────────────────────────────────────
  function updateLimitBounds(sub: LimitsSubTab, field: 'x_min' | 'x_max' | 'y_min' | 'y_max', val: number) {
    setLimits((prev) => ({ ...prev, [sub]: { ...prev[sub], [field]: val } }));
  }

  function updateLimitCurvePoint(sub: LimitsSubTab, idx: number, field: 'rpm' | 'value', val: number) {
    setLimits((prev) => ({
      ...prev,
      [sub]: { ...prev[sub], curve: prev[sub].curve.map((c, i) => (i === idx ? { ...c, [field]: val } : c)) },
    }));
  }

  function handleLimitCurveChange(sub: LimitsSubTab, curve: LoadLimitRange['curve']) {
    setLimits((prev) => ({ ...prev, [sub]: { ...prev[sub], curve } }));
  }

  function addLimitCurvePoint(sub: LimitsSubTab) {
    setLimits((prev) => {
      const curve = prev[sub].curve;
      const secondLast = curve[curve.length - 2];
      const last = curve[curve.length - 1];
      const newRpm = (secondLast.rpm + last.rpm) / 2;
      const newValue = (secondLast.value + last.value) / 2;
      const nextCurve = [...curve.slice(0, curve.length - 1), { rpm: newRpm, value: newValue }, last];
      return { ...prev, [sub]: { ...prev[sub], curve: nextCurve } };
    });
  }

  function deleteLimitCurvePoint(sub: LimitsSubTab, idx: number) {
    setLimits((prev) => ({
      ...prev,
      [sub]: { ...prev[sub], curve: prev[sub].curve.filter((_, i) => i !== idx) },
    }));
  }

  async function handleSaveLimits() {
    await updateLimitsMutation.mutateAsync({
      rpm_thrust_limit: limits.thrust,
      rpm_torque_limit: limits.torque,
      rpm_power_limit: limits.power,
    });
  }

  // ── Fatigue profile helpers ──────────────────────────────────────────────
  function toggleFatigueProfile(profileKey: string) {
    setOpenFatigueProfiles((prev) => ({ ...prev, [profileKey]: !prev[profileKey] }));
  }

  function addFatigueProfile() {
    const key = crypto.randomUUID();
    setFatigueProfiles((prev) => [...prev, { __KEY__: key, name: 'New fatigue profile', fatigue_cases: [] }]);
    setOpenFatigueProfiles((prev) => ({ ...prev, [key]: true }));
  }

  function deleteFatigueProfile(profileKey: string) {
    setFatigueProfiles((prev) => prev.filter((p) => p.__KEY__ !== profileKey));
  }

  function duplicateFatigueProfile(profileKey: string) {
    setFatigueProfiles((prev) => {
      const profile = prev.find((p) => p.__KEY__ === profileKey);
      if (!profile) return prev;
      const clone: FatigueProfile = {
        ...profile,
        __KEY__: crypto.randomUUID(),
        name: `${profile.name} (copy)`,
        fatigue_cases: profile.fatigue_cases.map((c) => ({ ...c, __KEY__: crypto.randomUUID() })),
      };
      return [...prev, clone];
    });
  }

  function updateFatigueProfileName(profileKey: string, newName: string) {
    setFatigueProfiles((prev) =>
      prev.map((p) => (p.__KEY__ === profileKey ? { ...p, name: newName } : p))
    );
  }

  function addFatigueCase(profileKey: string) {
    setFatigueProfiles((prev) =>
      prev.map((p) => {
        if (p.__KEY__ !== profileKey) return p;
        const fc: FatigueCase = {
          __KEY__: crypto.randomUUID(),
          name: '',
          load_case: null,
          // Backend requires min_scale > 0.
          min_scale: 1,
          max_scale: 100,
          time: null,
          cycles: null,
        };
        return { ...p, fatigue_cases: [...p.fatigue_cases, fc] };
      })
    );
  }

  function deleteFatigueCase(profileKey: string, caseKey: string) {
    setFatigueProfiles((prev) =>
      prev.map((p) =>
        p.__KEY__ === profileKey
          ? { ...p, fatigue_cases: p.fatigue_cases.filter((c) => c.__KEY__ !== caseKey) }
          : p
      )
    );
  }

  function updateFatigueCase<K extends keyof FatigueCase>(
    profileKey: string,
    caseKey: string,
    field: K,
    val: FatigueCase[K]
  ) {
    setFatigueProfiles((prev) =>
      prev.map((p) =>
        p.__KEY__ !== profileKey
          ? p
          : {
              ...p,
              fatigue_cases: p.fatigue_cases.map((c) => (c.__KEY__ === caseKey ? { ...c, [field]: val } : c)),
            }
      )
    );
  }

  async function handleSaveFatigueProfiles() {
    await updateFatigueProfilesMutation.mutateAsync(fatigueProfiles);
  }

  const fatigueProfilesInvalid = fatigueProfilesHaveErrors(fatigueProfiles);

  // ── Tab trigger class ─────────────────────────────────────────────────────
  const triggerCls =
    'h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]';

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#f8fafc]">
      <MainNav />

      <EditPageToolbar
        tabs={LOAD_GROUP_TABS}
        activeTab={activeTab}
        onTabChange={(v) => setActiveTab(v as LoadGroupTab)}
        title={titleText}
        backLabel="Back to Load groups"
        onBack={handleExit}
        actions={
          activeTab === 'general' ? (
            <button
              type="button"
              onClick={handleSaveGeneral}
              disabled={!name.trim() || !date || savePending}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-[#006496] px-3 py-2 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savePending ? 'Saving…' : isNew ? 'Create load group' : 'Update load group'}
            </button>
          ) : activeTab === 'load-cases' ? (
            <button
              type="button"
              onClick={handleSaveLoadCases}
              disabled={updateLoadCasesMutation.isPending || loadCasesHaveErrors}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-[#006496] px-3 py-2 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {updateLoadCasesMutation.isPending ? 'Saving…' : 'Save load cases'}
            </button>
          ) : activeTab === 'limits' ? (
            <button
              type="button"
              onClick={handleSaveLimits}
              disabled={updateLimitsMutation.isPending}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-[#006496] px-3 py-2 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {updateLimitsMutation.isPending ? 'Saving…' : 'Save limits'}
            </button>
          ) : activeTab === 'fatigue-profiles' ? (
            <button
              type="button"
              onClick={handleSaveFatigueProfiles}
              disabled={updateFatigueProfilesMutation.isPending || fatigueProfilesInvalid}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-[#006496] px-3 py-2 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {updateFatigueProfilesMutation.isPending ? 'Saving…' : 'Save fatigue profiles'}
            </button>
          ) : undefined
        }
      />
      {saveError && (
        <p className="px-4 text-[13px] text-[#dc2626]">
          Failed to {isNew ? 'create' : 'update'} load group. Please try again.
        </p>
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden px-4 pb-6 pt-4">
        <div>
          {activeTab === 'general' && (
            <LoadGroupGeneralTab
              isNew={isNew}
              name={name}
              onNameChange={setName}
              description={description}
              onDescriptionChange={setDescription}
              date={date}
              onDateChange={setDate}
            />
          )}

          {activeTab === 'load-cases' && (
            <LoadGroupLoadCasesTab
              loadCases={loadCases}
              onUpdateLoadCase={updateLoadCase}
              onAddLoadCase={addLoadCase}
              onDuplicateLoadCase={duplicateLoadCase}
              onDeleteLoadCase={deleteLoadCase}
            />
          )}

          {activeTab === 'limits' && (
            <LoadGroupLimitsTab
              limitsSubTab={limitsSubTab}
              onLimitsSubTabChange={setLimitsSubTab}
              limits={limits}
              onUpdateBounds={updateLimitBounds}
              onUpdateCurvePoint={updateLimitCurvePoint}
              onCurveChange={handleLimitCurveChange}
              onAddCurvePoint={addLimitCurvePoint}
              onDeleteCurvePoint={deleteLimitCurvePoint}
              tabTriggerClassName={triggerCls}
            />
          )}

          {activeTab === 'fatigue-profiles' && (
            <LoadGroupFatigueProfilesTab
              fatigueProfiles={fatigueProfiles}
              openProfiles={openFatigueProfiles}
              loadCaseNamesById={loadCaseNamesById}
              fatigueSearch={fatigueSearch}
              onFatigueSearchChange={setFatigueSearch}
              onAddFatigueProfile={addFatigueProfile}
              onToggleFatigueProfile={toggleFatigueProfile}
              onDuplicateFatigueProfile={duplicateFatigueProfile}
              onDeleteFatigueProfile={deleteFatigueProfile}
              onUpdateFatigueProfileName={updateFatigueProfileName}
              onAddFatigueCase={addFatigueCase}
              onDeleteFatigueCase={deleteFatigueCase}
              onUpdateFatigueCase={updateFatigueCase}
              onPickLoadCase={(profileKey, caseKey) => setPickingLoadCase({ profileKey, caseKey })}
            />
          )}
        </div>
      </main>

      <LoadCasePickerDialog
        open={pickingLoadCase !== null}
        loadCases={pickableLoadCases}
        current={
          pickingLoadCase
            ? (fatigueProfiles
                .find((p) => p.__KEY__ === pickingLoadCase.profileKey)
                ?.fatigue_cases.find((c) => c.__KEY__ === pickingLoadCase.caseKey)?.load_case ?? null)
            : null
        }
        onSelect={(id) => {
          if (pickingLoadCase) {
            updateFatigueCase(pickingLoadCase.profileKey, pickingLoadCase.caseKey, 'load_case', id);
          }
        }}
        onClose={() => setPickingLoadCase(null)}
      />
    </div>
  );
}
