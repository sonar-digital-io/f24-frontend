import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useExitEditModeTarget } from '@/hooks/useExitEditModeTarget';
import { MainNav } from '@/components/common/layout/MainNav';
import { EditPageToolbar } from '@/components/common/layout/EditPageToolbar';
import type { SaveStatus } from '@/components/common/layout/EditPageToolbarActions';
import { LoadGroupGeneralTab } from '@/components/load-group/LoadGroupGeneralTab';
import { LoadGroupLoadCasesTab } from '@/components/load-group/LoadGroupLoadCasesTab';
import { LoadGroupLimitsTab } from '@/components/load-group/LoadGroupLimitsTab';
import { LoadGroupFatigueProfilesTab } from '@/components/load-group/LoadGroupFatigueProfilesTab';
import { LoadCasePickerDialog } from '@/components/load-group/LoadCasePickerDialog';
import { useCreateLoadGroup, useLoadGroupDetail, useUpdateLoadGroup } from '@/hooks/api/useLoadGroups';
import { useHydrateOnce } from '@/hooks/useHydrateOnce';
import { useLoadGroupLoadCasesState } from '@/hooks/useLoadGroupLoadCasesState';
import { useLoadGroupLimitsState } from '@/hooks/useLoadGroupLimitsState';
import { useLoadGroupFatigueProfilesState } from '@/hooks/useLoadGroupFatigueProfilesState';
import { todayISO, toIsoDateTime, toDateInputValue } from '@/lib/utils';
import type { LoadLimitRange } from '@/api/types/loadGroups';
import type { LoadGroupTab } from '@/data/loadGroupForm';

const LOAD_GROUP_TABS = [
  { value: 'general', label: 'General' },
  { value: 'load-cases', label: 'Load cases' },
  { value: 'limits', label: 'Limits' },
  { value: 'fatigue-profiles', label: 'Fatigue profiles' },
];

