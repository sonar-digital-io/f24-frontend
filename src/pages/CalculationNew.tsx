import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { CalculationSubToolbar } from '@/components/calculation/CalculationSubToolbar';
import { CalculationGeneralTab } from '@/components/calculation/CalculationGeneralTab';
import { CalculationCompositionTab } from '@/components/calculation/CalculationCompositionTab';
import { CalculationConfigurationTab } from '@/components/calculation/CalculationConfigurationTab';
import { CalculationLoadGroupTab } from '@/components/calculation/CalculationLoadGroupTab';
import { CalculationFatigueProfileTab } from '@/components/calculation/CalculationFatigueProfileTab';
import { GEOMETRIES } from '@/data/geometries';
import { COMPOSITIONS } from '@/data/compositions';
import { CALCULATIONS, createCalculation, updateCalculation } from '@/data/calculations';
import { FATIGUE_LOAD_GROUPS, FATIGUE_PAGE_SIZE } from '@/data/calculationFatigueLoadGroups';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import type {
  Tab,
  CompositionSubTab,
  ConfigSection,
  CompListSortKey,
  CompListSort,
  LGSortKey,
  LGSort,
} from '@/types';

const CONFIG_SECTION_IDS: ConfigSection[] = ['aero', 'modal', 'structural', 'postprocessing', 'debug'];

// ─── Main component ───────────────────────────────────────────────────────────

