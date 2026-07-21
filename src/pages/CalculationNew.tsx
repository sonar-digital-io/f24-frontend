import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  LayoutGrid,
  List as ListIcon,
  Play,
  Redo2,
  Search,
  Undo2,
} from 'lucide-react';
import { MainNav } from '@/components/MainNav';
import { Pagination } from '@/components/ListTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeometryCard } from '@/components/GeometryCard';
import { BladeThumbnail } from '@/components/BladeThumbnail';
import { GEOMETRIES } from '@/data/geometries';
import { COMPOSITIONS } from '@/data/compositions';
import { CALCULATIONS, createCalculation, updateCalculation } from '@/data/calculations';
import { TagSelect } from '@/components/TagSelect';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'general' | 'composition' | 'configuration' | 'load-group' | 'fatigue-profile';
type CompositionSubTab = 'geometries' | 'compositions';
type ConfigSection = 'aero' | 'debug' | 'modal' | 'structural' | 'postprocessing';
type CompListSortKey = 'name' | 'lastUpdated' | 'nominalRadius';
interface CompListSort { key: CompListSortKey; dir: 'asc' | 'desc' }

// ─── Mock fatigue load groups for the picker ──────────────────────────────────

interface FatigueLoadGroup {
  id: string;
  name: string;
  description: string;
  lastUpdated: string;
  createdBy: string;
  profiles: string[];
}

const FATIGUE_LOAD_GROUPS: FatigueLoadGroup[] = [
  {
    id: 'op-cycle-normal-01',
    name: 'OP-CYCLE-NORMAL-01',
    description:
      'Standard operational duty cycle including transient events. Combines start-up, power production with gust response, and normal shutdown sequences for comprehensive fatigue damage accumulation analysis.',
    lastUpdated: '2026-04-22',
    createdBy: 'J. Szántó',
    profiles: [
      'Power production',
      'Start-up and shutdown',
      'Extreme turbulence',
      'Standby extreme wind',
      'Low-wind operation',
      'High-turbulence burst',
      'Yaw-misaligned prod',
      'Extreme gust sequence',
      'Grid-loss coast-down',
      'Test run',
    ],
  },
  {
    id: 'dlc-13-extreme',
    name: 'DLC-1.3-EXTREME',
    description:
      'Extreme Turbulence Model (ETM). Ultimate limit state (ULS) check for gust-induced loads.',
    lastUpdated: '2026-04-02',
    createdBy: 'M. Kovács',
    profiles: ['Extreme turbulence', 'Power production'],
  },
  {
    id: 'dlc-21-loss-grid',
    name: 'DLC-2.1-LOSS-GRID',
    description:
      'Loss of electrical grid during operation. Simulates sudden pitch maneuvers and transient loads.',
    lastUpdated: '2026-03-30',
    createdBy: 'A. Tóth',
    profiles: ['Grid-loss coast-down', 'Emergency shutdown'],
  },
  {
    id: 'dlc-61-parked-50y',
    name: 'DLC-6.1-PARKED-50Y',
    description:
      'Parked/Standby state with 50-year return period extreme wind speed. Focus on structural survival.',
    lastUpdated: '2026-03-17',
    createdBy: 'J. Szántó',
    profiles: ['Standby extreme wind', 'Parked — 50y wind'],
  },
  {
    id: 'dlc-7i-idling-err',
    name: 'DLC-7I-IDLING-ERR',
    description:
      'Idling state with pitch system error. Analyzes unbalanced aerodynamic loads on the blade.',
    lastUpdated: '2026-03-03',
    createdBy: 'M. Kovács',
    profiles: ['Idling — pitch error', 'Resonance check'],
  },
  {
    id: 'modal-analysis-gr',
    name: 'MODAL-ANALYSIS-GR',
    description:
      'Zero-load group for frequency extraction. Determines eigenfrequencies and mode shapes.',
    lastUpdated: '2026-02-19',
    createdBy: 'A. Tóth',
    profiles: ['Modal sweep — 0 RPM', 'Modal sweep — rated'],
  },
  {
    id: 'offshore-wave-c',
    name: 'OFFSHORE-WAVE-C',
    description:
      'Coupled wind and wave loading group. Focus on base excitation and aerodynamic damping.',
    lastUpdated: '2026-02-08',
    createdBy: 'J. Szántó',
    profiles: ['Wave — aligned', 'Wave — misaligned 30°'],
  },
  {
    id: 'rated-speed-oper',
    name: 'RATED-SPEED-OPER',
    description:
      'Operation at rated wind speed with maximum thrust. Steady-state structural deflection check.',
    lastUpdated: '2026-02-08',
    createdBy: 'M. Kovács',
    profiles: ['Rated — full load', 'Rated — derating'],
  },
  {
    id: 'static-proof-load',
    name: 'STATIC-PROOF-LOAD',
    description:
      'Full-scale static test simulation. Equivalent to extreme flapwise and edgewise bending tests.',
    lastUpdated: '2026-02-01',
    createdBy: 'A. Tóth',
    profiles: ['Flapwise ULS', 'Edgewise ULS'],
  },
  {
    id: 'tip-deflection-max',
    name: 'TIP-DEFLECTION-MAX',
    description:
      'Worst-case operational scenario for tower clearance check. Focus on maximum out-of-plane tip displacement.',
    lastUpdated: '2026-01-20',
    createdBy: 'J. Szántó',
    profiles: ['Max deflection — gust', 'Max deflection — rated'],
  },
];

const FATIGUE_PAGE_SIZE = 10;

// ─── Fatigue profile nested data ─────────────────────────────────────────────

interface FatigueLoadCaseDetail {
  pitchFlag: string; rpmFlag: string; disa: number | string; targetType: string;
  pitchMin: number | string; rpmMin: number | string; inflowVelocity: number | string; targetValue: number | string;
  pitchMax: number | string; rpmMax: number | string; inflowAngle: number | string; altitude: number | string;
}

interface FatigueLoadCase {
  id: string; name: string; loadCase: string;
  minScale: number | string; maxScale: number | string; time: number | string; cycles: number | string;
  detail: FatigueLoadCaseDetail;
}

