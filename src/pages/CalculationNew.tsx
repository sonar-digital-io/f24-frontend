import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MainNav } from '@/components/common/layout/MainNav';
import { CalculationSubToolbar } from '@/components/calculation/CalculationSubToolbar';
import { CalculationGeneralTab } from '@/components/calculation/CalculationGeneralTab';
import { CalculationCompositionTab } from '@/components/calculation/CalculationCompositionTab';
import { CalculationConfigurationTab } from '@/components/calculation/CalculationConfigurationTab';
import { CalculationLoadGroupTab } from '@/components/calculation/CalculationLoadGroupTab';
import { CalculationFatigueProfileTab } from '@/components/calculation/CalculationFatigueProfileTab';
import { useScrollSpy } from '@/hooks/useScrollSpy';
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
import type { Tab } from '@/types';

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
  // Hydrated from the backend for edit — the Configuration tab stays on local
  // mock state; General/Composition/Load group/Fatigue profile are wired to
  // the real API.
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
  const configSectionIds = useMemo(
    () => sysconfigQuery.data?.configuration.project_settings.groups?.map((g) => g.id) ?? [],
    [sysconfigQuery.data]
  );
  const {
    activeId: activeConfigSection,
    containerRef: configScrollRef,
    sectionRefs: configSectionRefs,
    jumpTo: jumpToConfigSection,
  } = useScrollSpy(configSectionIds, configSectionIds[0] ?? '');

  async function handleAnalysisMethodChange(value: string) {
    setAnalysisMethod(value);
    const settings = buildAnalysisSettingsPayload(value);
    const pid = await ensureProjectId();
    await updateSettingsMutation.mutateAsync({ projectId: pid, settings });
    // The Configuration tab's fields/groups depend on the settings we just
    // changed — refetch sysconfig now (regardless of which tab is open) so
    // it's already current whenever the user gets to Configuration.
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
            <CalculationConfigurationTab
              isLoading={sysconfigQuery.isLoading}
              isError={sysconfigQuery.isError}
              sysconfig={sysconfigQuery.data}
              activeConfigSection={activeConfigSection}
              onJumpToSection={jumpToConfigSection}
              configScrollRef={configScrollRef}
              configSectionRefs={configSectionRefs}
            />
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
