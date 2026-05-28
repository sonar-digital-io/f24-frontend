import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LayoutGrid,
  LayoutList,
  MoreHorizontal,
  Play,
  Search,
  X,
} from 'lucide-react';
import { MainNav } from '@/components/MainNav';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeometryCard } from '@/components/GeometryCard';
import { BladeThumbnail } from '@/components/BladeThumbnail';
import { GEOMETRIES } from '@/data/geometries';
import { COMPOSITIONS } from '@/data/compositions';
import { CALCULATIONS, createCalculation, updateCalculation } from '@/data/calculations';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'general' | 'composition' | 'configuration' | 'fatigue-profile';
type CompositionSubTab = 'geometries' | 'compositions';
type ConfigSection = 'aero' | 'limits';

// ─── Mock fatigue load groups for the picker ──────────────────────────────────

interface FatigueLoadGroup {
  id: string;
  name: string;
  description: string;
  lastUpdated: string;
  profiles: string[];
}

const FATIGUE_LOAD_GROUPS: FatigueLoadGroup[] = [
  {
    id: 'op-cycle-normal-01',
    name: 'OP-CYCLE-NORMAL-01',
    description:
      'Standard operational duty cycle including transient events. Combines start-up, power production with gust response, and normal shutdown sequences for comprehensive fatigue damage accumulation analysis.',
    lastUpdated: '2026-04-22',
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
    profiles: ['Extreme turbulence', 'Power production'],
  },
  {
    id: 'dlc-21-loss-grid',
    name: 'DLC-2.1-LOSS-GRID',
    description:
      'Loss of electrical grid during operation. Simulates sudden pitch maneuvers and transient loads.',
    lastUpdated: '2026-03-30',
    profiles: ['Grid-loss coast-down', 'Emergency shutdown'],
  },
  {
    id: 'dlc-61-parked-50y',
    name: 'DLC-6.1-PARKED-50Y',
    description:
      'Parked/Standby state with 50-year return period extreme wind speed. Focus on structural survival.',
    lastUpdated: '2026-03-17',
    profiles: ['Standby extreme wind', 'Parked — 50y wind'],
  },
  {
    id: 'dlc-7i-idling-err',
    name: 'DLC-7I-IDLING-ERR',
    description:
      'Idling state with pitch system error. Analyzes unbalanced aerodynamic loads on the blade.',
    lastUpdated: '2026-03-03',
    profiles: ['Idling — pitch error', 'Resonance check'],
  },
  {
    id: 'modal-analysis-gr',
    name: 'MODAL-ANALYSIS-GR',
    description:
      'Zero-load group for frequency extraction. Determines eigenfrequencies and mode shapes.',
    lastUpdated: '2026-02-19',
    profiles: ['Modal sweep — 0 RPM', 'Modal sweep — rated'],
  },
  {
    id: 'offshore-wave-c',
    name: 'OFFSHORE-WAVE-C',
    description:
      'Coupled wind and wave loading group. Focus on base excitation and aerodynamic damping.',
    lastUpdated: '2026-02-08',
    profiles: ['Wave — aligned', 'Wave — misaligned 30°'],
  },
  {
    id: 'rated-speed-oper',
    name: 'RATED-SPEED-OPER',
    description:
      'Operation at rated wind speed with maximum thrust. Steady-state structural deflection check.',
    lastUpdated: '2026-02-08',
    profiles: ['Rated — full load', 'Rated — derating'],
  },
  {
    id: 'static-proof-load',
    name: 'STATIC-PROOF-LOAD',
    description:
      'Full-scale static test simulation. Equivalent to extreme flapwise and edgewise bending tests.',
    lastUpdated: '2026-02-01',
    profiles: ['Flapwise ULS', 'Edgewise ULS'],
  },
  {
    id: 'tip-deflection-max',
    name: 'TIP-DEFLECTION-MAX',
    description:
      'Worst-case operational scenario for tower clearance check. Focus on maximum out-of-plane tip displacement.',
    lastUpdated: '2026-01-20',
    profiles: ['Max deflection — gust', 'Max deflection — rated'],
  },
];