const FATIGUE_LOAD_CASES: Record<string, FatigueLoadCase[]> = {
  'op-cycle-normal-01::Power production': [
    { id: 'pp-startup', name: 'Start up', loadCase: 'Start-up', minScale: 0, maxScale: 40, time: 60, cycles: '—', detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 0, targetType: 'Thrust', pitchMin: 15, rpmMin: 2, inflowVelocity: 4, targetValue: 50, pitchMax: '—', rpmMax: '—', inflowAngle: 0, altitude: 120 } },
    { id: 'pp-steady', name: 'Steady state', loadCase: 'Normal power production', minScale: 40, maxScale: 85, time: 600, cycles: '—', detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 0, targetType: 'Thrust', pitchMin: 5, rpmMin: 5, inflowVelocity: 8, targetValue: 1200, pitchMax: '—', rpmMax: '—', inflowAngle: 0, altitude: 0 } },
    { id: 'pp-gust', name: 'Wind gust event', loadCase: 'Normal wind gust', minScale: 60, maxScale: 100, time: '—', cycles: 2, detail: { pitchFlag: 'Free', rpmFlag: 'Free', disa: 5, targetType: 'Power', pitchMin: '—', rpmMin: '—', inflowVelocity: 12, targetValue: 2000, pitchMax: 90, rpmMax: 15, inflowAngle: 2, altitude: 0 } },
    { id: 'pp-recovery', name: 'Recovery and steady state', loadCase: 'Normal power production', minScale: 40, maxScale: 85, time: 300, cycles: '—', detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 0, targetType: 'Thrust', pitchMin: 5, rpmMin: 5, inflowVelocity: 8, targetValue: 1200, pitchMax: '—', rpmMax: '—', inflowAngle: 0, altitude: 0 } },
    { id: 'pp-shutdown', name: 'Shutdown', loadCase: 'Normal shutdown', minScale: 0, maxScale: 85, time: 60, cycles: '—', detail: { pitchFlag: 'Free', rpmFlag: 'Free', disa: 0, targetType: 'Speed', pitchMin: 0, rpmMin: 0, inflowVelocity: 8, targetValue: 0, pitchMax: 90, rpmMax: 15, inflowAngle: 0, altitude: 0 } },
  ],
  'op-cycle-normal-01::Start-up and shutdown': [
    { id: 'susd-cold', name: 'Cold start', loadCase: 'Start-up', minScale: 0, maxScale: 30, time: 90, cycles: '—', detail: { pitchFlag: 'Free', rpmFlag: 'Free', disa: 0, targetType: 'Speed', pitchMin: 0, rpmMin: 0, inflowVelocity: 6, targetValue: 8, pitchMax: 90, rpmMax: 12, inflowAngle: 0, altitude: 0 } },
    { id: 'susd-normal-stop', name: 'Normal shutdown', loadCase: 'Normal shutdown', minScale: 0, maxScale: 85, time: 60, cycles: '—', detail: { pitchFlag: 'Free', rpmFlag: 'Free', disa: 0, targetType: 'Speed', pitchMin: 0, rpmMin: 0, inflowVelocity: 8, targetValue: 0, pitchMax: 90, rpmMax: 15, inflowAngle: 0, altitude: 0 } },
    { id: 'susd-restart', name: 'Restart after fault', loadCase: 'Emergency shutdown', minScale: 0, maxScale: 20, time: 45, cycles: '—', detail: { pitchFlag: 'Free', rpmFlag: 'Fix', disa: 2, targetType: 'Speed', pitchMin: 0, rpmMin: 0, inflowVelocity: 5, targetValue: 6, pitchMax: 90, rpmMax: 10, inflowAngle: 0, altitude: 0 } },
  ],
  'op-cycle-normal-01::Extreme turbulence': [
    { id: 'et-full', name: 'Full-load turbulence', loadCase: 'Extreme turbulence', minScale: 50, maxScale: 100, time: 600, cycles: '—', detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 10, targetType: 'Power', pitchMin: 3, rpmMin: 8, inflowVelocity: 14, targetValue: 2500, pitchMax: '—', rpmMax: '—', inflowAngle: 3, altitude: 0 } },
    { id: 'et-partial', name: 'Partial-load turbulence', loadCase: 'Extreme turbulence', minScale: 20, maxScale: 60, time: 300, cycles: '—', detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 8, targetType: 'Power', pitchMin: 5, rpmMin: 6, inflowVelocity: 10, targetValue: 1500, pitchMax: '—', rpmMax: '—', inflowAngle: 2, altitude: 0 } },
  ],
  'op-cycle-normal-01::Standby extreme wind': [
    { id: 'sew-idling', name: 'Idling — extreme wind', loadCase: 'Standby extreme wind', minScale: 0, maxScale: 10, time: '—', cycles: 1, detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 0, targetType: 'Torque', pitchMin: 85, rpmMin: 0, inflowVelocity: 25, targetValue: 0, pitchMax: 90, rpmMax: 1, inflowAngle: 0, altitude: 0 } },
  ],
  'op-cycle-normal-01::Grid-loss coast-down': [
    { id: 'glcd-main', name: 'Grid loss — rated speed', loadCase: 'Grid-loss coast-down', minScale: 85, maxScale: 100, time: 30, cycles: '—', detail: { pitchFlag: 'Free', rpmFlag: 'Free', disa: 0, targetType: 'Speed', pitchMin: '—', rpmMin: '—', inflowVelocity: 11, targetValue: 0, pitchMax: 90, rpmMax: 15, inflowAngle: 0, altitude: 0 } },
  ],
  'dlc-13-extreme::Extreme turbulence': [
    { id: 'dlc13-et-rated', name: 'ETM at rated wind', loadCase: 'Extreme turbulence', minScale: 80, maxScale: 100, time: 600, cycles: '—', detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 12, targetType: 'Power', pitchMin: 2, rpmMin: 9, inflowVelocity: 11, targetValue: 3000, pitchMax: '—', rpmMax: '—', inflowAngle: 3, altitude: 0 } },
  ],
  'dlc-13-extreme::Power production': [
    { id: 'dlc13-pp-steady', name: 'Rated power steady state', loadCase: 'Normal power production', minScale: 40, maxScale: 85, time: 600, cycles: '—', detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 0, targetType: 'Power', pitchMin: 5, rpmMin: 9, inflowVelocity: 11, targetValue: 3000, pitchMax: '—', rpmMax: '—', inflowAngle: 0, altitude: 0 } },
  ],
  'dlc-21-loss-grid::Grid-loss coast-down': [
    { id: 'dlc21-gl-rated', name: 'Grid loss — rated', loadCase: 'Grid-loss coast-down', minScale: 80, maxScale: 100, time: 30, cycles: '—', detail: { pitchFlag: 'Free', rpmFlag: 'Free', disa: 0, targetType: 'Speed', pitchMin: '—', rpmMin: '—', inflowVelocity: 11, targetValue: 0, pitchMax: 90, rpmMax: 15, inflowAngle: 0, altitude: 0 } },
  ],
  'dlc-21-loss-grid::Emergency shutdown': [
    { id: 'dlc21-emsd', name: 'Emergency stop — grid fault', loadCase: 'Emergency shutdown', minScale: 0, maxScale: 100, time: 20, cycles: '—', detail: { pitchFlag: 'Free', rpmFlag: 'Free', disa: 0, targetType: 'Speed', pitchMin: 0, rpmMin: 0, inflowVelocity: 11, targetValue: 0, pitchMax: 90, rpmMax: 0, inflowAngle: 0, altitude: 0 } },
  ],
};

// ─── Load group sort / filter helpers ────────────────────────────────────────

type LGSortKey = 'name' | 'lastUpdated' | 'createdBy';

interface LGSort { key: LGSortKey; dir: 'asc' | 'desc' }

interface SortableHeaderProps {
  label: string;
  sortKey: LGSortKey;
  currentSort: LGSort;
  onClick: (key: LGSortKey) => void;
}