export function LoadGroupNew() {
  const navigate = useNavigate();
  const exitTarget = useExitEditModeTarget('/load-group');
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
  const [baseline, setBaseline] = useState<{ name: string; description: string; date: string } | null>(null);

  useHydrateOnce(!isNew && !detailQuery.isFetching && !!detailQuery.data, () => {
    const g = detailQuery.data!;
    const hydratedDescription = g.description ?? '';
    const hydratedDate = typeof g.created_at === 'string' ? toDateInputValue(g.created_at) : todayISO();
    setName(g.name);
    setDescription(hydratedDescription);
    setDate(hydratedDate);
    setBaseline({ name: g.name, description: hydratedDescription, date: hydratedDate });
    // A freshly-created load group's limits come back with an empty curve
    // (no points saved yet) rather than being omitted — keep the default
    // 2-point curve in that case instead of collapsing the chart to nothing.
    // Curve points are stripped to exactly {rpm,value} — some already-saved
    // load groups carry extra fields (e.g. stray handle_in_x/handle_in_y from
    // before the backend's schema went strict) that would otherwise ride
    // along unchanged into the next PUT and get rejected as additionalProperties.
    const withCurve = (incoming: LoadLimitRange | undefined, fallback: LoadLimitRange) =>
      incoming && incoming.curve.length >= 2
        ? { ...incoming, curve: incoming.curve.map((c) => ({ rpm: c.rpm, value: c.value })) }
        : fallback;
    setLimits((prev) => ({
      thrust: withCurve(g.rpm_thrust_limit, prev.thrust),
      torque: withCurve(g.rpm_torque_limit, prev.torque),
      power: withCurve(g.rpm_power_limit, prev.power),
    }));
    markLimitsSaved();
  });

  useHydrateOnce(
    isNew && Number.isFinite(duplicateSourceId) && !duplicateQuery.isFetching && !!duplicateQuery.data,
    () => {
      const g = duplicateQuery.data!;
      setName(`${g.name}_copy`);
      setDescription(g.description ?? '');
      setDate(typeof g.created_at === 'string' ? toDateInputValue(g.created_at) : todayISO());
    }
  );

  const {
    loadCases,
    pickableLoadCases,
    loadCaseNamesById,
    updateLoadCase,
    addLoadCase,
    deleteLoadCase,
    duplicateLoadCase,
    onBlur: handleLoadCasesBlur,
    status: loadCasesStatus,
  } = useLoadGroupLoadCasesState(loadGroupId, isNew);

  const {
    limits,
    setLimits,
    limitsSubTab,
    setLimitsSubTab,
    updateLimitBounds,
    updateLimitCurvePoint,
    updateLimitCurveType,
    handleLimitCurveChange,
    addLimitCurvePoint,
    deleteLimitCurvePoint,
    markSaved: markLimitsSaved,
    status: limitsStatus,
  } = useLoadGroupLimitsState(loadGroupId, isNew);

  const {
    fatigueProfiles,
    openFatigueProfiles,
    fatigueSearch,
    setFatigueSearch,
    pickingLoadCase,
    setPickingLoadCase,
    toggleFatigueProfile,
    addFatigueProfile,
    deleteFatigueProfile,
    duplicateFatigueProfile,
    updateFatigueProfileName,
    reorderFatigueCase,
    addFatigueCase,
    deleteFatigueCase,
    updateFatigueCase,
    onBlur: handleFatigueProfilesBlur,
    status: fatigueStatus,
  } = useLoadGroupFatigueProfilesState(loadGroupId, isNew);

  const titleText = isNew ? name.trim() || 'New load group' : name.trim() || 'Loading…';

  const saveError = createMutation.isError || updateMutation.isError;

  // ── General tab autosave ─────────────────────────────────────────────────
  const [generalStatus, setGeneralStatus] = useState<SaveStatus | undefined>(undefined);
  // Separate from `generalStatus` (which only drives the toolbar's Saved/Saving
  // indicator, hidden while there's nothing in flight to report) — this is what
  // actually gates whether a blur has something new to save.
  const [generalDirty, setGeneralDirty] = useState(false);
  // Mirrors the latest field values/isNew so a save requested while one is
  // already in flight retries with fresh data afterwards, instead of firing
  // a second concurrent create/update.
  const generalRef = useRef({ name, description, date, isNew });
  generalRef.current = { name, description, date, isNew };
  const retryGeneralRef = useRef(false);
  // Signature (name|description|date|isNew) of the last save attempt that failed —
  // blurring re-fires handleGeneralBlur on every field, so without this guard a
  // failed save retries in a loop every time focus moves between fields.
  const lastFailedGeneralRef = useRef<string | null>(null);

  async function commitGeneral() {
    if (createMutation.isPending || updateMutation.isPending) {
      retryGeneralRef.current = true;
      return;
    }
    const { name, description, date, isNew } = generalRef.current;
    const signature = `${name}|${description}|${date}|${isNew}`;
    setGeneralStatus('saving');
    try {
      if (isNew) {
        const created = await createMutation.mutateAsync({ name, description, created_at: toIsoDateTime(date) });
        // /load-group/new and /load-group/:id share a route, so this navigate does
        // NOT remount the component — switching the URL just flips isNew to false.
        navigate(`/load-group/${created.id}`, { replace: true });
      } else {
        await updateMutation.mutateAsync({ name, description, created_at: toIsoDateTime(date) });
        setBaseline({ name, description, date });
      }
      setGeneralDirty(false);
      setGeneralStatus('saved');
    } catch {
      lastFailedGeneralRef.current = signature;
      setGeneralStatus(undefined);
    } finally {
      if (retryGeneralRef.current) {
        retryGeneralRef.current = false;
        commitGeneral();
      }
    }
  }

  // Only tracks dirty/valid state while typing — the actual save is deferred to
  // handleGeneralBlur so it doesn't fire on every keystroke.
  useEffect(() => {
    if (isNew) {
      if (!name.trim() || !date || !description.trim()) return;
    } else {
      if (!baseline) return;
      if (name === baseline.name && description === baseline.description && date === baseline.date) {
        setGeneralDirty(false);
        setGeneralStatus('saved');
        return;
      }
    }
    setGeneralDirty(true);
    setGeneralStatus(undefined);
  }, [name, description, date, isNew, baseline]);

  function handleGeneralBlur() {
    if (!generalDirty) return;
    const { name, description, date, isNew } = generalRef.current;
    const signature = `${name}|${description}|${date}|${isNew}`;
    if (lastFailedGeneralRef.current === signature) return;
    commitGeneral();
  }

  function handleExit() {
    navigate(exitTarget);
  }

  // ── Toolbar save-status indicator, per tab — every tab autosaves, so this
  // is the only save-related toolbar affordance left. ─────────────────────
  const tabStatus: Record<LoadGroupTab, SaveStatus | undefined> = {
    general: generalStatus,
    'load-cases': loadCasesStatus,
    limits: limitsStatus,
    'fatigue-profiles': fatigueStatus,
  };

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
        onBack={handleExit}
        status={tabStatus[activeTab]}
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
              name={name}
              onNameChange={setName}
              description={description}
              onDescriptionChange={setDescription}
              date={date}
              onDateChange={setDate}
              onBlur={handleGeneralBlur}
            />
          )}

          {activeTab === 'load-cases' && (
            <LoadGroupLoadCasesTab
              loadCases={loadCases}
              onUpdateLoadCase={updateLoadCase}
              onAddLoadCase={addLoadCase}
              onDuplicateLoadCase={duplicateLoadCase}
              onDeleteLoadCase={deleteLoadCase}
              onBlur={handleLoadCasesBlur}
            />
          )}

          {activeTab === 'limits' && (
            <LoadGroupLimitsTab
              limitsSubTab={limitsSubTab}
              onLimitsSubTabChange={setLimitsSubTab}
              limits={limits}
              onUpdateBounds={updateLimitBounds}
              onUpdateCurvePoint={updateLimitCurvePoint}
              onUpdateCurveType={updateLimitCurveType}
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
              onReorderFatigueCase={reorderFatigueCase}
              onAddFatigueCase={addFatigueCase}
              onDeleteFatigueCase={deleteFatigueCase}
              onUpdateFatigueCase={updateFatigueCase}
              onPickLoadCase={(profileKey, caseKey) => setPickingLoadCase({ profileKey, caseKey })}
              onBlur={handleFatigueProfilesBlur}
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
