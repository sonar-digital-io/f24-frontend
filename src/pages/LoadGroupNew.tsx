import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MainNav } from '@/components/common/layout/MainNav';
import { EditPageToolbar } from '@/components/common/layout/EditPageToolbar';
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
    const withCurve = (incoming: LoadLimitRange | undefined, fallback: LoadLimitRange) =>
      incoming && incoming.curve.length >= 2 ? incoming : fallback;
    setLimits((prev) => ({
      thrust: withCurve(g.rpm_thrust_limit, prev.thrust),
      torque: withCurve(g.rpm_torque_limit, prev.torque),
      power: withCurve(g.rpm_power_limit, prev.power),
    }));
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
    handleSaveLoadCases,
    loadCasesHaveErrors,
    updateLoadCasesMutation,
  } = useLoadGroupLoadCasesState(loadGroupId, isNew);

  const {
    limits,
    setLimits,
    limitsSubTab,
    setLimitsSubTab,
    updateLimitBounds,
    updateLimitCurvePoint,
    handleLimitCurveChange,
    addLimitCurvePoint,
    deleteLimitCurvePoint,
    handleSaveLimits,
    updateLimitsMutation,
  } = useLoadGroupLimitsState(loadGroupId);

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
    addFatigueCase,
    deleteFatigueCase,
    updateFatigueCase,
    handleSaveFatigueProfiles,
    fatigueProfilesInvalid,
    updateFatigueProfilesMutation,
  } = useLoadGroupFatigueProfilesState(loadGroupId, isNew);

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

  // ── Toolbar save action, per tab ─────────────────────────────────────────
  const tabAction: { onClick: () => void; disabled: boolean; label: string } | undefined = {
    general: {
      onClick: handleSaveGeneral,
      disabled: !name.trim() || !date || savePending,
      label: savePending ? 'Saving…' : isNew ? 'Create load group' : 'Update load group',
    },
    'load-cases': {
      onClick: handleSaveLoadCases,
      disabled: updateLoadCasesMutation.isPending || loadCasesHaveErrors,
      label: updateLoadCasesMutation.isPending ? 'Saving…' : 'Save load cases',
    },
    limits: {
      onClick: handleSaveLimits,
      disabled: updateLimitsMutation.isPending,
      label: updateLimitsMutation.isPending ? 'Saving…' : 'Save limits',
    },
    'fatigue-profiles': {
      onClick: handleSaveFatigueProfiles,
      disabled: updateFatigueProfilesMutation.isPending || fatigueProfilesInvalid,
      label: updateFatigueProfilesMutation.isPending ? 'Saving…' : 'Save fatigue profiles',
    },
  }[activeTab];

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
        actions={
          tabAction && (
            <button
              type="button"
              onClick={tabAction.onClick}
              disabled={tabAction.disabled}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-[#006496] px-3 py-2 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {tabAction.label}
            </button>
          )
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