function LGSortableHeader({ label, sortKey, currentSort, onClick }: SortableHeaderProps) {
  const isActive = currentSort.key === sortKey;
  const Icon = !isActive ? ArrowUpDown : currentSort.dir === 'desc' ? ArrowDown : ChevronUp;
  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className="inline-flex items-center gap-1 text-[14px] font-medium leading-5 text-[#6b7280] hover:text-[#0a0a0a]"
    >
      {label}
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

function CompListSortableHeader({
  label, sortKey, currentSort, onClick,
}: {
  label: string;
  sortKey: CompListSortKey;
  currentSort: CompListSort;
  onClick: (key: CompListSortKey) => void;
}) {
  const isActive = currentSort.key === sortKey;
  const Icon = !isActive ? ArrowUpDown : currentSort.dir === 'desc' ? ArrowDown : ChevronUp;
  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className="inline-flex items-center gap-1 whitespace-nowrap text-[14px] font-medium leading-5 text-[#6b7280] hover:text-[#0a0a0a]"
    >
      {label}
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}


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
  const [activeConfigSection, setActiveConfigSection] = useState<ConfigSection>('aero');
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
  const configScrollRef = useRef<HTMLDivElement>(null);
  const configSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const configLastClickedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isModalMethod) setActiveConfigSection('modal');
    else if (analysisMethod === 'Static structural (RPM)') setActiveConfigSection('structural');
    else setActiveConfigSection('aero');
  }, [analysisMethod]);

  useEffect(() => {
    const container = configScrollRef.current;
    if (!container) return;
    function handleScroll() {
      const containerTop = container!.getBoundingClientRect().top;
      const offsets = (['aero', 'modal', 'structural', 'postprocessing', 'debug'] as const)
        .map((id) => {
          const el = configSectionRefs.current[id];
          return el ? { id, top: el.getBoundingClientRect().top - containerTop } : null;
        })
        .filter((x): x is { id: ConfigSection; top: number } => x !== null);
      const aboveOrAt = offsets.filter((o) => o.top <= 100);
      const detected = aboveOrAt.length > 0 ? aboveOrAt[aboveOrAt.length - 1].id : offsets[0]?.id;
      if (!detected) return;
      if (configLastClickedRef.current && configLastClickedRef.current !== detected) {
        const el = configSectionRefs.current[configLastClickedRef.current];
        if (el && el.getBoundingClientRect().top - containerTop > 100) return;
      }
      configLastClickedRef.current = null;
      setActiveConfigSection(detected);
    }
    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  function jumpToConfigSection(id: ConfigSection) {
    setActiveConfigSection(id);
    configLastClickedRef.current = id;
    const container = configScrollRef.current;
    const el = configSectionRefs.current[id];
    if (!container || !el) return;
    container.scrollBy({ top: el.getBoundingClientRect().top - container.getBoundingClientRect().top - 16 });
  }

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

  const triggerCls =
    'h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]';

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

      {/* Sub-toolbar */}
      <div className="relative flex h-[52px] w-full shrink-0 items-center justify-between bg-[#f8fafc] px-4 py-2">
        <Tabs
          value={(() => {
            if (analysisMethod === 'Modal' && (activeTab === 'load-group' || activeTab === 'fatigue-profile')) return 'configuration';
            if (isModalMethod && analysisMethod !== 'Modal' && activeTab === 'fatigue-profile') return 'composition';
            if (analysisMethod === 'Aero only' && activeTab === 'fatigue-profile') return 'load-group';
            return activeTab;
          })()}
          onValueChange={(v) => setActiveTab(v as Tab)}
          className="h-9 shrink-0"
        >
          <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
            <TabsTrigger value="general" className={triggerCls}>
              General
            </TabsTrigger>
            <TabsTrigger value="composition" className={triggerCls}>
              {analysisMethod === 'Aero only' ? 'Geometry / Composition' : 'Composition'}
            </TabsTrigger>
            <TabsTrigger value="configuration" className={triggerCls}>
              Configuration
            </TabsTrigger>
            <div className="group relative">
              <TabsTrigger
                value="load-group"
                disabled={analysisMethod === 'Modal'}
                className={`${triggerCls} data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40`}
              >
                Load group
              </TabsTrigger>
              {analysisMethod === 'Modal' && (
                <div className="pointer-events-none absolute left-1/2 top-full z-[100] mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#171717] px-2.5 py-1.5 text-[12px] leading-4 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  Not applicable for Modal calculation
                </div>
              )}
            </div>
            <div className="group relative">
              <TabsTrigger
                value="fatigue-profile"
                disabled={analysisMethod === 'Aero only' || isModalMethod}
                className={`${triggerCls} data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40`}
              >
                Fatigue profile
              </TabsTrigger>
              {(analysisMethod === 'Aero only' || isModalMethod) && (
                <div className="pointer-events-none absolute left-1/2 top-full z-[100] mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#171717] px-2.5 py-1.5 text-[12px] leading-4 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  {isModalMethod ? 'Not applicable for Modal calculation' : 'Not applicable for Aero-only calculation'}
                </div>
              )}
            </div>
          </TabsList>
        </Tabs>

        <h1 className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-[18px] font-semibold leading-7 text-[#0a0a0a] lg:block">
          {titleText}
        </h1>

        <div className="flex shrink-0 items-center gap-4">
          <div className="flex items-center gap-[6px]">
            <Check className="h-4 w-4 text-[#737373]" strokeWidth={2} />
            <span className="text-[14px] leading-5 text-[#737373]">Saved</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Undo"
              className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f5f9] text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0] hover:text-[#0a0a0a]"
            >
              <Undo2 className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Redo"
              className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f5f9] text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0] hover:text-[#0a0a0a]"
            >
              <Redo2 className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleExit}
            className="inline-flex h-8 items-center rounded-md bg-[#f1f5f9] px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0]"
          >
            Back to Calculations
          </button>
          <button
            type="button"
            onClick={handleRunCalculation}
            disabled={!canRunCalculation}
            className="inline-flex h-8 items-center gap-2 rounded-md bg-[#006496] px-3 py-2 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Run calculation
            <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
          </button>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className={`flex-1 px-4 pt-4 ${activeTab === 'configuration' ? 'overflow-hidden pb-4' : 'overflow-auto pb-6'}`}>

          {/* ── GENERAL TAB ─────────────────────────────────────────────── */}
          {activeTab === 'general' && (
            <div className="flex w-full max-w-[468px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="calculation-name"
                  className="text-[14px] font-medium leading-none text-[#0a0a0a]"
                >
                  Name <span className="text-[#dc2626]">*</span>
                </Label>
                <Input
                  id="calculation-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name the calculation"
                  className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="calculation-analysis-method"
                  className="text-[14px] font-medium leading-none text-[#0a0a0a]"
                >
                  Analysis method <span className="text-[#dc2626]">*</span>
                </Label>
                <div className="relative">
                  <select
                    id="calculation-analysis-method"
                    value={analysisMethod}
                    onChange={(e) => setAnalysisMethod(e.target.value)}
                    className={`h-9 w-full appearance-none rounded-md border border-[#e2e8f0] bg-white px-3 pr-8 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-[#006496]/30 ${analysisMethod === '' ? 'text-[#9ca3af]' : 'text-[#0a0a0a]'}`}
                  >
                    <option value="" disabled>Select</option>
                    <option>Aero only</option>
                    <option>Modal</option>
                    <option>Modal (RPM)</option>
                    <option>Modal (RPM &amp; Aero)</option>
                    <option>Static structural (RPM)</option>
                    <option>Static structural (RPM &amp; Aero)</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"
                    strokeWidth={2}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="calculation-description"
                  className="text-[14px] font-medium leading-none text-[#0a0a0a]"
                >
                  Description <span className="text-[#dc2626]">*</span>
                </Label>
                <Textarea
                  id="calculation-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the calculation"
                  rows={4}
                  className="rounded-md border-[#e2e8f0] px-3 py-2 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                />
              </div>
            </div>
          )}

          {/* ── COMPOSITION TAB ─────────────────────────────────────────── */}
          {activeTab === 'composition' && (
            <div className="flex w-full flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
              {/* Aero only: info text */}
              {analysisMethod === 'Aero only' && (
                <p className="text-[14px] leading-5 text-[#6b7280]">
                  For an aero only analysis, you can choose either a composition or a geometry.
                </p>
              )}

              {/* Header row */}
              <div className="flex items-center justify-between">
                {analysisMethod === 'Aero only' ? (
                  /* Geometries / Compositions pill toggle */
                  <div className="flex h-9 items-center gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
                    {(['geometries', 'compositions'] as const).map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setCompositionSubTab(sub)}
                        className={`h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 capitalize transition-all ${
                          compositionSubTab === sub
                            ? 'bg-white text-[#0a0a0a] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]'
                            : 'text-[#6b7280] hover:text-[#0a0a0a]'
                        }`}
                      >
                        {sub.charAt(0).toUpperCase() + sub.slice(1)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <h2 className="text-[16px] font-semibold text-[#0a0a0a]">Compositions</h2>
                )}

                {/* List / Grid toggle */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCompositionViewMode('list')}
                    aria-pressed={compositionViewMode === 'list'}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                      compositionViewMode === 'list'
                        ? 'border-[#006496] bg-[#eef9ff] text-[#006496]'
                        : 'border-[#e5e7eb] bg-white text-[#6b7280] hover:bg-[#f1f5f9]'
                    }`}
                  >
                    <ListIcon className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompositionViewMode('grid')}
                    aria-pressed={compositionViewMode === 'grid'}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                      compositionViewMode === 'grid'
                        ? 'border-[#006496] bg-[#eef9ff] text-[#006496]'
                        : 'border-[#e5e7eb] bg-white text-[#6b7280] hover:bg-[#f1f5f9]'
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Grid view */}
              {compositionViewMode === 'grid' && analysisMethod === 'Aero only' && compositionSubTab === 'geometries' && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {GEOMETRIES.map((geo) => (
                    <GeometryCard
                      key={geo.id}
                      geometry={geo}
                      selected={selectedGeometryId === geo.id}
                      showMenu={false}
                      onClick={() =>
                        setSelectedGeometryId((prev) => (prev === geo.id ? null : geo.id))
                      }
                    />
                  ))}
                </div>
              )}

              {compositionViewMode === 'grid' && (analysisMethod !== 'Aero only' || compositionSubTab === 'compositions') && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {COMPOSITIONS.map((comp) => (
                    <div
                      key={comp.id}
                      onClick={() =>
                        setSelectedCompositionId((prev) => (prev === comp.id ? null : comp.id))
                      }
                      className={`flex cursor-pointer flex-col rounded-[10px] border bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#f9fafb] ${
                        selectedCompositionId === comp.id
                          ? 'border-[#006496] ring-2 ring-[#006496]/30'
                          : 'border-[#e5e7eb]'
                      }`}
                    >
                      <div className="px-[10px] pt-[10px]">
                        <h3 className="truncate text-[14px] font-semibold leading-5 text-[#0a0a0a]">
                          {comp.name}
                        </h3>
                      </div>
                      <div className="flex h-[160px] items-center justify-center px-[10px] py-[10px]">
                        <div className="flex h-full w-full items-center justify-center rounded-md bg-[#f8fafc]">
                          <BladeThumbnail />
                        </div>
                      </div>
                      <div className="flex flex-col gap-[10px] px-[10px] pb-[10px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] leading-4 text-[#0a0a0a]">{comp.type}</span>
                          <span className="text-[12px] leading-4 text-[#0a0a0a]">{comp.nominalRadius} m</span>
                        </div>
                        <div className="group/desc relative">
                          <p className="line-clamp-2 text-[12px] leading-4 text-[#737373]">
                            {comp.description}
                          </p>
                          <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 w-[220px] rounded bg-[#0a0a0a] px-2 py-1.5 text-[11px] leading-[1.4] text-white opacity-0 shadow-sm transition-opacity group-hover/desc:opacity-100">
                            {comp.description}
                          </span>
                        </div>
                        <span className="text-[12px] leading-4 text-[#737373]">{comp.lastUpdated}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* List view */}
              {compositionViewMode === 'list' && (
                <div className="overflow-x-auto overflow-y-hidden rounded-md border border-[#e5e7eb]">
                  <table className="w-full border-collapse text-[14px]">
                    <thead>
                      <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                        <th className="h-10 w-[200px] px-3 text-left">
                          <CompListSortableHeader label="Name" sortKey="name" currentSort={compListSort} onClick={handleCompListSort} />
                        </th>
                        <th className="h-10 px-3 text-left">
                          <span className="text-[14px] font-medium leading-5 text-[#6b7280]">Description</span>
                        </th>
                        <th className="h-10 w-[200px] px-3 text-left">
                          <div className="flex items-center gap-1">
                            <span className="text-[14px] font-medium leading-5 text-[#6b7280]">Type</span>
                            <button
                              ref={compTypeBtnRef}
                              type="button"
                              onClick={openCompTypeFilter}
                              className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#e5e7eb] ${compTypeFilter.size > 0 ? 'text-[#006496]' : 'text-[#6b7280]'}`}
                            >
                              <Filter className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          </div>
                        </th>
                        <th className="h-10 w-[140px] px-3 text-left">
                          <CompListSortableHeader label="Nominal radius" sortKey="nominalRadius" currentSort={compListSort} onClick={handleCompListSort} />
                        </th>
                        <th className="h-10 w-[140px] px-3 text-left">
                          <CompListSortableHeader label="Last updated" sortKey="lastUpdated" currentSort={compListSort} onClick={handleCompListSort} />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {compListItems.map((item) => {
                        const showingGeometries = analysisMethod === 'Aero only' && compositionSubTab === 'geometries';
                        const isSelected = showingGeometries
                          ? selectedGeometryId === item.id
                          : selectedCompositionId === item.id;
                        return (
                          <tr
                            key={item.id}
                            onClick={() => {
                              if (showingGeometries) {
                                setSelectedGeometryId((prev) => prev === item.id ? null : item.id);
                              } else {
                                setSelectedCompositionId((prev) => prev === item.id ? null : item.id);
                              }
                            }}
                            className={`cursor-pointer border-b border-[#e5e7eb] transition-colors last:border-b-0 ${
                              isSelected ? 'bg-[#eef9ff] shadow-[inset_2px_0_0_#006496]' : 'hover:bg-[#f9fafb]'
                            }`}
                          >
                            <td className="px-3 py-3 font-medium text-[#0a0a0a]">{item.name}</td>
                            <td className="px-3 py-3 text-[#6b7280]">{item.description}</td>
                            <td className="px-3 py-3 text-[#0a0a0a]">{item.type}</td>
                            <td className="px-3 py-3 text-[#0a0a0a]">{item.nominalRadius} m</td>
                            <td className="px-3 py-3 text-[#0a0a0a]">{item.lastUpdated}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── CONFIGURATION TAB ───────────────────────────────────────── */}
          {activeTab === 'configuration' && (
            <div className="flex h-full w-full max-w-[1200px] overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
              {/* Sidebar nav — inside the card */}
              <aside className="w-[290px] shrink-0 p-6">
                <nav className="flex flex-col gap-1" aria-label="Configuration sections">
                  {(
                    analysisMethod === 'Modal (RPM & Aero)'
                      ? ([{ id: 'modal', label: 'Modal analysis setup' }, { id: 'aero', label: 'Aero analysis setup' }, { id: 'debug', label: 'Debug' }] as const)
                      : isModalMethod
                      ? ([{ id: 'modal', label: 'Modal analysis setup' }, { id: 'debug', label: 'Debug' }] as const)
                      : analysisMethod === 'Static structural (RPM & Aero)'
                      ? ([{ id: 'aero', label: 'Aero analysis setup' }, { id: 'structural', label: 'Structural analysis setup' }, { id: 'postprocessing', label: 'Structural postprocessing setup' }, { id: 'debug', label: 'Debug' }] as const)
                      : isStaticStructural
                      ? ([{ id: 'structural', label: 'Structural analysis setup' }, { id: 'postprocessing', label: 'Structural postprocessing setup' }, { id: 'debug', label: 'Debug' }] as const)
                      : ([{ id: 'aero', label: 'Aero analysis setup' }, { id: 'debug', label: 'Debug' }] as const)
                  ).map(({ id, label }) => (
                    <div key={id} className="group relative">
                      <button
                        type="button"
                        onClick={() => jumpToConfigSection(id)}
                        aria-current={activeConfigSection === id ? 'true' : undefined}
                        className={`flex h-9 w-full items-center overflow-hidden rounded-md px-3 text-left text-[14px] font-medium leading-5 transition-colors ${
                          activeConfigSection === id
                            ? 'bg-[#eef9ff] text-[#171717]'
                            : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                        }`}
                      >
                        <span className="truncate">{label}</span>
                      </button>
                      <div className="pointer-events-none absolute left-full top-1/2 z-[100] ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#171717] px-2.5 py-1.5 text-[12px] leading-4 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                        {label}
                      </div>
                    </div>
                  ))}
                </nav>
              </aside>

              {/* Scrollable content */}
              <div ref={configScrollRef} className="min-w-0 flex-1 overflow-y-auto p-6">
                <div className="flex flex-col gap-12">

                  {/* ── Modal: Modal analysis setup section (first for all modal methods) ── */}
                  {isModalMethod && (
                    <section
                      ref={(el) => (configSectionRefs.current['modal'] = el)}
                      className="flex flex-col gap-6"
                    >
                      <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Modal analysis setup</h2>

                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                        <div className="flex w-full flex-col gap-2 md:w-[424px]">
                          <Label className="text-[14px] font-medium text-[#0a0a0a]">
                            Number of eigenmodes <span className="text-[#dc2626]">*</span>
                          </Label>
                          <input
                            type="text"
                            value={numberOfEigenmodes}
                            onChange={(e) => setNumberOfEigenmodes(e.target.value)}
                            placeholder="Placeholder"
                            className="h-9 w-full rounded-md border border-[#e2e8f0] bg-white px-3 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#006496]/30"
                          />
                        </div>
                        <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                          The total number of resonant frequencies to be calculated for the structure.
                        </p>
                      </div>

                      {analysisMethod === 'Modal' && (
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                          <label className="flex w-full cursor-pointer items-center gap-3 md:w-[424px]">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={fixedBase}
                              onClick={() => setFixedBase((v) => !v)}
                              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${fixedBase ? 'bg-[#006496]' : 'bg-[#d1d5db]'}`}
                            >
                              <span
                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${fixedBase ? 'translate-x-4' : 'translate-x-0.5'}`}
                              />
                            </button>
                            <span className="text-[14px] font-medium text-[#0a0a0a]">Fixed base</span>
                          </label>
                          <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px]">
                            Enables a fixed-free modal analysis. When disabled, a free-free (unconstrained) analysis is performed.
                          </p>
                        </div>
                      )}
                    </section>
                  )}

                  {/* ── Aero + Limits sections (Aero only / non-Modal non-Static, Modal RPM & Aero, or Static structural RPM & Aero) ── */}
                  {((!isModalMethod && !isStaticStructural) || analysisMethod === 'Modal (RPM & Aero)' || analysisMethod === 'Static structural (RPM & Aero)') && (
                    <>
                      {/* Aero section */}
                      <section
                        ref={(el) => (configSectionRefs.current['aero'] = el)}
                        className="flex flex-col gap-6"
                      >
                        <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Aero analysis setup</h2>

                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                          <div className="flex w-full flex-col gap-2 md:w-[424px]">
                            <Label className="text-[14px] font-medium text-[#0a0a0a]">
                              Aerofoil 2D aero <span className="text-[#dc2626]">*</span>
                            </Label>
                            <div className="relative">
                              <select
                                value={aerofoilModel}
                                onChange={(e) => setAerofoilModel(e.target.value)}
                                className="h-9 w-full appearance-none rounded-md border border-[#e2e8f0] bg-white px-3 pr-8 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-[#006496]/30"
                              >
                                <option>NACA 4 digit</option>
                                <option>NACA 5 digit</option>
                                <option>Experimental data</option>
                                <option>Panel method</option>
                              </select>
                              <ChevronDown
                                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"
                                strokeWidth={2}
                              />
                            </div>
                          </div>
                          <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                            Select the mathematical model for calculating 2D lift, drag, and moment
                            coefficients. NACA 4-digit is ideal for initial performance estimates.
                          </p>
                        </div>

                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                          <div className="flex w-full flex-col gap-2 md:w-[424px]">
                            <Label className="text-[14px] font-medium text-[#0a0a0a]">
                              Aero correction <span className="text-[#dc2626]">*</span>
                            </Label>
                            <div className="relative">
                              <select
                                value={aeroCorrection}
                                onChange={(e) => setAeroCorrection(e.target.value)}
                                className="h-9 w-full appearance-none rounded-md border border-[#e2e8f0] bg-white px-3 pr-8 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-[#006496]/30"
                              >
                                <option>None</option>
                                <option>Prandtl tip loss</option>
                                <option>3D rotation correction</option>
                                <option>Prandtl + 3D rotation</option>
                              </select>
                              <ChevronDown
                                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"
                                strokeWidth={2}
                              />
                            </div>
                          </div>
                          <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                            Apply corrections for real-world effects, such as Prandtl's Tip Loss or 3D
                            rotational effects, to improve BEM theory accuracy near the blade tip.
                          </p>
                        </div>

                        <div className="flex flex-col gap-4">
                          {(
                            [
                              {
                                key: 'thrust' as const,
                                label: 'RPM - thrust limit',
                                description:
                                  'Enable this to clip aerodynamic loads when the axial force exceeds the structural threshold of the tower or the main bearing.',
                              },
                              {
                                key: 'torque' as const,
                                label: 'RPM - torque limit',
                                description:
                                  'Enable this to ensure the calculated aerodynamic torque stays within the mechanical drivetrain and gearbox capacity.',
                              },
                              {
                                key: 'power' as const,
                                label: 'RPM - power limit',
                                description:
                                  "Enable this to simulate the pitch-controller's behavior, maintaining rated power output at higher wind speeds.",
                              },
                            ] as const
                          ).map(({ key, label, description }) => (
                            <div
                              key={key}
                              className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4"
                            >
                              <label className="flex w-full cursor-pointer items-center gap-3 md:w-[424px]">
                                <input
                                  type="checkbox"
                                  checked={limitsEnabled[key]}
                                  onChange={(e) =>
                                    setLimitsEnabled((prev) => ({ ...prev, [key]: e.target.checked }))
                                  }
                                  className="h-4 w-4 rounded border-[#e2e8f0] accent-[#006496]"
                                />
                                <span className="text-[14px] font-medium text-[#0a0a0a]">{label}</span>
                              </label>
                              <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px]">{description}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    </>
                  )}

                  {/* ── Static structural sections ── */}
                  {isStaticStructural && (
                    <>
                      {/* Structural analysis setup */}
                      <section
                        ref={(el) => (configSectionRefs.current['structural'] = el)}
                        className="flex flex-col gap-6"
                      >
                        <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Structural analysis setup</h2>

                        {/* Structural method */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                          <div className="flex w-full flex-col gap-2 md:w-[424px]">
                            <Label className="text-[14px] font-medium text-[#0a0a0a]">
                              Structural method <span className="text-[#dc2626]">*</span>
                            </Label>
                            <div className="relative">
                              <select
                                value={structuralMethod}
                                onChange={(e) => setStructuralMethod(e.target.value)}
                                className={`h-9 w-full appearance-none rounded-md border border-[#e2e8f0] bg-white px-3 pr-8 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-[#006496]/30 ${structuralMethod === '' ? 'text-[#9ca3af]' : 'text-[#0a0a0a]'}`}
                              >
                                <option value="" disabled>Select</option>
                                <option>Ply failure</option>
                                <option>Core failure</option>
                                <option>Fatigue</option>
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" strokeWidth={2} />
                            </div>
                          </div>
                          <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                            Select the primary failure analysis approach to apply across the composite layup.
                          </p>
                        </div>

                        {/* Ply failure model */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                          <div className="flex w-full flex-col gap-2 md:w-[424px]">
                            <Label className="text-[14px] font-medium text-[#0a0a0a]">
                              Ply failure model <span className="text-[#dc2626]">*</span>
                            </Label>
                            <TagSelect
                              options={['max stress', 'max strain', 'Hoffman', 'Tsai-Hill', 'Tsai-Wu', 'Hashin', 'Puck']}
                              value={plyFailureModel}
                              onChange={setPlyFailureModel}
                            />
                          </div>
                          <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                            Failure criteria applied to composite plies. Multiple criteria can be selected and compared in the results.
                          </p>
                        </div>

                        {/* Core failure model */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                          <div className="flex w-full flex-col gap-2 md:w-[424px]">
                            <Label className="text-[14px] font-medium text-[#0a0a0a]">
                              Core failure model <span className="text-[#dc2626]">*</span>
                            </Label>
                            <TagSelect
                              options={['face sheet wrinkling', 'core failure', 'shear crimpling']}
                              value={coreFailureModel}
                              onChange={setCoreFailureModel}
                            />
                          </div>
                          <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                            Failure criteria applied to sandwich core layers. Select all failure modes relevant to your core material.
                          </p>
                        </div>

                        {/* Fatigue assessment */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                          <div className="flex w-full flex-col gap-2 md:w-[424px]">
                            <Label className="text-[14px] font-medium text-[#0a0a0a]">
                              Fatigue assessment <span className="text-[#dc2626]">*</span>
                            </Label>
                            <TagSelect
                              options={['fiber direction', 'transverse direction', 'shear']}
                              value={fatigueAssessmentTags}
                              onChange={setFatigueAssessmentTags}
                            />
                          </div>
                          <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                            Stress components used in the fatigue damage evaluation. Select all relevant directions for a complete assessment.
                          </p>
                        </div>

                        {/* Miner exponent */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                          <div className="flex w-full flex-col gap-2 md:w-[424px]">
                            <Label className="text-[14px] font-medium text-[#0a0a0a]">
                              Miner exponent <span className="text-[#dc2626]">*</span>
                            </Label>
                            <input
                              type="text"
                              value={minerExponent}
                              onChange={(e) => setMinerExponent(e.target.value)}
                              className="h-9 w-full rounded-md border border-[#e2e8f0] bg-white px-3 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#006496]/30"
                            />
                          </div>
                          <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                            Exponent used in the Palmgren-Miner linear damage accumulation rule. Use 1.0 for standard fatigue analysis.
                          </p>
                        </div>
                      </section>

                      {/* Structural postprocessing */}
                      <section
                        ref={(el) => (configSectionRefs.current['postprocessing'] = el)}
                        className="flex flex-col gap-6"
                      >
                        <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Structural postprocessing setup</h2>

                        {/* Type of ROI */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                          <div className="flex w-full flex-col gap-2 md:w-[424px]">
                            <Label className="text-[14px] font-medium text-[#0a0a0a]">
                              Type of ROI <span className="text-[#dc2626]">*</span>
                            </Label>
                            <div className="relative">
                              <select
                                value={typeOfROI}
                                onChange={(e) => setTypeOfROI(e.target.value)}
                                className="h-9 w-full appearance-none rounded-md border border-[#e2e8f0] bg-white px-3 pr-8 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-[#006496]/30"
                              >
                                <option>None</option>
                                <option>Sections</option>
                                <option>Mappings</option>
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" strokeWidth={2} />
                            </div>
                          </div>
                          <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                            Restrict postprocessing output to a specific region of interest. Use Sections or Mappings to focus on critical zones.
                          </p>
                        </div>

                        {/* Maximum number of critical elements */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                          <div className="flex w-full flex-col gap-2 md:w-[424px]">
                            <Label className="text-[14px] font-medium text-[#0a0a0a]">
                              Maximum number of critical elements to report <span className="text-[#dc2626]">*</span>
                            </Label>
                            <input
                              type="text"
                              value={maxCriticalElements}
                              onChange={(e) => setMaxCriticalElements(e.target.value)}
                              className="h-9 w-full rounded-md border border-[#e2e8f0] bg-white px-3 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#006496]/30"
                            />
                          </div>
                          <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                            Number of elements ranked by IRF or fatigue damage to include in the report. Higher values produce more detailed output.
                          </p>
                        </div>

                        {/* IRF limit */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                          <div className="flex w-full flex-col gap-2 md:w-[424px]">
                            <Label className="text-[14px] font-medium text-[#0a0a0a]">
                              IRF limit <span className="text-[#dc2626]">*</span>
                            </Label>
                            <input
                              type="number"
                              value={irfLimit}
                              onChange={(e) => {
                                const val = e.target.value;
                                setIrfLimit(val);
                                setIrfLimitError(val !== '' && parseFloat(val) > 1 ? 'Max value of IRF is 1.0' : '');
                              }}
                              placeholder="0.0 – 1.0"
                              className={`h-9 w-full rounded-md border bg-white px-3 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#006496]/30 ${irfLimitError ? 'border-[#dc2626] focus:ring-[#dc2626]/30' : 'border-[#e2e8f0]'}`}
                            />
                            {irfLimitError && (
                              <p className="text-[12px] leading-4 text-[#dc2626]">{irfLimitError}</p>
                            )}
                          </div>
                          <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                            Inverse Reserve Factor threshold for identifying critical structural elements. Must be between 0.0 and 1.0.
                          </p>
                        </div>

                        {/* Maximum fatigue life */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                          <div className="flex w-full flex-col gap-2 md:w-[424px]">
                            <Label className="text-[14px] font-medium text-[#0a0a0a]">
                              Maximum fatigue life [cycles] <span className="text-[#dc2626]">*</span>
                            </Label>
                            <input
                              type="text"
                              value={maxFatigueLife}
                              onChange={(e) => setMaxFatigueLife(e.target.value)}
                              className="h-9 w-full rounded-md border border-[#e2e8f0] bg-white px-3 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#006496]/30"
                            />
                          </div>
                          <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                            Elements with a calculated fatigue life above this value are considered non-critical and excluded from the damage summary.
                          </p>
                        </div>
                      </section>
                    </>
                  )}

                  {/* Debug section — always shown */}
                  <section
                    ref={(el) => (configSectionRefs.current['debug'] = el)}
                    className="flex flex-col gap-6"
                  >
                    <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Debug</h2>

                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                      <label className="flex w-full cursor-pointer items-center gap-3 md:w-[424px]">
                        <input
                          type="checkbox"
                          checked={debugMode}
                          onChange={(e) => setDebugMode(e.target.checked)}
                          className="h-4 w-4 rounded border-[#e2e8f0] accent-[#006496]"
                        />
                        <span className="text-[14px] font-medium text-[#0a0a0a]">Debug mode</span>
                      </label>
                      <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px]">
                        Select debug switch to enable verbose solver output and intermediate result
                        logging for diagnostic purposes.
                      </p>
                    </div>
                  </section>

                </div>
              </div>
            </div>
          )}

          {/* ── LOAD GROUP TAB ──────────────────────────────────────────── */}
          {activeTab === 'load-group' && (
            <div className="w-full">
              {/* Table card */}
              <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                {/* Search row */}
                <div className="border-b border-[#e5e7eb] px-6 py-3">
                  <div className="relative max-w-[340px]">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
                    <Input
                      value={lgSearch}
                      onChange={(e) => { setLgSearch(e.target.value); setLgPage(1); }}
                      placeholder="Search load groups"
                      className="h-9 rounded-md border-[#e2e8f0] pl-8 text-[14px]"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[14px]">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        <th className="h-10 w-[52px]" />
                        <th className="h-10 w-[200px] px-3 text-left">
                          <LGSortableHeader label="Name" sortKey="name" currentSort={lgSort} onClick={handleLgSort} />
                        </th>
                        <th className="h-10 px-3 text-left">
                          <span className="text-[14px] font-medium leading-5 text-[#6b7280]">Description</span>
                        </th>
                        <th className="h-10 w-[160px] px-3 text-left">
                          <LGSortableHeader label="Last updated" sortKey="lastUpdated" currentSort={lgSort} onClick={handleLgSort} />
                        </th>
                        <th className="h-10 w-[180px] px-3 text-left">
                          <div className="flex items-center gap-1">
                            <LGSortableHeader label="Created by" sortKey="createdBy" currentSort={lgSort} onClick={handleLgSort} />
                            <button
                              ref={lgCreatedByBtnRef}
                              type="button"
                              onClick={openLgCreatedByFilter}
                              className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#f1f5f9] ${lgCreatedByFilter.size > 0 ? 'text-[#006496]' : 'text-[#6b7280]'}`}
                            >
                              <Filter className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lgPageRows.map((group) => {
                        const isExpanded = lgExpandedIds.has(group.id);
                        const isSelected = selectedGroupId === group.id;
                        return (
                          <Fragment key={group.id}>
                            <tr
                              onClick={() => setSelectedGroupId((prev) => prev === group.id ? null : group.id)}
                              className={`cursor-pointer border-b border-[#e5e7eb] transition-colors ${
                                isSelected
                                  ? 'bg-[#eef9ff] shadow-[inset_2px_0_0_#006496]'
                                  : isExpanded
                                  ? 'bg-[#f9fafb]'
                                  : 'hover:bg-[#f9fafb]'
                              }`}
                            >
                              <td className="w-[52px] px-3 py-4 align-top">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleLgExpanded(group.id); }}
                                  aria-expanded={isExpanded}
                                  className="flex h-7 w-7 items-center justify-center rounded text-[#0a0a0a] hover:bg-[#e5e7eb]"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" strokeWidth={2} />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" strokeWidth={2} />
                                  )}
                                </button>
                              </td>
                              <td className="w-[200px] px-3 py-4 align-top text-[14px] font-medium leading-5 text-[#0a0a0a]">
                                {group.name}
                              </td>
                              <td className="px-3 py-4 align-top text-[14px] leading-5 text-[#6b7280]">
                                {group.description}
                              </td>
                              <td className="w-[160px] px-3 py-4 align-top text-[14px] leading-5 text-[#0a0a0a]">
                                {group.lastUpdated}
                              </td>
                              <td className="w-[180px] px-3 py-4 align-top text-[14px] leading-5 text-[#6b7280]">
                                {group.createdBy}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${group.id}-expanded`} className="border-b border-[#e5e7eb]">
                                <td colSpan={5} className={`p-0 ${isSelected ? 'bg-[#f5fbff] shadow-[inset_2px_0_0_#006496]' : 'bg-white'}`}>
                                  {[...group.profiles].sort().map((p) => (
                                    <div key={p} className="px-[68px] py-2.5">
                                      <span className="text-[14px] text-[#0a0a0a]">{p}</span>
                                    </div>
                                  ))}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                      {lgPageRows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-[14px] text-[#6b7280]">
                            No load groups match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="mt-4">
                <Pagination page={lgPage} totalPages={lgTotalPages} onChange={setLgPage} />
              </div>
            </div>
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
            <div className="w-full">
              {!fpSelectedGroup ? (
                <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                  <div className="py-12 text-center text-[14px] text-[#6b7280]">
                    No load group selected. Go to the{' '}
                    <button type="button" onClick={() => setActiveTab('load-group')} className="text-[#006496] underline">
                      Load group
                    </button>{' '}
                    tab to select one.
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                  {/* Title row */}
                  <div className="border-b border-[#e5e7eb] px-6 py-4">
                    <span className="text-[16px] font-semibold text-[#0a0a0a]">{fpSelectedGroup.name}</span>
                  </div>
                  {/* Search row */}
                  <div className="border-b border-[#e5e7eb] px-6 py-3">
                    <div className="relative max-w-[340px]">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
                      <Input value={fpSearch} onChange={(e) => setFpSearch(e.target.value)} placeholder="Search fatigue profiles" className="h-9 rounded-md border-[#e2e8f0] pl-8 text-[14px]" />
                    </div>
                  </div>
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[14px]">
                      <thead>
                        <tr className="border-b border-[#e5e7eb]">
                          <th className="h-10 w-[52px]" />
                          <th className="h-10 px-3 text-left">
                            <span className="text-[14px] font-medium leading-5 text-[#6b7280]">Name ↑</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {fpFilteredProfiles.map((profileName) => {
                          const isExpanded = fpExpandedProfileNames.has(profileName);
                          const isSelected = selectedFatigueProfileName === profileName;
                          const lcKey = `${fpSelectedGroup.id}::${profileName}`;
                          const loadCases = FATIGUE_LOAD_CASES[lcKey] ?? [];
                          return (
                            <Fragment key={profileName}>
                              <tr
                                onClick={() => setSelectedFatigueProfileName((p) => p === profileName ? null : profileName)}
                                className={`cursor-pointer border-b border-[#e5e7eb] transition-colors ${isSelected ? 'bg-[#eef9ff] shadow-[inset_2px_0_0_#006496]' : isExpanded ? 'bg-[#f9fafb]' : 'hover:bg-[#f9fafb]'}`}
                              >
                                <td className="w-[52px] px-3 py-4 align-top">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleFPProfile(profileName); }}
                                    className="flex h-7 w-7 items-center justify-center rounded text-[#0a0a0a] hover:bg-[#e5e7eb]"
                                  >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" strokeWidth={2} /> : <ChevronDown className="h-4 w-4" strokeWidth={2} />}
                                  </button>
                                </td>
                                <td className="px-3 py-4 align-top text-[14px] font-medium text-[#0a0a0a]">{profileName}</td>
                              </tr>
                              {isExpanded && (
                                <tr key={`${profileName}-expanded`} className="border-b border-[#e5e7eb]">
                                  <td colSpan={2} className={`p-0 ${isSelected ? 'bg-[#f5fbff] shadow-[inset_2px_0_0_#006496]' : 'bg-white'}`}>
                                    <div className="px-[52px] py-3">
                                      {loadCases.length === 0 ? (
                                        <p className="text-[13px] text-[#6b7280]">No load cases configured for this profile.</p>
                                      ) : (
                                        <div className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
                                          <table className="w-full border-collapse text-[13px]">
                                            <thead>
                                              <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                                                <th className="w-[40px]" />
                                                <th className="px-3 py-2.5 text-left font-medium text-[#6b7280]">Name ↑</th>
                                                <th className="px-3 py-2.5 text-left font-medium text-[#6b7280]">Load case</th>
                                                <th className="w-[110px] px-3 py-2.5 text-left font-medium text-[#6b7280]">Min scale (%)</th>
                                                <th className="w-[110px] px-3 py-2.5 text-left font-medium text-[#6b7280]">Max scale (%)</th>
                                                <th className="w-[100px] px-3 py-2.5 text-left font-medium text-[#6b7280]">Time (sec)</th>
                                                <th className="w-[80px] px-3 py-2.5 text-left font-medium text-[#6b7280]">Cycles</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {loadCases.map((lc) => {
                                                const lcExpanded = fpExpandedLCIds.has(lc.id);
                                                const d = lc.detail;
                                                return (
                                                  <Fragment key={lc.id}>
                                                    <tr
                                                      className={`border-b border-[#e5e7eb] last:border-b-0 ${lcExpanded ? 'bg-[#f9fafb]' : 'hover:bg-[#f9fafb]'}`}
                                                    >
                                                      <td className="w-[40px] px-2 py-3 align-top">
                                                        <button
                                                          type="button"
                                                          onClick={() => toggleFPLoadCase(lc.id)}
                                                          className="flex h-6 w-6 items-center justify-center rounded text-[#0a0a0a] hover:bg-[#e5e7eb]"
                                                        >
                                                          {lcExpanded ? <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} /> : <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />}
                                                        </button>
                                                      </td>
                                                      <td className="px-3 py-3 align-top font-medium text-[#0a0a0a]">{lc.name}</td>
                                                      <td className="px-3 py-3 align-top text-[#6b7280]">{lc.loadCase}</td>
                                                      <td className="px-3 py-3 align-top text-[#0a0a0a]">{lc.minScale}</td>
                                                      <td className="px-3 py-3 align-top text-[#0a0a0a]">{lc.maxScale}</td>
                                                      <td className="px-3 py-3 align-top text-[#0a0a0a]">{lc.time}</td>
                                                      <td className="px-3 py-3 align-top text-[#0a0a0a]">{lc.cycles}</td>
                                                    </tr>
                                                    {lcExpanded && (
                                                      <tr key={`${lc.id}-detail`} className="border-b border-[#e5e7eb] last:border-b-0">
                                                        <td colSpan={7} className="bg-[#f9fafb] px-10 py-4">
                                                          <div className="grid grid-cols-4 gap-x-[72px] gap-y-1.5 w-fit text-[13px]">
                                                            <div><span className="text-[#6b7280]">Pitch flag: </span><span className="font-medium text-[#0a0a0a]">{d.pitchFlag}</span></div>
                                                            <div><span className="text-[#6b7280]">RPM flag: </span><span className="font-medium text-[#0a0a0a]">{d.rpmFlag}</span></div>
                                                            <div><span className="text-[#6b7280]">Disa: </span><span className="font-medium text-[#0a0a0a]">{d.disa}</span></div>
                                                            <div><span className="text-[#6b7280]">Target type: </span><span className="font-medium text-[#0a0a0a]">{d.targetType}</span></div>
                                                            <div><span className="text-[#6b7280]">Pitch min: </span><span className="font-medium text-[#0a0a0a]">{d.pitchMin}</span></div>
                                                            <div><span className="text-[#6b7280]">RPM min: </span><span className="font-medium text-[#0a0a0a]">{d.rpmMin}</span></div>
                                                            <div><span className="text-[#6b7280]">Inflow velocity: </span><span className="font-medium text-[#0a0a0a]">{d.inflowVelocity}</span></div>
                                                            <div><span className="text-[#6b7280]">Target value: </span><span className="font-medium text-[#0a0a0a]">{d.targetValue}</span></div>
                                                            <div><span className="text-[#6b7280]">Pitch max: </span><span className="font-medium text-[#0a0a0a]">{d.pitchMax}</span></div>
                                                            <div><span className="text-[#6b7280]">RPM max: </span><span className="font-medium text-[#0a0a0a]">{d.rpmMax}</span></div>
                                                            <div><span className="text-[#6b7280]">Inflow angle: </span><span className="font-medium text-[#0a0a0a]">{d.inflowAngle}</span></div>
                                                            <div><span className="text-[#6b7280]">Altitude: </span><span className="font-medium text-[#0a0a0a]">{d.altitude}</span></div>
                                                          </div>
                                                        </td>
                                                      </tr>
                                                    )}
                                                  </Fragment>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                        {fpFilteredProfiles.length === 0 && (
                          <tr>
                            <td colSpan={2} className="py-10 text-center text-[14px] text-[#6b7280]">
                              No fatigue profiles match your search.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}


      </main>
    </div>
  );
}
