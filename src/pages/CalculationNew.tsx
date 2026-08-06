import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MainNav } from '@/components/common/layout/MainNav';
import { CalculationSubToolbar } from '@/components/calculation/CalculationSubToolbar';
import { CalculationGeneralTab } from '@/components/calculation/CalculationGeneralTab';
import { CalculationCompositionTab, type CompositionListItem } from '@/components/calculation/CalculationCompositionTab';
import { CalculationConfigurationTab } from '@/components/calculation/CalculationConfigurationTab';
import { CalculationLoadGroupTab, type LoadGroupListItem } from '@/components/calculation/CalculationLoadGroupTab';
import { CalculationFatigueProfileTab } from '@/components/calculation/CalculationFatigueProfileTab';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import {
  useCreateProject,
  useProject,
  useUpdateProject,
  useUpdateProjectComposition,
  useUpdateProjectLoad,
  useUpdateProjectFatigue,
  useUpdateProjectState,
  useUpdateProjectSettings,
} from '@/hooks/api/useProjects';
import { useCompositionList } from '@/hooks/api/useComposition';
import { useLoadGroupList, useLoadCases, useFatigueProfiles } from '@/hooks/api/useLoadGroups';
import { useSysconfig, sysconfigKeys } from '@/hooks/api/useSysconfig';
import { getSysconfig } from '@/api/sysconfig';
import { todayISO, toIsoDateTime, toDateInputValue, formatDateTime } from '@/lib/utils';
import { matchesQuery, paginate, sortItems, toggleSetMember, toggleSort } from '@/lib/listTable';
import { buildAnalysisSettingsPayload } from '@/lib/calculationSettings';
import type { Composition } from '@/api/types/composition';
import type { LoadGroup, LoadCase } from '@/api/types/loadGroups';
import type { SortState, Tab, CalcCompositionSortKey, CalcLoadGroupSortKey } from '@/types';

const TAB_PAGE_SIZE = 10;

function toCompositionListItem(c: Composition): CompositionListItem {
  const targetWeight = c.settings?.find((s) => s.reference === 'target_weight')?.value;
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? '',
    type: '—',
    targetWeight: targetWeight != null ? String(targetWeight) : '—',
    user: c.user ?? '—',
    lastUpdated: formatDateTime(c.last_modified),
  };
}