export function CalculationNew() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const existing = isNew ? undefined : CALCULATIONS.find((c) => c.id === id);

  const [activeTab, setActiveTab] = useState<Tab>('general');

  // ── General ──────────────────────────────────────────────────────────────
  const [name, setName] = useState(existing?.name ?? '');
  const [analysisMethod, setAnalysisMethod] = useState('');
  const [description, setDescription] = useState(existing?.description ?? '');

  // ── Composition ──────────────────────────────────────────────────────────
  const [compositionSubTab, setCompositionSubTab] = useState<CompositionSubTab>('geometries');
  const [compositionViewMode, setCompositionViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedGeometryId, setSelectedGeometryId] = useState<string | null>(null);
  const [selectedCompositionId, setSelectedCompositionId] = useState<string | null>(null);
  const [compListSort, setCompListSort] = useState<CompListSort>({ key: 'name', dir: 'asc' });
  const [compTypeFilter, setCompTypeFilter] = useState<Set<string>>(new Set());
  const [compTypeFilterOpen, setCompTypeFilterOpen] = useState(false);
  const [compTypeFilterPos, setCompTypeFilterPos] = useState<{ top: number; left: number } | null>(null);
  const compTypeBtnRef = useRef<HTMLButtonElement>(null);
  const compTypeDropRef = useRef<HTMLDivElement>(null);

  const isModalMethod = analysisMethod.startsWith('Modal');
  const isStaticStructural = analysisMethod.startsWith('Static structural');

  // ── Configuration ─────────────────────────────────────────────────────────
  const {
    activeId: activeConfigSection,
    setActiveId: setActiveConfigSection,
    containerRef: configScrollRef,
    sectionRefs: configSectionRefs,
    jumpTo: jumpToConfigSection,
  } = useScrollSpy(CONFIG_SECTION_IDS, 'aero');
  const [aerofoilModel, setAerofoilModel] = useState('NACA 4 digit');
  const [aeroCorrection, setAeroCorrection] = useState('None');
  const [limitsEnabled, setLimitsEnabled] = useState({ thrust: true, torque: true, power: true });
  const [debugMode, setDebugMode] = useState(true);
  const [numberOfEigenmodes, setNumberOfEigenmodes] = useState('');
  const [fixedBase, setFixedBase] = useState(false);

  // ── Static structural config ──────────────────────────────────────────────
  const [structuralMethod, setStructuralMethod] = useState('');
  const [plyFailureModel, setPlyFailureModel] = useState<string[]>(['max stress']);
  const [coreFailureModel, setCoreFailureModel] = useState<string[]>(['face sheet wrinkling']);
  const [fatigueAssessmentTags, setFatigueAssessmentTags] = useState<string[]>(['fiber direction']);
  const [minerExponent, setMinerExponent] = useState('1.0');
  const [typeOfROI, setTypeOfROI] = useState('None');
  const [maxCriticalElements, setMaxCriticalElements] = useState('10');
  const [irfLimit, setIrfLimit] = useState('');
  const [irfLimitError, setIrfLimitError] = useState('');
  const [maxFatigueLife, setMaxFatigueLife] = useState('1e10');

  useEffect(() => {
    if (isModalMethod) setActiveConfigSection('modal');
    else if (analysisMethod === 'Static structural (RPM)') setActiveConfigSection('structural');
    else setActiveConfigSection('aero');
  }, [analysisMethod, setActiveConfigSection]);

  // ── Load group tab ────────────────────────────────────────────────────────
  const [lgSearch, setLgSearch] = useState('');
  const [lgPage, setLgPage] = useState(1);
  const [lgSort, setLgSort] = useState<LGSort>({ key: 'name', dir: 'asc' });
  const [lgCreatedByFilter, setLgCreatedByFilter] = useState<Set<string>>(new Set());
  const [lgCreatedByOpen, setLgCreatedByOpen] = useState(false);
  const [lgCreatedByPos, setLgCreatedByPos] = useState<{ top: number; left: number } | null>(null);
  const lgCreatedByBtnRef = useRef<HTMLButtonElement>(null);
  const lgCreatedByDropRef = useRef<HTMLDivElement>(null);
  const [lgExpandedIds, setLgExpandedIds] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // ── Fatigue profile ───────────────────────────────────────────────────────
  const [fpSearch, setFpSearch] = useState('');
  const [fpExpandedProfileNames, setFpExpandedProfileNames] = useState<Set<string>>(new Set());
  const [fpExpandedLCIds, setFpExpandedLCIds] = useState<Set<string>>(new Set());
  const [selectedFatigueProfileName, setSelectedFatigueProfileName] = useState<string | null>(null);

  const titleText = isNew ? name.trim() || 'New calculation' : name.trim() || existing?.name || id;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleExit() {
    if (isNew) {
      if (name.trim()) createCalculation({ name, description });
    } else if (existing) {
      updateCalculation(existing.id, { name, description });
    }
    navigate('/calculation');
  }

  function handleRunCalculation() {
    if (isNew) {
      // Run with an empty form would otherwise pollute the list with an
      // "Untitled calculation" — name it after the fatigue group being run.
      const fallback = fpSelectedGroup ? `${fpSelectedGroup.name}-CALC` : '';
      createCalculation({ name: name.trim() || fallback, description });
    } else if (existing) {
      updateCalculation(existing.id, { name, description, status: 'Finished' });
    }
    navigate('/calculation');
  }

  function toggleFPProfile(name: string) {
    setFpExpandedProfileNames((prev) => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  }

  function toggleFPLoadCase(id: string) {
    setFpExpandedLCIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function handleSelectGeometry(geometryId: string) {
    setSelectedGeometryId((prev) => (prev === geometryId ? null : geometryId));
  }

  function handleSelectComposition(compositionId: string) {
    setSelectedCompositionId((prev) => (prev === compositionId ? null : compositionId));
  }

  function handleSelectGroup(groupId: string) {
    setSelectedGroupId((prev) => (prev === groupId ? null : groupId));
  }

  function handleSelectFatigueProfile(profileName: string) {
    setSelectedFatigueProfileName((prev) => (prev === profileName ? null : profileName));
  }

  function handleIrfLimitChange(value: string) {
    setIrfLimit(value);
    setIrfLimitError(value !== '' && parseFloat(value) > 1 ? 'Max value of IRF is 1.0' : '');
  }

  function handleLgSearchChange(value: string) {
    setLgSearch(value);
    setLgPage(1);
  }

  // ── Load group tab data ───────────────────────────────────────────────────
  const allCreators = useMemo(
    () => [...new Set(FATIGUE_LOAD_GROUPS.map((g) => g.createdBy))].sort(),
    []
  );

  const compAllTypes = useMemo(() => {
    const showGeo = analysisMethod === 'Aero only' && compositionSubTab === 'geometries';
    return [...new Set((showGeo ? GEOMETRIES : COMPOSITIONS).map((item) => item.type))].sort();
  }, [analysisMethod, compositionSubTab]);

  const compListItems = useMemo(() => {
    const showGeo = analysisMethod === 'Aero only' && compositionSubTab === 'geometries';
    const raw = showGeo ? GEOMETRIES : COMPOSITIONS;
    const items = compTypeFilter.size > 0 ? raw.filter((item) => compTypeFilter.has(item.type)) : [...raw];
    return items.sort((a, b) => {
      const dir = compListSort.dir === 'asc' ? 1 : -1;
      if (compListSort.key === 'nominalRadius') return (a.nominalRadius - b.nominalRadius) * dir;
      const aVal = a[compListSort.key].toLowerCase();
      const bVal = b[compListSort.key].toLowerCase();
      return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * dir;
    });
  }, [analysisMethod, compositionSubTab, compTypeFilter, compListSort]);

  const filteredLgGroups = useMemo(() => {
    const q = lgSearch.trim().toLowerCase();
    return FATIGUE_LOAD_GROUPS.filter((g) => {
      if (q && !g.name.toLowerCase().includes(q) && !g.description.toLowerCase().includes(q))
        return false;
      if (lgCreatedByFilter.size > 0 && !lgCreatedByFilter.has(g.createdBy)) return false;
      return true;
    }).sort((a, b) => {
      const dir = lgSort.dir === 'asc' ? 1 : -1;
      return a[lgSort.key] < b[lgSort.key] ? -dir : a[lgSort.key] > b[lgSort.key] ? dir : 0;
    });
  }, [lgSearch, lgSort, lgCreatedByFilter]);

  const lgTotalPages = Math.max(1, Math.ceil(filteredLgGroups.length / FATIGUE_PAGE_SIZE));
  const lgPageRows = filteredLgGroups.slice(
    (lgPage - 1) * FATIGUE_PAGE_SIZE,
    lgPage * FATIGUE_PAGE_SIZE
  );

  function handleLgSort(key: LGSortKey) {
    setLgSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    setLgPage(1);
  }

  function toggleLgExpanded(id: string) {
    setLgExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  useEffect(() => {
    if (!lgCreatedByOpen) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (lgCreatedByBtnRef.current?.contains(t) || lgCreatedByDropRef.current?.contains(t))
        return;
      setLgCreatedByOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [lgCreatedByOpen]);

  useEffect(() => {
    if (!compTypeFilterOpen) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (compTypeBtnRef.current?.contains(t) || compTypeDropRef.current?.contains(t)) return;
      setCompTypeFilterOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [compTypeFilterOpen]);

  function openLgCreatedByFilter() {
    if (lgCreatedByOpen) { setLgCreatedByOpen(false); return; }
    if (lgCreatedByBtnRef.current) {
      const r = lgCreatedByBtnRef.current.getBoundingClientRect();
      setLgCreatedByPos({ top: r.bottom + 4, left: r.right - 200 });
    }
    setLgCreatedByOpen(true);
  }

  function openCompTypeFilter() {
    if (compTypeFilterOpen) { setCompTypeFilterOpen(false); return; }
    if (compTypeBtnRef.current) {
      const r = compTypeBtnRef.current.getBoundingClientRect();
      setCompTypeFilterPos({ top: r.bottom + 4, left: r.right - 200 });
    }
    setCompTypeFilterOpen(true);
  }

  function handleCompListSort(key: CompListSortKey) {
    setCompListSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  }

  // ── Run calculation eligibility ───────────────────────────────────────────
  const canRunCalculation = (() => {
    const baseFields = name.trim() && description.trim();
    if (analysisMethod === 'Aero only') return !!(baseFields && (selectedGeometryId || selectedCompositionId) && selectedGroupId);
    if (analysisMethod === 'Modal (RPM & Aero)') return !!(baseFields && selectedCompositionId && selectedGroupId);
    if (isModalMethod) return !!(baseFields && selectedCompositionId);
    if (analysisMethod === 'Static structural (RPM & Aero)') return !!(baseFields && selectedCompositionId && selectedGroupId && selectedFatigueProfileName);
    if (isStaticStructural) return !!(baseFields && selectedCompositionId && selectedGroupId);
    return !!name.trim();
  })();

  // ── Fatigue profile tab data ──────────────────────────────────────────────
  const fpSelectedGroup = selectedGroupId
    ? FATIGUE_LOAD_GROUPS.find((g) => g.id === selectedGroupId) ?? null
    : null;

  const fpFilteredProfiles = useMemo(() => {
    if (!fpSelectedGroup) return [];
    const q = fpSearch.trim().toLowerCase();
    const all = [...fpSelectedGroup.profiles].sort();
    if (!q) return all;
    return all.filter((p) => p.toLowerCase().includes(q));
  }, [fpSelectedGroup, fpSearch]);

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
              onAnalysisMethodChange={setAnalysisMethod}
              description={description}
              onDescriptionChange={setDescription}
            />
          )}

          {/* ── COMPOSITION TAB ─────────────────────────────────────────── */}
          {activeTab === 'composition' && (
            <CalculationCompositionTab
              analysisMethod={analysisMethod}
              compositionSubTab={compositionSubTab}
              onCompositionSubTabChange={setCompositionSubTab}
              compositionViewMode={compositionViewMode}
              onCompositionViewModeChange={setCompositionViewMode}
              selectedGeometryId={selectedGeometryId}
              onSelectGeometry={handleSelectGeometry}
              selectedCompositionId={selectedCompositionId}
              onSelectComposition={handleSelectComposition}
              compListSort={compListSort}
              onCompListSort={handleCompListSort}
              compListItems={compListItems}
              compTypeFilter={compTypeFilter}
              compTypeBtnRef={compTypeBtnRef}
              onOpenCompTypeFilter={openCompTypeFilter}
            />
          )}

          {/* ── CONFIGURATION TAB ───────────────────────────────────────── */}
          {activeTab === 'configuration' && (
            <CalculationConfigurationTab
              analysisMethod={analysisMethod}
              isModalMethod={isModalMethod}
              isStaticStructural={isStaticStructural}
              activeConfigSection={activeConfigSection}
              onJumpToSection={jumpToConfigSection}
              configScrollRef={configScrollRef}
              configSectionRefs={configSectionRefs}
              numberOfEigenmodes={numberOfEigenmodes}
              onNumberOfEigenmodesChange={setNumberOfEigenmodes}
              fixedBase={fixedBase}
              onFixedBaseToggle={() => setFixedBase((v) => !v)}
              aerofoilModel={aerofoilModel}
              onAerofoilModelChange={setAerofoilModel}
              aeroCorrection={aeroCorrection}
              onAeroCorrectionChange={setAeroCorrection}
              limitsEnabled={limitsEnabled}
              onLimitsEnabledChange={setLimitsEnabled}
              structuralMethod={structuralMethod}
              onStructuralMethodChange={setStructuralMethod}
              plyFailureModel={plyFailureModel}
              onPlyFailureModelChange={setPlyFailureModel}
              coreFailureModel={coreFailureModel}
              onCoreFailureModelChange={setCoreFailureModel}
              fatigueAssessmentTags={fatigueAssessmentTags}
              onFatigueAssessmentTagsChange={setFatigueAssessmentTags}
              minerExponent={minerExponent}
              onMinerExponentChange={setMinerExponent}
              typeOfROI={typeOfROI}
              onTypeOfROIChange={setTypeOfROI}
              maxCriticalElements={maxCriticalElements}
              onMaxCriticalElementsChange={setMaxCriticalElements}
              irfLimit={irfLimit}
              irfLimitError={irfLimitError}
              onIrfLimitChange={handleIrfLimitChange}
              maxFatigueLife={maxFatigueLife}
              onMaxFatigueLifeChange={setMaxFatigueLife}
              debugMode={debugMode}
              onDebugModeChange={setDebugMode}
            />
          )}

          {/* ── LOAD GROUP TAB ──────────────────────────────────────────── */}
          {activeTab === 'load-group' && (
            <CalculationLoadGroupTab
              lgSearch={lgSearch}
              onSearchChange={handleLgSearchChange}
              lgSort={lgSort}
              onSort={handleLgSort}
              lgCreatedByFilter={lgCreatedByFilter}
              lgCreatedByBtnRef={lgCreatedByBtnRef}
              onOpenCreatedByFilter={openLgCreatedByFilter}
              lgExpandedIds={lgExpandedIds}
              onToggleExpanded={toggleLgExpanded}
              selectedGroupId={selectedGroupId}
              onSelectGroup={handleSelectGroup}
              lgPageRows={lgPageRows}
              lgPage={lgPage}
              lgTotalPages={lgTotalPages}
              onPageChange={setLgPage}
            />
          )}

          {/* Created by filter portal */}
          {lgCreatedByOpen && lgCreatedByPos && createPortal(
            <div
              ref={lgCreatedByDropRef}
              style={{ top: lgCreatedByPos.top, left: lgCreatedByPos.left }}
              className="fixed z-[200] w-[200px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]"
            >
              {allCreators.map((creator) => (
                <button
                  key={creator}
                  type="button"
                  onClick={() => {
                    setLgCreatedByFilter((prev) => {
                      const next = new Set(prev);
                      next.has(creator) ? next.delete(creator) : next.add(creator);
                      return next;
                    });
                    setLgPage(1);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-[#f9fafb]"
                >
                  <div className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${lgCreatedByFilter.has(creator) ? 'border-[#006496] bg-[#006496]' : 'border-[#d1d5db]'}`}>
                    {lgCreatedByFilter.has(creator) && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-[14px] text-[#0a0a0a]">{creator}</span>
                </button>
              ))}
            </div>,
            document.body
          )}

          {compTypeFilterOpen && compTypeFilterPos && createPortal(
            <div
              ref={compTypeDropRef}
              style={{ top: compTypeFilterPos.top, left: compTypeFilterPos.left }}
              className="fixed z-[200] w-[200px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]"
            >
              {compAllTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCompTypeFilter((prev) => {
                    const next = new Set(prev);
                    next.has(type) ? next.delete(type) : next.add(type);
                    return next;
                  })}
                  className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-[#f9fafb]"
                >
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${compTypeFilter.has(type) ? 'border-[#006496] bg-[#006496]' : 'border-[#d1d5db]'}`}>
                    {compTypeFilter.has(type) && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                  </div>
                  <span className="truncate text-[14px] text-[#0a0a0a]">{type}</span>
                </button>
              ))}
            </div>,
            document.body
          )}

          {/* ── FATIGUE PROFILE TAB ─────────────────────────────────────── */}
          {activeTab === 'fatigue-profile' && (
            <CalculationFatigueProfileTab
              fpSelectedGroup={fpSelectedGroup}
              onGoToLoadGroupTab={() => setActiveTab('load-group')}
              fpSearch={fpSearch}
              onFpSearchChange={setFpSearch}
              fpFilteredProfiles={fpFilteredProfiles}
              fpExpandedProfileNames={fpExpandedProfileNames}
              onToggleProfile={toggleFPProfile}
              selectedFatigueProfileName={selectedFatigueProfileName}
              onSelectProfile={handleSelectFatigueProfile}
              fpExpandedLCIds={fpExpandedLCIds}
              onToggleLoadCase={toggleFPLoadCase}
            />
          )}

      </main>
    </div>
  );
}
