import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MainNav } from '@/components/common/layout/MainNav';
import { CalculationSubToolbar } from '@/components/calculation/CalculationSubToolbar';
import { CalculationGeneralTab } from '@/components/calculation/CalculationGeneralTab';
import { CalculationCompositionTab } from '@/components/calculation/CalculationCompositionTab';
import { CalculationLoadGroupTab } from '@/components/calculation/CalculationLoadGroupTab';
import { CalculationFatigueProfileTab } from '@/components/calculation/CalculationFatigueProfileTab';
import { PropertyFormTab } from '@/components/material/PropertyFormTab';
import { useHydrateOnce } from '@/hooks/useHydrateOnce';
import { useCalculationCompositionState } from '@/hooks/useCalculationCompositionState';
import { useCalculationLoadGroupState } from '@/hooks/useCalculationLoadGroupState';
import { useCalculationFatigueProfileState } from '@/hooks/useCalculationFatigueProfileState';
import {
  useCreateProject,
  useProject,
  useUpdateProject,
  useUpdateProjectState,
  useUpdateProjectSettings,
} from '@/hooks/api/useProjects';
import { useSysconfig, sysconfigKeys } from '@/hooks/api/useSysconfig';
import { getSysconfig } from '@/api/sysconfig';
import { todayISO, toIsoDateTime, toDateInputValue } from '@/lib/utils';
import { buildAnalysisSettingsPayload } from '@/lib/calculationSettings';
import { buildSysconfigSections, buildStandaloneGroup } from '@/lib/sysconfigMapping';
import { toKeyValueList, keyValueSignature } from '@/lib/keyValueMapping';
import { isFormRangeValid } from '@/lib/sysconfigFormValidation';
import type { Tab } from '@/types';

/** Pulled out of the auto-built Configuration sections: `analysis_method` is owned by the
 *  General tab, `econ_debug` gets its own pinned "Debug" group at the bottom instead of
 *  wherever the backend happens to place it. */
const CONFIG_PULLED_OUT = new Set(['analysis_method', 'econ_debug']);

// ─── Main component ───────────────────────────────────────────────────────────