const FATIGUE_PAGE_SIZE = 10;

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const pageNumbers = useMemo(() => {
    if (totalPages <= 4) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const visible: (number | 'ellipsis')[] = [1, 2, 3];
    visible.push('ellipsis');
    return visible;
  }, [totalPages]);

  return (
    <nav aria-label="Pagination" className="flex h-9 items-center justify-end gap-1 px-4 py-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-[14px] font-medium text-[#0a0a0a] hover:bg-[#f1f5f9] disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Previous
      </button>
      {pageNumbers.map((p, idx) =>
        p === 'ellipsis' ? (
          <span
            key={`ellipsis-${idx}`}
            className="flex h-9 w-9 items-center justify-center text-[#6b7280]"
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`flex h-9 w-9 items-center justify-center rounded-md text-[14px] font-medium ${
              p === page
                ? 'border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]'
                : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-[14px] font-medium text-[#0a0a0a] hover:bg-[#f1f5f9] disabled:opacity-50"
      >
        Next
        <ChevronRight className="h-4 w-4" strokeWidth={2} />
      </button>
    </nav>
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
  const [analysisMethod, setAnalysisMethod] = useState('Aero only');
  const [description, setDescription] = useState(existing?.description ?? '');

  // ── Composition ──────────────────────────────────────────────────────────
  const [compositionSubTab, setCompositionSubTab] = useState<CompositionSubTab>('geometries');
  const [compositionViewMode, setCompositionViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedGeometryId, setSelectedGeometryId] = useState<string | null>(null);
  const [selectedCompositionId, setSelectedCompositionId] = useState<string | null>(null);

  // ── Configuration ─────────────────────────────────────────────────────────
  const [configSection, setConfigSection] = useState<ConfigSection>('aero');
  const [aerofoilModel, setAerofoilModel] = useState('NACA 4 digit');
  const [aeroCorrection, setAeroCorrection] = useState('None');
  const [limitsEnabled, setLimitsEnabled] = useState({
    thrust: true,
    torque: true,
    power: true,
  });

  // ── Fatigue profile ───────────────────────────────────────────────────────
  const [fatigueSearch, setFatigueSearch] = useState('');
  const [fatiguePage, setFatiguePage] = useState(1);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [drilledGroupId, setDrilledGroupId] = useState<string | null>(null);
  const [drilledSearch, setDrilledSearch] = useState('');
  const [drilledPage, setDrilledPage] = useState(1);
  const [drilledExpandedIds, setDrilledExpandedIds] = useState<Set<string>>(new Set());

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
      createCalculation({ name, description });
    } else if (existing) {
      updateCalculation(existing.id, { name, description, status: 'Finished' });
    }
    navigate('/calculation');
  }

  function toggleGroup(groupId: string) {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function toggleDrilledGroup(profileName: string) {
    setDrilledExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(profileName)) next.delete(profileName);
      else next.add(profileName);
      return next;
    });
  }

  // ── Fatigue profile picker data ───────────────────────────────────────────
  const filteredGroups = useMemo(() => {
    const q = fatigueSearch.trim().toLowerCase();
    if (!q) return FATIGUE_LOAD_GROUPS;
    return FATIGUE_LOAD_GROUPS.filter(
      (g) =>
        g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
    );
  }, [fatigueSearch]);

  const fatigueTotalPages = Math.max(1, Math.ceil(filteredGroups.length / FATIGUE_PAGE_SIZE));
  const fatiguePageRows = filteredGroups.slice(
    (fatiguePage - 1) * FATIGUE_PAGE_SIZE,
    fatiguePage * FATIGUE_PAGE_SIZE
  );

  // Drilled-in load group
  const drilledGroup = drilledGroupId
    ? FATIGUE_LOAD_GROUPS.find((g) => g.id === drilledGroupId)
    : null;

  const filteredDrilledProfiles = useMemo(() => {
    if (!drilledGroup) return [];
    const q = drilledSearch.trim().toLowerCase();
    if (!q) return drilledGroup.profiles;
    return drilledGroup.profiles.filter((p) => p.toLowerCase().includes(q));
  }, [drilledGroup, drilledSearch]);

  const drilledTotalPages = Math.max(1, Math.ceil(filteredDrilledProfiles.length / FATIGUE_PAGE_SIZE));
  const drilledPageRows = filteredDrilledProfiles.slice(
    (drilledPage - 1) * FATIGUE_PAGE_SIZE,
    drilledPage * FATIGUE_PAGE_SIZE
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      {/* Sub-toolbar */}
      <div className="sticky top-[69px] z-40 flex h-[52px] w-full shrink-0 items-center justify-between gap-4 border-b border-[#e5e7eb] bg-[#f8fafc] px-4">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as Tab)}
          className="h-9"
        >
          <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
            <TabsTrigger value="general" className={triggerCls}>
              General
            </TabsTrigger>
            <TabsTrigger value="composition" className={triggerCls}>
              Composition
            </TabsTrigger>
            <TabsTrigger value="configuration" className={triggerCls}>
              Configuration
            </TabsTrigger>
            <TabsTrigger value="fatigue-profile" className={triggerCls}>
              Fatigue profile
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <h1 className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-[18px] font-semibold leading-7 text-[#0a0a0a] lg:block">
          {titleText}
        </h1>

        <button
          type="button"
          onClick={handleExit}
          className="inline-flex h-8 items-center gap-2 rounded-md bg-[#f1f5f9] px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0]"
        >
          Exit edit mode
          <X className="h-4 w-4 opacity-70" strokeWidth={1.33} />
        </button>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-[1400px]">

          {/* ── GENERAL TAB ─────────────────────────────────────────────── */}
          {activeTab === 'general' && (
            <div className="flex w-full max-w-[468px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
              <div className="flex flex-col gap-2">
                <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
                  Name <span className="text-[#dc2626]">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name the calculation"
                  className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
                  Analysis method <span className="text-[#dc2626]">*</span>
                </Label>
                <div className="relative">
                  <select
                    value={analysisMethod}
                    onChange={(e) => setAnalysisMethod(e.target.value)}
                    className="h-9 w-full appearance-none rounded-md border border-[#e2e8f0] bg-white px-3 pr-8 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-[#006496]/30"
                  >
                    <option>Aero only</option>
                    <option>Aero + Structure</option>
                    <option>Structure only</option>
                    <option>Modal</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"
                    strokeWidth={2}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
                  Description <span className="text-[#dc2626]">*</span>
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Placeholder"
                  rows={4}
                  className="rounded-md border-[#e2e8f0] px-3 py-2 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                />
              </div>
            </div>
          )}

          {/* ── COMPOSITION TAB ─────────────────────────────────────────── */}
          {activeTab === 'composition' && (
            <div className="flex w-full flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
              {/* Info text */}
              <p className="text-[14px] leading-5 text-[#6b7280]">
                For an aero only analysis, you can choose either a composition or a geometry.
              </p>

              {/* Toggle + view mode */}
              <div className="flex items-center justify-between">
                {/* Geometries / Compositions pill toggle */}
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
                    <LayoutList className="h-4 w-4" strokeWidth={2} />
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
              {compositionViewMode === 'grid' && compositionSubTab === 'geometries' && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {GEOMETRIES.map((geo) => (
                    <GeometryCard
                      key={geo.id}
                      geometry={geo}
                      selected={selectedGeometryId === geo.id}
                      onClick={() =>
                        setSelectedGeometryId((prev) => (prev === geo.id ? null : geo.id))
                      }
                    />
                  ))}
                </div>
              )}

              {compositionViewMode === 'grid' && compositionSubTab === 'compositions' && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {COMPOSITIONS.map((comp) => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() =>
                        setSelectedCompositionId((prev) => (prev === comp.id ? null : comp.id))
                      }
                      className={`flex flex-col gap-3 rounded-[14px] border bg-white p-4 text-left shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#f9fafb] ${
                        selectedCompositionId === comp.id
                          ? 'border-[#006496] ring-2 ring-[#006496]/30'
                          : 'border-[#e5e7eb]'
                      }`}
                    >
                      <h3 className="text-[14px] font-semibold leading-5 text-[#0a0a0a]">
                        {comp.name}
                      </h3>
                      <div className="aspect-[2/1] w-full overflow-hidden rounded-md bg-[#f8fafc]">
                        <BladeThumbnail />
                      </div>
                      <span className="text-[14px] leading-5 text-[#6b7280]">
                        {comp.lastUpdated}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* List view */}
              {compositionViewMode === 'list' && (
                <div className="overflow-hidden rounded-md border border-[#e5e7eb]">
                  <table className="w-full border-collapse text-[14px]">
                    <thead>
                      <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                        <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Name</th>
                        <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                          Description
                        </th>
                        <th className="h-10 w-[140px] px-3 text-left font-medium text-[#6b7280]">
                          Last updated
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(compositionSubTab === 'geometries' ? GEOMETRIES : COMPOSITIONS).map(
                        (item) => {
                          const isSelected =
                            compositionSubTab === 'geometries'
                              ? selectedGeometryId === item.id
                              : selectedCompositionId === item.id;
                          return (
                            <tr
                              key={item.id}
                              onClick={() => {
                                if (compositionSubTab === 'geometries') {
                                  setSelectedGeometryId((prev) =>
                                    prev === item.id ? null : item.id
                                  );
                                } else {
                                  setSelectedCompositionId((prev) =>
                                    prev === item.id ? null : item.id
                                  );
                                }
                              }}
                              className={`cursor-pointer border-b border-[#e5e7eb] transition-colors last:border-b-0 ${
                                isSelected ? 'bg-[#eef9ff]' : 'hover:bg-[#f9fafb]'
                              }`}
                            >
                              <td className="px-3 py-3 font-medium text-[#0a0a0a]">
                                {item.name}
                              </td>
                              <td className="px-3 py-3 text-[#6b7280]">{item.description}</td>
                              <td className="px-3 py-3 text-[#0a0a0a]">{item.lastUpdated}</td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── CONFIGURATION TAB ───────────────────────────────────────── */}
          {activeTab === 'configuration' && (
            <div className="flex gap-4">
              {/* Left sidebar nav */}
              <nav className="w-[180px] shrink-0">
                <ul className="flex flex-col gap-0.5">
                  {(['aero', 'limits'] as const).map((sec) => (
                    <li key={sec}>
                      <button
                        type="button"
                        onClick={() => setConfigSection(sec)}
                        className={`flex w-full items-center rounded-md px-3 py-2 text-[14px] font-medium capitalize transition-colors ${
                          configSection === sec
                            ? 'bg-[#eef9ff] text-[#006496]'
                            : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                        }`}
                      >
                        {sec.charAt(0).toUpperCase() + sec.slice(1)}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Right panel */}
              <div className="flex-1 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                {configSection === 'aero' && (
                  <div className="flex flex-col gap-6">
                    <h2 className="text-[18px] font-semibold text-[#0a0a0a]">Aero</h2>

                    {/* Aerofoil 2D aero */}
                    <div className="grid grid-cols-[minmax(0,340px)_1fr] gap-6">
                      <div className="flex flex-col gap-2">
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
                      <p className="self-end pb-1 text-[14px] leading-5 text-[#6b7280]">
                        Select the mathematical model for calculating 2D lift, drag, and moment
                        coefficients. NACA 4-digit is ideal for initial performance estimates.
                      </p>
                    </div>

                    {/* Aero correction */}
                    <div className="grid grid-cols-[minmax(0,340px)_1fr] gap-6">
                      <div className="flex flex-col gap-2">
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
                      <p className="self-end pb-1 text-[14px] leading-5 text-[#6b7280]">
                        Apply corrections for real-world effects, such as Prandtl's Tip Loss or 3D
                        rotational effects, to improve BEM theory accuracy near the blade tip.
                      </p>
                    </div>
                  </div>
                )}

                {configSection === 'limits' && (
                  <div className="flex flex-col gap-6">
                    <h2 className="text-[18px] font-semibold text-[#0a0a0a]">Limits</h2>

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
                          className="grid grid-cols-[minmax(0,340px)_1fr] items-start gap-6"
                        >
                          <label className="flex cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              checked={limitsEnabled[key]}
                              onChange={(e) =>
                                setLimitsEnabled((prev) => ({
                                  ...prev,
                                  [key]: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded border-[#e2e8f0] accent-[#006496]"
                            />
                            <span className="text-[14px] font-medium text-[#0a0a0a]">{label}</span>
                          </label>
                          <p className="text-[14px] leading-5 text-[#6b7280]">{description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── FATIGUE PROFILE TAB ─────────────────────────────────────── */}
          {activeTab === 'fatigue-profile' && (
            <>
              {/* ── Drilled-in view: selected load group's fatigue profiles ── */}
              {drilledGroup ? (
                <div className="flex w-full flex-col rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                  {/* Drill-in header */}
                  <div className="flex items-center justify-between gap-4 border-b border-[#e5e7eb] px-6 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        setDrilledGroupId(null);
                        setDrilledSearch('');
                        setDrilledPage(1);
                        setDrilledExpandedIds(new Set());
                      }}
                      className="flex items-center gap-2 text-[16px] font-semibold text-[#0a0a0a] hover:text-[#006496]"
                    >
                      <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                      {drilledGroup.name}
                    </button>

                    <button
                      type="button"
                      onClick={handleRunCalculation}
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-[#006496] px-4 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580]"
                    >
                      Run calculation
                      <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
                    </button>
                  </div>

                  {/* Search */}
                  <div className="border-b border-[#e5e7eb] px-6 py-3">
                    <div className="relative max-w-[240px]">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
                      <Input
                        value={drilledSearch}
                        onChange={(e) => {
                          setDrilledSearch(e.target.value);
                          setDrilledPage(1);
                        }}
                        placeholder="Placeholder"
                        className="h-8 rounded-md border-[#e2e8f0] pl-8 text-[13px]"
                      />
                    </div>
                  </div>

                  {/* Column header */}
                  <div className="border-b border-[#e5e7eb] px-6 py-2">
                    <span className="text-[13px] font-medium text-[#6b7280]">Name ↑</span>
                  </div>

                  {/* Fatigue profile rows */}
                  <div className="flex flex-col">
                    {drilledPageRows.map((profileName) => (
                      <div
                        key={profileName}
                        className="border-b border-[#e5e7eb] last:border-b-0"
                      >
                        <div
                          className={`flex items-center gap-2 px-6 py-3 ${
                            drilledExpandedIds.has(profileName) ? 'bg-[#f4f4f5]' : 'hover:bg-[#f9fafb]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleDrilledGroup(profileName)}
                            className="flex flex-1 items-center gap-2 text-left"
                          >
                            {drilledExpandedIds.has(profileName) ? (
                              <ChevronUp
                                className="h-4 w-4 shrink-0 text-[#6b7280]"
                                strokeWidth={2}
                              />
                            ) : (
                              <ChevronDown
                                className="h-4 w-4 shrink-0 text-[#6b7280]"
                                strokeWidth={2}
                              />
                            )}
                            <span className="text-[14px] font-medium text-[#0a0a0a]">
                              {profileName}
                            </span>
                          </button>
                        </div>
                        {drilledExpandedIds.has(profileName) && (
                          <div className="border-t border-[#e5e7eb] bg-white px-12 py-3 text-[13px] text-[#6b7280]">
                            No sub-items configured for this fatigue profile.
                          </div>
                        )}
                      </div>
                    ))}
                    {drilledPageRows.length === 0 && (
                      <div className="py-10 text-center text-[14px] text-[#6b7280]">
                        No fatigue profiles match your search.
                      </div>
                    )}
                  </div>

                  <Pagination
                    page={drilledPage}
                    totalPages={drilledTotalPages}
                    onChange={setDrilledPage}
                  />
                </div>
              ) : (
                /* ── Load group picker list ── */
                <div className="flex w-full flex-col rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                  {/* Search */}
                  <div className="border-b border-[#e5e7eb] px-6 py-3">
                    <div className="relative max-w-[240px]">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
                      <Input
                        value={fatigueSearch}
                        onChange={(e) => {
                          setFatigueSearch(e.target.value);
                          setFatiguePage(1);
                        }}
                        placeholder="Search"
                        className="h-8 rounded-md border-[#e2e8f0] pl-8 text-[13px]"
                      />
                    </div>
                  </div>

                  {/* Column headers */}
                  <div className="grid grid-cols-[auto_1fr_160px_140px_auto] items-center gap-0 border-b border-[#e5e7eb] px-6 py-2">
                    <div className="w-6" />
                    <span className="text-[13px] font-medium text-[#6b7280]">Name ↑↓</span>
                    <span className="px-3 text-[13px] font-medium text-[#6b7280]">
                      Last updated ↓
                    </span>
                    <span className="px-3 text-[13px] font-medium text-[#6b7280]">User</span>
                    <div className="w-20" />
                  </div>

                  {/* Load group rows */}
                  <div className="flex flex-col">
                    {fatiguePageRows.map((group) => {
                      const isExpanded = expandedGroupIds.has(group.id);
                      const isSelected = selectedGroupId === group.id;
                      return (
                        <div
                          key={group.id}
                          className="border-b border-[#e5e7eb] last:border-b-0"
                        >
                          {/* Row */}
                          <div
                            className={`grid grid-cols-[auto_1fr_160px_140px_auto] items-center gap-0 px-6 py-3 ${
                              isExpanded ? 'bg-[#f4f4f5]' : 'hover:bg-[#f9fafb]'
                            }`}
                          >
                            {/* Chevron */}
                            <button
                              type="button"
                              onClick={() => toggleGroup(group.id)}
                              className="flex h-6 w-6 items-center justify-center text-[#6b7280] hover:text-[#0a0a0a]"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" strokeWidth={2} />
                              ) : (
                                <ChevronDown className="h-4 w-4" strokeWidth={2} />
                              )}
                            </button>

                            {/* Name + description */}
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[14px] font-medium text-[#0a0a0a]">
                                {group.name}
                              </span>
                              {isExpanded && (
                                <span className="text-[13px] leading-5 text-[#6b7280]">
                                  {group.description}
                                </span>
                              )}
                            </div>

                            <span className="px-3 text-[14px] text-[#0a0a0a]">
                              {group.lastUpdated}
                            </span>
                            <span className="px-3 text-[14px] text-[#6b7280]">User Name</span>

                            {/* Select button */}
                            <div className="flex w-20 justify-end">
                              {isSelected ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedGroupId(null);
                                  }}
                                  className="inline-flex h-8 items-center rounded-md bg-[#006496] px-3 text-[13px] font-medium text-white hover:bg-[#005580]"
                                >
                                  Select
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedGroupId(group.id);
                                    setDrilledGroupId(group.id);
                                    setDrilledSearch('');
                                    setDrilledPage(1);
                                    setDrilledExpandedIds(new Set());
                                  }}
                                  className="inline-flex h-8 items-center rounded-md border border-[#e5e7eb] bg-white px-3 text-[13px] font-medium text-[#0a0a0a] hover:bg-[#f1f5f9]"
                                >
                                  Select
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expanded sub-profiles */}
                          {isExpanded && (
                            <div className="border-t border-[#e5e7eb] bg-white">
                              {group.profiles.map((profileName) => (
                                <div
                                  key={profileName}
                                  className="border-b border-[#e5e7eb] px-12 py-2.5 last:border-b-0 hover:bg-[#f9fafb]"
                                >
                                  <span className="text-[14px] text-[#0a0a0a]">{profileName}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {fatiguePageRows.length === 0 && (
                      <div className="py-10 text-center text-[14px] text-[#6b7280]">
                        No load groups match your search.
                      </div>
                    )}
                  </div>

                  <Pagination
                    page={fatiguePage}
                    totalPages={fatigueTotalPages}
                    onChange={setFatiguePage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