function toLoadGroupListItem(g: LoadGroup): LoadGroupListItem {
  return {
    id: g.id,
    name: g.name,
    description: g.description ?? '',
    user: g.user ?? '—',
    lastUpdated: formatDateTime(g.last_modified ?? g.created_at),
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CalculationNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const projectId = isNew ? '' : (id ?? '');

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const updateCompositionMutation = useUpdateProjectComposition();
  const updateLoadMutation = useUpdateProjectLoad();
  const updateFatigueMutation = useUpdateProjectFatigue();
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (isNew || hydrated || detailQuery.isFetching || !detailQuery.data) return;
    const p = detailQuery.data;
    setName(p.name);
    setDescription(p.description ?? '');
    setDate(toDateInputValue(p.created_at));
    setHydrated(true);
  }, [isNew, hydrated, detailQuery.isFetching, detailQuery.data]);

  const isModalMethod = analysisMethod.startsWith('Modal');
  const isStaticStructural = analysisMethod.startsWith('Static structural');

  // ── Composition ──────────────────────────────────────────────────────────
  const compositionsQuery = useCompositionList();
  const [selectedCompositionId, setSelectedCompositionId] = useState<number | null>(null);
  const [compSearch, setCompSearch] = useState('');
  const [compSort, setCompSort] = useState<SortState<CalcCompositionSortKey>>({ key: 'name', direction: 'asc' });
  const [compPage, setCompPage] = useState(1);

  const compositionItems = useMemo(
    () => (compositionsQuery.data ?? []).map(toCompositionListItem),
    [compositionsQuery.data]
  );
  const compFiltered = useMemo(
    () => compositionItems.filter((c) => matchesQuery(compSearch, [c.name, c.description])),
    [compositionItems, compSearch]
  );
  const compSorted = useMemo(
    () => sortItems(compFiltered, compSort, (c, key) => (key === 'last_modified' ? c.lastUpdated : c.name)),
    [compFiltered, compSort]
  );
  const { totalPages: compTotalPages, pageRows: compPageRows } = paginate(compSorted, compPage, TAB_PAGE_SIZE);

  function handleCompSearchChange(value: string) {
    setCompSearch(value);
    setCompPage(1);
  }

  function handleCompSort(key: CalcCompositionSortKey) {
    setCompSort((prev) => toggleSort(prev, key));
  }

  async function handleSelectComposition(compositionId: number) {
    const next = selectedCompositionId === compositionId ? null : compositionId;
    setSelectedCompositionId(next);
    if (next === null) return;
    const pid = await ensureProjectId();
    await updateCompositionMutation.mutateAsync({ projectId: pid, composition: next });
  }

  // ── Configuration ─────────────────────────────────────────────────────────
  // Only fetched while the Configuration tab is actually open — drives every
  // field/group/unit shown there, no hardcoded field state on this page anymore.
  const sysconfigQuery = useSysconfig(activeTab === 'configuration' ? effectiveProjectId ?? '' : '');
  const configSectionIds = useMemo(
    () => sysconfigQuery.data?.configuration.project_settings.groups.map((g) => g.id) ?? [],
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
  const loadGroupsQuery = useLoadGroupList();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [lgSearch, setLgSearch] = useState('');
  const [lgSort, setLgSort] = useState<SortState<CalcLoadGroupSortKey>>({ key: 'last_modified', direction: 'desc' });
  const [lgPage, setLgPage] = useState(1);

  const loadGroupItems = useMemo(
    () => (loadGroupsQuery.data ?? []).map(toLoadGroupListItem),
    [loadGroupsQuery.data]
  );
  const lgFiltered = useMemo(
    () => loadGroupItems.filter((g) => matchesQuery(lgSearch, [g.name, g.description, g.user])),
    [loadGroupItems, lgSearch]
  );
  const lgSorted = useMemo(
    () => sortItems(lgFiltered, lgSort, (g, key) => (key === 'last_modified' ? g.lastUpdated : g.name)),
    [lgFiltered, lgSort]
  );
  const { totalPages: lgTotalPages, pageRows: lgPageRows } = paginate(lgSorted, lgPage, TAB_PAGE_SIZE);

  function handleLgSearchChange(value: string) {
    setLgSearch(value);
    setLgPage(1);
  }

  function handleLgSort(key: CalcLoadGroupSortKey) {
    setLgSort((prev) => toggleSort(prev, key));
  }

  async function handleSelectGroup(groupId: number) {
    const next = selectedGroupId === groupId ? null : groupId;
    setSelectedGroupId(next);
    if (next === null) return;
    const pid = await ensureProjectId();
    await updateLoadMutation.mutateAsync({ projectId: pid, load_group: next });
  }

  const selectedLoadGroup = selectedGroupId
    ? loadGroupsQuery.data?.find((g) => g.id === selectedGroupId) ?? null
    : null;

  // ── Fatigue profile tab ───────────────────────────────────────────────────
  const fatigueProfilesQuery = useFatigueProfiles(selectedGroupId ?? NaN);
  const loadCasesQuery = useLoadCases(selectedGroupId ?? NaN);
  const [fpSearch, setFpSearch] = useState('');
  const [expandedProfileIds, setExpandedProfileIds] = useState<Set<number>>(new Set());
  const [expandedCaseIds, setExpandedCaseIds] = useState<Set<number>>(new Set());
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);

  // Selecting a different load group invalidates whatever fatigue profile
  // was picked/expanded for the previous one.
  useEffect(() => {
    setFpSearch('');
    setExpandedProfileIds(new Set());
    setExpandedCaseIds(new Set());
    setSelectedProfileId(null);
  }, [selectedGroupId]);

  const loadCasesById = useMemo(() => {
    const map: Record<number, LoadCase> = {};
    for (const lc of loadCasesQuery.data?.load_cases ?? []) {
      if (lc.id !== undefined) map[lc.id] = lc;
    }
    return map;
  }, [loadCasesQuery.data]);

  const fpFilteredProfiles = useMemo(() => {
    const all = fatigueProfilesQuery.data ?? [];
    if (!fpSearch.trim()) return all;
    return all.filter((p) => matchesQuery(fpSearch, [p.name]));
  }, [fatigueProfilesQuery.data, fpSearch]);

  function toggleFPProfile(id: number) {
    setExpandedProfileIds((prev) => toggleSetMember(prev, id));
  }

  function toggleFPCase(id: number) {
    setExpandedCaseIds((prev) => toggleSetMember(prev, id));
  }

  async function handleSelectFatigueProfile(profileId: number) {
    const next = selectedProfileId === profileId ? null : profileId;
    setSelectedProfileId(next);
    if (next === null) return;
    const pid = await ensureProjectId();
    await updateFatigueMutation.mutateAsync({ projectId: pid, fatigue_profile: next });
  }

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