export function CalculationNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const projectId = isNew ? '' : (id ?? '');

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const updateStateMutation = useUpdateProjectState();
  const updateSettingsMutation = useUpdateProjectSettings();

  // A composition/load-group/fatigue-profile pick can happen before the
  // General tab has ever been saved — the project is created on first pick
  // (or first Exit/Run) instead. Cached here (in addition to the URL) so a
  // second pick made right after the first doesn't race and create twice.
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const creatingProjectRef = useRef<Promise<string> | null>(null);
  const effectiveProjectId = isNew ? createdProjectId : projectId;

  // Skip the GET entirely once we've created the project ourselves this
  // session (analysis method pick, a composition/load/fatigue pick, or Run)
  // — we already hold its current fields locally, no need to re-fetch. Only
  // a genuinely pre-existing project (opened straight from the list) hydrates.
  const detailQuery = useProject(createdProjectId ? '' : projectId);

  async function ensureProjectId(fallbackName?: string): Promise<string> {
    if (effectiveProjectId) return effectiveProjectId;
    if (!creatingProjectRef.current) {
      creatingProjectRef.current = (async () => {
        const created = await createMutation.mutateAsync({
          name: name.trim() || fallbackName || 'Untitled calculation',
          description,
          created_at: toIsoDateTime(date),
        });
        setCreatedProjectId(created.uuid);
        navigate(`/calculation/${created.uuid}`, { replace: true });
        return created.uuid;
      })();
    }
    return creatingProjectRef.current;
  }

  const [activeTab, setActiveTab] = useState<Tab>('general');

  // ── General ──────────────────────────────────────────────────────────────
  // Hydrated from the backend for edit.
  const [name, setName] = useState('');
  const [analysisMethod, setAnalysisMethod] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());
  useHydrateOnce(!isNew && !detailQuery.isFetching && !!detailQuery.data, () => {
    const p = detailQuery.data!;
    setName(p.name);
    setDescription(p.description ?? '');
    setDate(toDateInputValue(p.created_at));
  });

  const isModalMethod = analysisMethod.startsWith('Modal');
  const isStaticStructural = analysisMethod.startsWith('Static structural');

  // ── Composition ──────────────────────────────────────────────────────────
  const {
    compositionsQuery,
    selectedCompositionId,
    compSearch,
    compSort,
    compPage,
    compPageRows,
    compTotalPages,
    handleCompSearchChange,
    handleCompSort,
    setCompPage,
    handleSelectComposition,
  } = useCalculationCompositionState(ensureProjectId);

  // ── Configuration ─────────────────────────────────────────────────────────
  // Only fetched while the Configuration tab is actually open — drives every
  // field/group/unit shown there, no hardcoded field state on this page anymore.
  const sysconfigQuery = useSysconfig(activeTab === 'configuration' ? effectiveProjectId ?? '' : '');
  const configSections = useMemo(() => {
    if (!sysconfigQuery.data) return [];
    const projectSettings = sysconfigQuery.data.configuration.project_settings;
    return [
      ...buildSysconfigSections(sysconfigQuery.data, projectSettings, CONFIG_PULLED_OUT),
      ...buildStandaloneGroup(sysconfigQuery.data, projectSettings, 'econ_debug', 'Debug'),
    ];
  }, [sysconfigQuery.data]);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [configBaseline, setConfigBaseline] = useState<Record<string, string>>({});

  // Seed any field sysconfig has resolved a value for that we don't already hold locally,
  // and keep `fixed` (backend-computed) fields in sync on every refetch — same reasoning as
  // Material's mechanical/fatigue tabs, just against sysconfig's own `value` directly since
  // there's no separate "get project settings" endpoint to read current values from.
  useEffect(() => {
    const updates: Record<string, string> = {};
    for (const field of configSections.flatMap((s) => s.fields)) {
      if (field.value === undefined) continue;
      if (field.fixed || configValues[field.name] === undefined) {
        if (configValues[field.name] !== field.value) updates[field.name] = field.value;
      }
    }
    if (Object.keys(updates).length === 0) return;
    setConfigValues((prev) => ({ ...prev, ...updates }));
    setConfigBaseline((prev) => ({ ...prev, ...updates }));
    // configValues intentionally excluded — this only needs to react to a new sysconfig
    // fetch, not every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configSections]);

  const configRangeValid = isFormRangeValid(configSections, configValues);
  const configUnsaved = keyValueSignature(configValues) !== keyValueSignature(configBaseline);

  function handleConfigFieldChange(name: string, value: string) {
    setConfigValues((prev) => ({ ...prev, [name]: value }));
  }

  // Autosave the Configuration tab on blur — a full-array PUT, same shape as Material's
  // mechanical/fatigue tabs — then refetch sysconfig so any dependency this change affects
  // (active/fixed/value on other fields) is reflected immediately.
  async function handleConfigFieldBlur() {
    if (!effectiveProjectId || !configRangeValid || !configUnsaved || updateSettingsMutation.isPending) return;
    try {
      await updateSettingsMutation.mutateAsync({ projectId: effectiveProjectId, settings: toKeyValueList(configValues) });
      setConfigBaseline(configValues);
      await queryClient.fetchQuery({
        queryKey: sysconfigKeys.detail(effectiveProjectId),
        queryFn: () => getSysconfig(effectiveProjectId),
      });
    } catch {
      // updateSettingsMutation's onError (global mutation cache) already toasts.
    }
  }

  async function handleAnalysisMethodChange(value: string) {
    setAnalysisMethod(value);
    const settings = buildAnalysisSettingsPayload(value);
    const pid = await ensureProjectId();
    await updateSettingsMutation.mutateAsync({ projectId: pid, settings });
    // The whole Configuration tab's fields/groups/values depend on the settings we just
    // changed — drop our local snapshot (the seeding effect below rebuilds it from the
    // fresh defaults) and refetch sysconfig now, regardless of which tab is open, so it's
    // already current whenever the user gets to Configuration.
    setConfigValues({});
    setConfigBaseline({});
    await queryClient.fetchQuery({ queryKey: sysconfigKeys.detail(pid), queryFn: () => getSysconfig(pid) });
  }

  // ── Load group tab ────────────────────────────────────────────────────────
  const {
    loadGroupsQuery,
    selectedGroupId,
    lgSearch,
    lgSort,
    lgPage,
    lgPageRows,
    lgTotalPages,
    handleLgSearchChange,
    handleLgSort,
    setLgPage,
    handleSelectGroup,
    selectedLoadGroup,
  } = useCalculationLoadGroupState(ensureProjectId);

  // ── Fatigue profile tab ───────────────────────────────────────────────────
  const {
    fatigueProfilesQuery,
    loadCasesQuery,
    fpSearch,
    setFpSearch,
    expandedProfileIds,
    expandedCaseIds,
    selectedProfileId,
    loadCasesById,
    fpFilteredProfiles,
    toggleFPProfile,
    toggleFPCase,
    handleSelectFatigueProfile,
  } = useCalculationFatigueProfileState(selectedGroupId, ensureProjectId);

  const titleText = isNew ? name.trim() || 'New calculation' : name.trim() || id;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleExit() {
    // Pure navigation — composition/load group/fatigue profile picks already
    // saved themselves immediately, and General has no save-on-exit here.
    navigate('/calculation');
  }

  // Name/description/date save on blur, but only once a project already
  // exists — typing on a brand-new, still-untouched calculation shouldn't
  // create one by itself.
  async function handleGeneralFieldBlur() {
    if (!effectiveProjectId) return;
    await updateMutation.mutateAsync({ projectId: effectiveProjectId, name, description, created_at: toIsoDateTime(date) });
  }

  async function handleRunCalculation() {
    // Run with an empty form would otherwise pollute the list with an
    // "Untitled calculation" — name it after the load group being run.
    const fallback = selectedLoadGroup ? `${selectedLoadGroup.name}-CALC` : undefined;
    const wasNew = isNew && !effectiveProjectId;
    const pid = await ensureProjectId(fallback);
    if (!wasNew) {
      await updateMutation.mutateAsync({
        projectId: pid,
        name: name.trim() || fallback || 'Untitled calculation',
        description,
        created_at: toIsoDateTime(date),
      });
    }
    await updateStateMutation.mutateAsync({ projectId: pid, state: 'RUN' });
    navigate('/calculation');
  }

  // ── Run calculation eligibility ───────────────────────────────────────────
  const canRunCalculation = (() => {
    const baseFields = name.trim() && description.trim();
    if (analysisMethod === 'Aero only') return !!(baseFields && selectedCompositionId && selectedGroupId);
    if (analysisMethod === 'Modal (RPM & Aero)') return !!(baseFields && selectedCompositionId && selectedGroupId);
    if (isModalMethod) return !!(baseFields && selectedCompositionId);
    if (analysisMethod === 'Static structural (RPM & Aero)') return !!(baseFields && selectedCompositionId && selectedGroupId && selectedProfileId);
    if (isStaticStructural) return !!(baseFields && selectedCompositionId && selectedGroupId);
    return !!name.trim();
  })();

  // ── Tab trigger class ─────────────────────────────────────────────────────
  return (
    <div className={`flex w-full flex-col bg-[#f8fafc] ${activeTab === 'configuration' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <MainNav />

      <CalculationSubToolbar
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        analysisMethod={analysisMethod}
        isModalMethod={isModalMethod}
        titleText={titleText}
        canRunCalculation={canRunCalculation}
        onExit={handleExit}
        onRunCalculation={handleRunCalculation}
      />

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className={`flex-1 px-4 pt-4 ${activeTab === 'configuration' ? 'overflow-hidden pb-4' : 'overflow-auto pb-6'}`}>

          {/* ── GENERAL TAB ─────────────────────────────────────────────── */}
          {activeTab === 'general' && (
            <CalculationGeneralTab
              name={name}
              onNameChange={setName}
              analysisMethod={analysisMethod}
              onAnalysisMethodChange={handleAnalysisMethodChange}
              description={description}
              onDescriptionChange={setDescription}
              date={date}
              onDateChange={setDate}
              onFieldBlur={handleGeneralFieldBlur}
            />
          )}

          {/* ── COMPOSITION TAB ─────────────────────────────────────────── */}
          {activeTab === 'composition' && (
            <CalculationCompositionTab
              isLoading={compositionsQuery.isLoading}
              isError={compositionsQuery.isError}
              search={compSearch}
              onSearchChange={handleCompSearchChange}
              sort={compSort}
              onSort={handleCompSort}
              pageRows={compPageRows}
              page={compPage}
              totalPages={compTotalPages}
              onPageChange={setCompPage}
              selectedCompositionId={selectedCompositionId}
              onSelectComposition={handleSelectComposition}
            />
          )}

          {/* ── CONFIGURATION TAB ───────────────────────────────────────── */}
          {activeTab === 'configuration' && (
            <>
              {sysconfigQuery.isLoading && (
                <div className="flex h-full w-full max-w-[1200px] items-center justify-center rounded-[14px] border border-[#e5e7eb] bg-white text-[14px] text-[#6b7280] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                  Loading configuration…
                </div>
              )}
              {sysconfigQuery.isError && (
                <div className="flex h-full w-full max-w-[1200px] items-center justify-center rounded-[14px] border border-[#e5e7eb] bg-white text-[14px] text-[#dc2626] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                  Failed to load configuration from the server.
                </div>
              )}
              {!sysconfigQuery.isLoading && !sysconfigQuery.isError && (
                <PropertyFormTab
                  sections={configSections}
                  values={configValues}
                  onChange={handleConfigFieldChange}
                  onBlur={handleConfigFieldBlur}
                />
              )}
            </>
          )}

          {/* ── LOAD GROUP TAB ──────────────────────────────────────────── */}
          {activeTab === 'load-group' && (
            <CalculationLoadGroupTab
              isLoading={loadGroupsQuery.isLoading}
              isError={loadGroupsQuery.isError}
              search={lgSearch}
              onSearchChange={handleLgSearchChange}
              sort={lgSort}
              onSort={handleLgSort}
              pageRows={lgPageRows}
              page={lgPage}
              totalPages={lgTotalPages}
              onPageChange={setLgPage}
              selectedGroupId={selectedGroupId}
              onSelectGroup={handleSelectGroup}
            />
          )}

          {/* ── FATIGUE PROFILE TAB ─────────────────────────────────────── */}
          {activeTab === 'fatigue-profile' && (
            <CalculationFatigueProfileTab
              hasSelectedGroup={selectedGroupId !== null}
              selectedGroupName={selectedLoadGroup?.name ?? ''}
              onGoToLoadGroupTab={() => setActiveTab('load-group')}
              isLoading={fatigueProfilesQuery.isFetching || loadCasesQuery.isFetching}
              isError={fatigueProfilesQuery.isError || loadCasesQuery.isError}
              search={fpSearch}
              onSearchChange={setFpSearch}
              profiles={fpFilteredProfiles}
              loadCasesById={loadCasesById}
              expandedProfileIds={expandedProfileIds}
              onToggleProfile={toggleFPProfile}
              selectedProfileId={selectedProfileId}
              onSelectProfile={handleSelectFatigueProfile}
              expandedCaseIds={expandedCaseIds}
              onToggleCase={toggleFPCase}
            />
          )}

      </main>
    </div>
  );
}
