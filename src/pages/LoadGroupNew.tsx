import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  GripVertical,
  Info,
  Plus,
  Redo2,
  Search,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { MainNav } from '@/components/MainNav';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BezierEditor, type ControlPoint } from '@/components/BezierEditor';
import { BufferedNumberInput } from '@/components/BufferedNumberInput';
import { LOAD_GROUPS, createLoadGroup, updateLoadGroup } from '@/data/loadGroups';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'general' | 'load-cases' | 'limits' | 'fatigue-profiles';
type LimitsSubTab = 'thrust' | 'torque' | 'power';
type PitchRpmFlag = 'Range' | 'Fixed';
type TargetType = 'torque' | 'thrust' | 'power';

interface LoadCase {
  id: string;
  name: string;
  pitchFlag: PitchRpmFlag;
  pitchMin: number;
  pitchMax: number;
  rpmFlag: PitchRpmFlag;
  rpmMin: number;
  rpmMax: number;
  altitude: number;
  disa: number;
  inflowVelocity: number;
  inflowAngle: number;
  targetType: TargetType;
  targetValue: number;
}

interface FatigueCase {
  id: string;
  name: string;
  loadCase: string;
  minScale: number;
  maxScale: number;
  time: number | null;
  cycles: number | null;
}

interface FatigueProfile {
  id: string;
  name: string;
  open: boolean;
  cases: FatigueCase[];
}

// ─── Initial mock data ───────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 8);
}

const EXISTING_LOAD_CASES: LoadCase[] = [
  {
    id: makeId(),
    name: 'Start up',
    pitchFlag: 'Range',
    pitchMin: 0,
    pitchMax: 15,
    rpmFlag: 'Range',
    rpmMin: 0,
    rpmMax: 7,
    altitude: 80,
    disa: 0,
    inflowVelocity: 8,
    inflowAngle: 0,
    targetType: 'power',
    targetValue: 1500,
  },
  {
    id: makeId(),
    name: 'Normal power production',
    pitchFlag: 'Range',
    pitchMin: 2,
    pitchMax: 20,
    rpmFlag: 'Range',
    rpmMin: 6,
    rpmMax: 12,
    altitude: 80,
    disa: 0,
    inflowVelocity: 12,
    inflowAngle: 3,
    targetType: 'power',
    targetValue: 8000,
  },
  {
    id: makeId(),
    name: 'Normal wind gust',
    pitchFlag: 'Range',
    pitchMin: 5,
    pitchMax: 45,
    rpmFlag: 'Range',
    rpmMin: 4,
    rpmMax: 13,
    altitude: 80,
    disa: 5,
    inflowVelocity: 18,
    inflowAngle: 8,
    targetType: 'thrust',
    targetValue: 950,
  },
  {
    id: makeId(),
    name: 'Normal shutdown',
    pitchFlag: 'Range',
    pitchMin: 20,
    pitchMax: 90,
    rpmFlag: 'Range',
    rpmMin: 0,
    rpmMax: 12,
    altitude: 80,
    disa: 0,
    inflowVelocity: 10,
    inflowAngle: 0,
    targetType: 'power',
    targetValue: 0,
  },
  {
    id: makeId(),
    name: 'Extreme turbulence',
    pitchFlag: 'Range',
    pitchMin: 5,
    pitchMax: 90,
    rpmFlag: 'Range',
    rpmMin: 2,
    rpmMax: 15,
    altitude: 80,
    disa: 15,
    inflowVelocity: 25,
    inflowAngle: 15,
    targetType: 'thrust',
    targetValue: 1200,
  },
];

const PLACEHOLDER_LOAD_CASE: Omit<LoadCase, 'id'> = {
  name: '',
  pitchFlag: 'Range',
  pitchMin: 0,
  pitchMax: 25,
  rpmFlag: 'Range',
  rpmMin: 0,
  rpmMax: 15,
  altitude: 0,
  disa: 0,
  inflowVelocity: 10,
  inflowAngle: 0,
  targetType: 'power',
  targetValue: 0,
};

// ControlPoint x = RPM (0–20), y = value in physical units
const INITIAL_LIMIT_POINTS: Record<LimitsSubTab, ControlPoint[]> = {
  thrust: [
    { x: 0, y: 1200 },
    { x: 8, y: 1100 },
    { x: 14, y: 900 },
    { x: 20, y: 700 },
  ],
  torque: [
    { x: 0, y: 4000 },
    { x: 8, y: 6800 },
    { x: 14, y: 5400 },
    { x: 20, y: 4000 },
  ],
  power: [
    { x: 0, y: 1500 },
    { x: 8, y: 6000 },
    { x: 14, y: 8000 },
    { x: 20, y: 8000 },
  ],
};

const LIMITS_Y_MAX: Record<LimitsSubTab, number> = {
  thrust: 1500,
  torque: 10000,
  power: 10000,
};

const LIMITS_Y_STEP: Record<LimitsSubTab, number> = {
  thrust: 300,
  torque: 2000,
  power: 2000,
};

const LIMITS_UNITS: Record<LimitsSubTab, string> = {
  thrust: 'N',
  torque: 'Nm',
  power: 'kW',
};

const EXISTING_FATIGUE_PROFILES: FatigueProfile[] = [
  {
    id: makeId(),
    name: 'Power production',
    open: true,
    cases: [
      {
        id: makeId(),
        name: 'Start up',
        loadCase: 'Start up',
        minScale: 0,
        maxScale: 40,
        time: 60,
        cycles: null,
      },
      {
        id: makeId(),
        name: 'Steady state',
        loadCase: 'Normal power production',
        minScale: 40,
        maxScale: 85,
        time: 600,
        cycles: null,
      },
      {
        id: makeId(),
        name: 'Wind gust event',
        loadCase: 'Normal wind gust',
        minScale: 60,
        maxScale: 100,
        time: null,
        cycles: 2,
      },
      {
        id: makeId(),
        name: 'Recovery and steady state',
        loadCase: 'Normal power production',
        minScale: 40,
        maxScale: 85,
        time: 300,
        cycles: null,
      },
      {
        id: makeId(),
        name: 'Shutdown',
        loadCase: 'Normal shutdown',
        minScale: 0,
        maxScale: 85,
        time: 60,
        cycles: null,
      },
    ],
  },
  {
    id: makeId(),
    name: 'Start-up and shutdown',
    open: false,
    cases: [
      {
        id: makeId(),
        name: 'Start up sequence',
        loadCase: 'Normal power production',
        minScale: 0,
        maxScale: 30,
        time: 90,
        cycles: null,
      },
    ],
  },
];

const NEW_FATIGUE_PROFILES_PLACEHOLDER: FatigueProfile[] = [
  {
    id: makeId(),
    name: 'Fatigue profile',
    open: true,
    cases: [
      {
        id: makeId(),
        name: 'Placeholder',
        loadCase: '',
        minScale: 0,
        maxScale: 100,
        time: null,
        cycles: null,
      },
    ],
  },
];

// ─── Small reusable components ───────────────────────────────────────────────

interface SelectInlineProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
}

function SelectInline({ value, onChange, options, className = '' }: SelectInlineProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setOpen((o) => !o);
  }

  const dropdown =
    open && pos
      ? createPortal(
          <ul
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: pos.top,
              left: pos.left,
              minWidth: pos.width,
              zIndex: 9999,
            }}
            className="whitespace-nowrap rounded-md border border-[#e5e7eb] bg-white py-1 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)]"
          >
            {options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] ${
                    opt === value ? 'bg-[#eef9ff] text-[#171717]' : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                  }`}
                >
                  {opt}
                  {opt === value && <Check className="ml-3 h-3.5 w-3.5" strokeWidth={2} />}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="flex h-8 w-full items-center justify-between gap-1 rounded-md border border-[#e2e8f0] bg-white px-2 text-[13px] text-[#0a0a0a] hover:bg-[#f9fafb]"
      >
        <span className="truncate">{value}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-[#6b7280] transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      {dropdown}
    </div>
  );
}

// ─── Load case picker dialog ─────────────────────────────────────────────────

interface LoadCasePickerDialogProps {
  open: boolean;
  loadCaseNames: string[];
  current: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}

function LoadCasePickerDialog({
  open,
  loadCaseNames,
  current,
  onSelect,
  onClose,
}: LoadCasePickerDialogProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return loadCaseNames;
    return loadCaseNames.filter((n) => n.toLowerCase().includes(q));
  }, [query, loadCaseNames]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-case-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100vh-4rem)] w-full max-w-[480px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h2
            id="load-case-picker-title"
            className="text-[20px] font-bold leading-7 text-[#181c20]"
          >
            Load cases
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            autoFocus
            className="h-9 rounded-md border-[#e2e8f0] pl-9 text-[14px]"
          />
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-[#e5e7eb]">
                <th className="h-10 px-3 text-left text-[14px] font-medium text-[#6b7280]">Name</th>
                <th className="h-10 w-[100px] px-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((name) => (
                <tr
                  key={name}
                  className={`border-b border-[#e5e7eb] last:border-b-0 ${
                    name === current ? 'bg-[#eef9ff]' : 'hover:bg-[#f9fafb]'
                  }`}
                >
                  <td className="px-3 py-3 text-[14px] font-medium text-[#0a0a0a]">{name}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => { onSelect(name); onClose(); }}
                      className="inline-flex h-8 items-center justify-center rounded-md bg-[#006496] px-3 text-[13px] font-medium text-[#fafafa] hover:bg-[#005580]"
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
                    No load cases match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LoadGroupNew() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const existing = isNew ? undefined : LOAD_GROUPS.find((g) => g.id === id);

  const [activeTab, setActiveTab] = useState<Tab>('general');

  // General
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');

  // Load cases
  const [loadCases, setLoadCases] = useState<LoadCase[]>(() =>
    isNew ? [{ ...PLACEHOLDER_LOAD_CASE, id: makeId() }] : EXISTING_LOAD_CASES
  );

  // Limits
  const [limitsSubTab, setLimitsSubTab] = useState<LimitsSubTab>('thrust');
  const [limitPoints, setLimitPoints] =
    useState<Record<LimitsSubTab, ControlPoint[]>>(INITIAL_LIMIT_POINTS);

  // Fatigue profiles
  const [fatigueProfiles, setFatigueProfiles] = useState<FatigueProfile[]>(() =>
    isNew ? NEW_FATIGUE_PROFILES_PLACEHOLDER : EXISTING_FATIGUE_PROFILES
  );
  const [fatigueSearch, setFatigueSearch] = useState('');
  const [pickingLoadCase, setPickingLoadCase] = useState<{
    profileId: string;
    caseId: string;
  } | null>(null);

  const titleText = isNew
    ? name.trim() || 'New load group'
    : name.trim() || existing?.name || id;

  // ── Exit / save ──────────────────────────────────────────────────────────
  function handleExit() {
    if (isNew) {
      if (name.trim()) createLoadGroup({ name, description });
    } else if (existing) {
      updateLoadGroup(existing.id, { name, description });
    }
    navigate('/load-group');
  }

  // ── Load cases helpers ───────────────────────────────────────────────────
  function updateLoadCase<K extends keyof LoadCase>(caseId: string, field: K, val: LoadCase[K]) {
    setLoadCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, [field]: val } : c)));
  }

  function addLoadCase() {
    const lc: LoadCase = {
      id: makeId(),
      name: '',
      pitchFlag: 'Range',
      pitchMin: 0,
      pitchMax: 25,
      rpmFlag: 'Range',
      rpmMin: 0,
      rpmMax: 15,
      altitude: 0,
      disa: 0,
      inflowVelocity: 10,
      inflowAngle: 0,
      targetType: 'power',
      targetValue: 0,
    };
    setLoadCases((prev) => [...prev, lc]);
  }

  function deleteLoadCase(caseId: string) {
    setLoadCases((prev) => prev.filter((c) => c.id !== caseId));
  }

  function duplicateLoadCase(caseId: string) {
    setLoadCases((prev) => {
      const idx = prev.findIndex((c) => c.id === caseId);
      if (idx === -1) return prev;
      const src = prev[idx];
      const clone: LoadCase = {
        ...src,
        id: makeId(),
        name: src.name ? `${src.name} copy` : 'copy',
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }

  // ── Limits helpers ───────────────────────────────────────────────────────
  function updateLimitPoint(sub: LimitsSubTab, idx: number, field: 'x' | 'y', val: number) {
    setLimitPoints((prev) => ({
      ...prev,
      [sub]: prev[sub].map((p, i) => (i === idx ? { ...p, [field]: val } : p)),
    }));
  }

  function addLimitPoint(sub: LimitsSubTab) {
    setLimitPoints((prev) => {
      const pts = prev[sub];
      const secondLast = pts[pts.length - 2];
      const last = pts[pts.length - 1];
      const newX = (secondLast.x + last.x) / 2;
      const newY = (secondLast.y + last.y) / 2;
      const next = [...pts.slice(0, pts.length - 1), { x: newX, y: newY }, last];
      return { ...prev, [sub]: next };
    });
  }

  function deleteLimitPoint(sub: LimitsSubTab, idx: number) {
    setLimitPoints((prev) => ({
      ...prev,
      [sub]: prev[sub].filter((_, i) => i !== idx),
    }));
  }

  // ── Fatigue profile helpers ──────────────────────────────────────────────
  function toggleFatigueProfile(profileId: string) {
    setFatigueProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, open: !p.open } : p))
    );
  }

  function addFatigueProfile() {
    setFatigueProfiles((prev) => [
      ...prev,
      { id: makeId(), name: 'New fatigue profile', open: true, cases: [] },
    ]);
  }

  function deleteFatigueProfile(profileId: string) {
    setFatigueProfiles((prev) => prev.filter((p) => p.id !== profileId));
  }

  function duplicateFatigueProfile(profileId: string) {
    setFatigueProfiles((prev) => {
      const profile = prev.find((p) => p.id === profileId);
      if (!profile) return prev;
      const clone: FatigueProfile = {
        ...profile,
        id: makeId(),
        name: `${profile.name} (copy)`,
        cases: profile.cases.map((c) => ({ ...c, id: makeId() })),
      };
      return [...prev, clone];
    });
  }

  function updateFatigueProfileName(profileId: string, newName: string) {
    setFatigueProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, name: newName } : p))
    );
  }

  function addFatigueCase(profileId: string) {
    setFatigueProfiles((prev) =>
      prev.map((p) => {
        if (p.id !== profileId) return p;
        const fc: FatigueCase = {
          id: makeId(),
          name: '',
          loadCase: '',
          minScale: 0,
          maxScale: 100,
          time: null,
          cycles: null,
        };
        return { ...p, cases: [...p.cases, fc] };
      })
    );
  }

  function deleteFatigueCase(profileId: string, caseId: string) {
    setFatigueProfiles((prev) =>
      prev.map((p) =>
        p.id === profileId ? { ...p, cases: p.cases.filter((c) => c.id !== caseId) } : p
      )
    );
  }

  function updateFatigueCase<K extends keyof FatigueCase>(
    profileId: string,
    caseId: string,
    field: K,
    val: FatigueCase[K]
  ) {
    setFatigueProfiles((prev) =>
      prev.map((p) =>
        p.id !== profileId
          ? p
          : {
              ...p,
              cases: p.cases.map((c) => (c.id === caseId ? { ...c, [field]: val } : c)),
            }
      )
    );
  }

  // ── Tab trigger class ─────────────────────────────────────────────────────
  const triggerCls =
    'h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]';

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#f8fafc]">
      <MainNav />

      {/* Sub-toolbar */}
      <div className="relative flex h-[52px] w-full shrink-0 items-center justify-between bg-[#f8fafc] px-4 py-2">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as Tab)}
          className="h-9 shrink-0"
        >
          <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
            <TabsTrigger value="general" className={triggerCls}>
              General
            </TabsTrigger>
            <TabsTrigger value="load-cases" className={triggerCls}>
              Load cases
            </TabsTrigger>
            <TabsTrigger value="limits" className={triggerCls}>
              Limits
            </TabsTrigger>
            <TabsTrigger value="fatigue-profiles" className={triggerCls}>
              Fatigue profiles
            </TabsTrigger>
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
            Back to Load groups
          </button>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden px-4 pb-6 pt-4">
        <div>

          {/* ── GENERAL TAB ─────────────────────────────────────────────── */}
          {activeTab === 'general' && (
            <div className={isNew ? 'relative min-h-[500px]' : ''}>
              {/* Form card — relative z-10 so it floats above the absolute explainer */}
              <div className={`flex flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] ${isNew ? 'relative z-10 w-full max-w-[468px]' : 'w-full max-w-[468px]'}`}>
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="load-group-name"
                    className="text-[14px] font-medium leading-none text-[#0a0a0a]"
                  >
                    Name <span className="text-[#dc2626]">*</span>
                  </Label>
                  <Input
                    id="load-group-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name the load group"
                    className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="load-group-description"
                    className="text-[14px] font-medium leading-none text-[#0a0a0a]"
                  >
                    Description <span className="text-[#dc2626]">*</span>
                  </Label>
                  <Textarea
                    id="load-group-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the load group"
                    rows={4}
                    className="rounded-md border-[#e2e8f0] px-3 py-2 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                  />
                </div>
              </div>

              {/* Canvas explainer — absolute overlay, centered across full page width */}
              {isNew && (
                <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-1">
                  <div className="pointer-events-auto flex w-[500px] flex-col gap-5">
                  {/* Description text */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#6b7280]" strokeWidth={2} />
                      <p className="text-[14px] leading-6 text-[#374151]">
                        A load group is a collection of one or several load cases which can be used to form fatigue cases and fatigue profiles.
                      </p>
                    </div>
                    <p className="ml-6 text-[14px] leading-5 text-[#737373]">
                      Fatigue profiles are only required for fatigue simulation.
                    </p>
                  </div>

                  {/* Structure diagram — hugs content, centered within the 500px column */}
                  <div className="mx-auto w-fit rounded-[16px] border border-[#e5e7eb] bg-[#f9fafb] p-5">
                    <div className="flex flex-col gap-4">
                      <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]">
                        Load Group
                      </p>
                      <div className="flex items-start gap-5">
                        {/* Load cases column */}
                        <div className="flex flex-col gap-1.5">
                          {['Load case 1', 'Load case 2', 'Load case 3', 'Load case 4', 'Load case 5', 'Load case 6', 'Load case 7'].map((lc) => (
                            <div
                              key={lc}
                              className="whitespace-nowrap rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] text-[#374151]"
                            >
                              {lc}
                            </div>
                          ))}
                        </div>

                        {/* Fatigue profiles column */}
                        <div className="flex flex-col gap-2.5">
                          {[
                            {
                              name: 'Fatigue profile 1',
                              cases: [
                                { lc: 'Load case 1', fc: 'Fatigue case 1' },
                                { lc: 'Load case 2', fc: 'Fatigue case 2' },
                              ],
                            },
                            {
                              name: 'Fatigue profile 2',
                              cases: [
                                { lc: 'Load case 1', fc: 'Fatigue case 1' },
                                { lc: 'Load case 1', fc: 'Fatigue case 2' },
                                { lc: 'Load case 6', fc: 'Fatigue case 3' },
                              ],
                            },
                          ].map((profile) => (
                            <div
                              key={profile.name}
                              className="rounded-[10px] border border-[#e5e7eb] bg-white p-3"
                            >
                              <p className="mb-2 whitespace-nowrap text-[12px] font-semibold text-[#0a0a0a]">
                                {profile.name}
                              </p>
                              <div className="flex flex-col gap-1.5">
                                {profile.cases.map((c, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="whitespace-nowrap rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] text-[#374151]">
                                      {c.lc}
                                    </span>
                                    <span className="text-[11px] text-[#6b7280]">→</span>
                                    <span className="whitespace-nowrap rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] text-[#374151]">
                                      {c.fc}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── LOAD CASES TAB ──────────────────────────────────────────── */}
          {activeTab === 'load-cases' && (
            <div className="flex flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
              {/* Table */}
              <div className="overflow-x-auto rounded-md border border-[#e5e7eb]">
                <table className="w-full border-collapse text-[13px]" style={{ minWidth: 1100 }}>
                  <thead>
                    <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Name</th>
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Pitch flag</th>
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Pitch min [°]</th>
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Pitch max [°]</th>
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">RPM flag</th>
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">RPM min</th>
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">RPM max</th>
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Altitude [m]</th>
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Disa [°C]</th>
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                        Inflow vel. [m/s]
                      </th>
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                        Inflow angle [°]
                      </th>
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Target type</th>
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Target value</th>
                      <th className="h-10 w-[72px] px-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {loadCases.map((lc) => (
                      <tr key={lc.id} className="group border-b border-[#e5e7eb] last:border-b-0">
                        <td className="px-2 py-1.5">
                          <Input
                            value={lc.name}
                            onChange={(e) => updateLoadCase(lc.id, 'name', e.target.value)}
                            placeholder="Placeholder"
                            className="h-8 min-w-[160px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <SelectInline
                            value={lc.pitchFlag}
                            onChange={(v) =>
                              updateLoadCase(lc.id, 'pitchFlag', v as PitchRpmFlag)
                            }
                            options={['Range', 'Fixed']}
                            className="w-[80px]"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            value={lc.pitchMin}
                            onChange={(e) =>
                              updateLoadCase(lc.id, 'pitchMin', parseFloat(e.target.value) || 0)
                            }
                            className="h-8 w-[70px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          {(() => {
                            const isFixed = lc.pitchFlag === 'Fixed';
                            const hasError = isFixed && lc.pitchMax !== 0;
                            return (
                              <div className="group/pitchmax relative">
                                <Input
                                  type="number"
                                  value={lc.pitchMax}
                                  onChange={(e) =>
                                    updateLoadCase(lc.id, 'pitchMax', parseFloat(e.target.value) || 0)
                                  }
                                  disabled={isFixed && !hasError}
                                  className={`h-8 w-[70px] rounded-md px-2 text-[13px] disabled:cursor-not-allowed ${
                                    hasError
                                      ? 'border-[#dc2626] !opacity-100 disabled:bg-[#fff5f5]'
                                      : 'border-[#e2e8f0] disabled:bg-[#f8fafc] disabled:opacity-50'
                                  }`}
                                />
                                {hasError && (
                                  <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[11px] leading-none text-white opacity-0 shadow-sm transition-opacity group-hover/pitchmax:opacity-100">
                                    Maximum value is not allowed in fixed mode
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-2 py-1.5">
                          <SelectInline
                            value={lc.rpmFlag}
                            onChange={(v) => updateLoadCase(lc.id, 'rpmFlag', v as PitchRpmFlag)}
                            options={['Range', 'Fixed']}
                            className="w-[80px]"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            value={lc.rpmMin}
                            onChange={(e) =>
                              updateLoadCase(lc.id, 'rpmMin', parseFloat(e.target.value) || 0)
                            }
                            className="h-8 w-[70px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          {(() => {
                            const isFixed = lc.rpmFlag === 'Fixed';
                            const hasError = isFixed && lc.rpmMax !== 0;
                            return (
                              <div className="group/rpmmax relative">
                                <Input
                                  type="number"
                                  value={lc.rpmMax}
                                  onChange={(e) =>
                                    updateLoadCase(lc.id, 'rpmMax', parseFloat(e.target.value) || 0)
                                  }
                                  disabled={isFixed && !hasError}
                                  className={`h-8 w-[70px] rounded-md px-2 text-[13px] disabled:cursor-not-allowed ${
                                    hasError
                                      ? 'border-[#dc2626] !opacity-100 disabled:bg-[#fff5f5]'
                                      : 'border-[#e2e8f0] disabled:bg-[#f8fafc] disabled:opacity-50'
                                  }`}
                                />
                                {hasError && (
                                  <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[11px] leading-none text-white opacity-0 shadow-sm transition-opacity group-hover/rpmmax:opacity-100">
                                    Maximum value is not allowed in fixed mode
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            value={lc.altitude}
                            onChange={(e) =>
                              updateLoadCase(lc.id, 'altitude', parseFloat(e.target.value) || 0)
                            }
                            className="h-8 w-[72px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            value={lc.disa}
                            onChange={(e) =>
                              updateLoadCase(lc.id, 'disa', parseFloat(e.target.value) || 0)
                            }
                            className="h-8 w-[68px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            value={lc.inflowVelocity}
                            onChange={(e) =>
                              updateLoadCase(
                                lc.id,
                                'inflowVelocity',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-8 w-[76px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            value={lc.inflowAngle}
                            onChange={(e) =>
                              updateLoadCase(
                                lc.id,
                                'inflowAngle',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-8 w-[72px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <SelectInline
                            value={lc.targetType}
                            onChange={(v) =>
                              updateLoadCase(lc.id, 'targetType', v as TargetType)
                            }
                            options={['torque', 'thrust', 'power']}
                            className="w-[86px]"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={lc.targetValue}
                              onChange={(e) =>
                                updateLoadCase(
                                  lc.id,
                                  'targetValue',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-8 w-[80px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                            />
                            <span className="text-[11px] text-[#6b7280]">
                              {lc.targetType === 'power' ? 'kW' : lc.targetType === 'torque' ? 'Nm' : 'N'}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => duplicateLoadCase(lc.id)}
                              aria-label="Duplicate load case"
                              className="flex h-7 w-7 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
                            >
                              <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteLoadCase(lc.id)}
                              aria-label="Delete load case"
                              className="flex h-7 w-7 items-center justify-center rounded text-[#6b7280] hover:bg-[#fee2e2] hover:text-[#dc2626]"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {loadCases.length === 0 && (
                      <tr>
                        <td colSpan={14} className="py-8 text-center text-[14px] text-[#6b7280]">
                          No load cases yet. Click "Add load case" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addLoadCase}
                className="inline-flex h-9 w-fit items-center gap-2 rounded-md bg-[#006496] px-4 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580]"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Add load case
              </button>
            </div>
          )}

          {/* ── LIMITS TAB ──────────────────────────────────────────────── */}
          {activeTab === 'limits' && (
            <div className="flex w-fit flex-col rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
              {/* Info banner + Sub-tabs header */}
              <div className="flex flex-col gap-6 p-6 pb-4">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#6b7280]" strokeWidth={2} />
                  <p className="max-w-[560px] text-[13px] font-normal leading-5 text-[#6b7280]">
                    Define the maximum allowable aerodynamic and mechanical loads as a function of rotor speed. These limits constrain the simulation envelope for all load cases in this group.
                  </p>
                </div>
                <Tabs
                  value={limitsSubTab}
                  onValueChange={(v) => setLimitsSubTab(v as LimitsSubTab)}
                >
                  <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
                    {(['thrust', 'torque', 'power'] as const).map((sub) => (
                      <TabsTrigger key={sub} value={sub} className={triggerCls}>
                        {sub.charAt(0).toUpperCase() + sub.slice(1)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {/* BezierEditor + Table side by side */}
              <div className="px-6 pb-6">
                <div className="grid grid-cols-[minmax(480px,1fr)_260px] gap-6">
                  {/* Interactive Bezier chart */}
                  <div className="flex flex-col gap-3">
                    <BezierEditor
                      points={limitPoints[limitsSubTab]}
                      onChange={(next) =>
                        setLimitPoints((prev) => ({ ...prev, [limitsSubTab]: next }))
                      }
                      xMin={0}
                      xMax={20}
                      xStep={5}
                      yMin={0}
                      yMax={LIMITS_Y_MAX[limitsSubTab]}
                      yStep={LIMITS_Y_STEP[limitsSubTab]}
                      yUnit={LIMITS_UNITS[limitsSubTab]}
                    />
                  </div>

                  {/* Precise editing table */}
                  <div className="flex flex-col gap-3">
                    <div className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
                      <table className="w-full border-collapse text-[13px]">
                        <thead>
                          <tr className="border-b border-[#e5e7eb]">
                            <th className="h-10 w-8 px-2 text-left font-medium text-[#6b7280]">#</th>
                            <th className="h-10 px-3 text-left font-medium text-[#6b7280]">RPM</th>
                            <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                              {LIMITS_UNITS[limitsSubTab]}
                            </th>
                            <th className="h-10 w-8 px-1" />
                          </tr>
                        </thead>
                        <tbody>
                          {limitPoints[limitsSubTab].map((pt, idx) => {
                            const isEndpoint =
                              idx === 0 || idx === limitPoints[limitsSubTab].length - 1;
                            return (
                              <tr
                                key={idx}
                                className="group border-b border-[#e5e7eb] last:border-b-0"
                              >
                                <td className="px-2 py-2 text-[#6b7280]">{idx}</td>
                                <td className="px-2 py-2">
                                  <BufferedNumberInput
                                    step="0.1"
                                    min={0}
                                    max={20}
                                    value={pt.x}
                                    format={(v) => v.toFixed(2)}
                                    disabled={isEndpoint}
                                    onCommit={(v) => updateLimitPoint(limitsSubTab, idx, 'x', v)}
                                    className="h-8 w-full rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:bg-[#f8fafc] disabled:text-[#6b7280]"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <BufferedNumberInput
                                    step="1"
                                    min={0}
                                    max={LIMITS_Y_MAX[limitsSubTab]}
                                    value={pt.y}
                                    format={(v) => v.toFixed(0)}
                                    onCommit={(v) => updateLimitPoint(limitsSubTab, idx, 'y', v)}
                                    className="h-8 w-full rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                                  />
                                </td>
                                <td className="px-1 py-2">
                                  {!isEndpoint && (
                                    <button
                                      type="button"
                                      onClick={() => deleteLimitPoint(limitsSubTab, idx)}
                                      aria-label="Delete point"
                                      className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] opacity-0 hover:bg-[#fee2e2] hover:text-[#dc2626] group-hover:opacity-100"
                                    >
                                      <Trash2 className="h-3 w-3" strokeWidth={2} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <button
                        type="button"
                        onClick={() => addLimitPoint(limitsSubTab)}
                        className="flex w-full items-center justify-center gap-1.5 border-t border-[#e5e7eb] py-2 text-[13px] font-medium text-[#006496] hover:bg-[#f0f9ff]"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Add point
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── FATIGUE PROFILES TAB ─────────────────────────────────────── */}
          {activeTab === 'fatigue-profiles' && (
            <div className="flex w-full flex-col gap-0 rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
              {/* Panel header */}
              <div className="flex items-center justify-between gap-4 border-b border-[#e5e7eb] px-6 py-4">
                <h3 className="text-[16px] font-semibold text-[#0a0a0a]">Fatigue profiles</h3>
                <div className="flex items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
                    <Input
                      value={fatigueSearch}
                      onChange={(e) => setFatigueSearch(e.target.value)}
                      placeholder="Search"
                      className="h-8 w-[180px] rounded-md border-[#e2e8f0] pl-8 text-[13px]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addFatigueProfile}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#006496] px-3 text-[13px] font-medium text-[#fafafa] hover:bg-[#005580]"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Add fatigue profile
                  </button>
                </div>
              </div>

              {/* Profile list header */}
              <div className="border-b border-[#e5e7eb] px-6 py-2">
                <span className="text-[13px] font-medium text-[#6b7280]">Name ↑</span>
              </div>

              {/* Profiles accordion */}
              <div className="flex flex-col">
                {fatigueProfiles
                  .filter(
                    (p) =>
                      !fatigueSearch.trim() ||
                      p.name.toLowerCase().includes(fatigueSearch.toLowerCase())
                  )
                  .map((profile) => (
                    <div key={profile.id} className="border-b border-[#e5e7eb] last:border-b-0">
                      {/* Profile accordion header */}
                      <div
                        className={`flex items-center gap-2 px-6 py-3 ${profile.open ? 'bg-[#f4f4f5]' : 'hover:bg-[#f9fafb]'}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleFatigueProfile(profile.id)}
                          className="flex flex-1 items-center gap-2 text-left"
                        >
                          {profile.open ? (
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
                            {profile.name}
                          </span>
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => duplicateFatigueProfile(profile.id)}
                            aria-label="Duplicate profile"
                            className="flex h-7 w-7 items-center justify-center rounded text-[#6b7280] hover:bg-[#e5e7eb] hover:text-[#0a0a0a]"
                          >
                            <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFatigueProfile(profile.id)}
                            aria-label="Delete profile"
                            className="flex h-7 w-7 items-center justify-center rounded text-[#6b7280] hover:bg-[#fee2e2] hover:text-[#dc2626]"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {profile.open && (
                        <div className="border-t border-[#e5e7eb] px-6 py-4">
                          {/* Profile name editable */}
                          <div className="mb-4 flex items-center gap-2">
                            <Label className="text-[13px] font-medium text-[#6b7280]">
                              Profile name
                            </Label>
                            <Input
                              value={profile.name}
                              onChange={(e) =>
                                updateFatigueProfileName(profile.id, e.target.value)
                              }
                              className="h-8 max-w-[240px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                            />
                          </div>

                          {/* Sub-table */}
                          <TooltipProvider>
                          <div className="overflow-hidden rounded-md border border-[#e5e7eb]">
                            <table className="w-full border-collapse text-[13px]">
                              <thead>
                                <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                                  <th className="h-9 w-8 px-2" />
                                  <th className="h-9 px-3 text-left font-medium text-[#6b7280]">
                                    Name
                                  </th>
                                  <th className="h-9 px-3 text-left font-medium text-[#6b7280]">
                                    Load case
                                  </th>
                                  <th className="h-9 w-[138px] px-3 text-left font-medium text-[#6b7280]">
                                    <div className="flex items-center gap-1 whitespace-nowrap">
                                      Min scale (%)
                                      <Tooltip content="The lower bound of the load scaling factor. The simulation applies at least this percentage of the referenced load case's loads." side="top">
                                        <Info className="h-3.5 w-3.5 shrink-0 cursor-default text-[#9ca3af]" strokeWidth={2} />
                                      </Tooltip>
                                    </div>
                                  </th>
                                  <th className="h-9 w-[138px] px-3 text-left font-medium text-[#6b7280]">
                                    <div className="flex items-center gap-1 whitespace-nowrap">
                                      Max scale (%)
                                      <Tooltip content="The upper bound of the load scaling factor. The simulation will not exceed this percentage of the referenced load case's loads." side="top">
                                        <Info className="h-3.5 w-3.5 shrink-0 cursor-default text-[#9ca3af]" strokeWidth={2} />
                                      </Tooltip>
                                    </div>
                                  </th>
                                  <th className="h-9 w-[114px] whitespace-nowrap px-3 text-left font-medium text-[#6b7280]">
                                    Time [sec]
                                  </th>
                                  <th className="h-9 w-[114px] whitespace-nowrap px-3 text-left font-medium text-[#6b7280]">
                                    Cycles
                                  </th>
                                  <th className="h-9 w-8 px-1" />
                                </tr>
                              </thead>
                              <tbody>
                                {profile.cases.map((fc) => (
                                  <tr
                                    key={fc.id}
                                    className="group border-b border-[#e5e7eb] last:border-b-0"
                                  >
                                    <td className="px-2 py-1.5 text-[#d1d5db]">
                                      <GripVertical className="h-4 w-4" strokeWidth={1.5} />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <Input
                                        value={fc.name}
                                        onChange={(e) =>
                                          updateFatigueCase(
                                            profile.id,
                                            fc.id,
                                            'name',
                                            e.target.value
                                          )
                                        }
                                        placeholder="Placeholder"
                                        className="h-8 min-w-[140px] rounded border-[#e2e8f0] px-2 text-[13px]"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPickingLoadCase({
                                            profileId: profile.id,
                                            caseId: fc.id,
                                          })
                                        }
                                        className="flex h-8 w-full items-center justify-between gap-1 rounded border border-[#e2e8f0] bg-white px-2 text-[13px] hover:bg-[#f9fafb]"
                                      >
                                        <span
                                          className={`truncate text-left ${fc.loadCase ? 'text-[#0a0a0a]' : 'text-[#9ca3af]'}`}
                                        >
                                          {fc.loadCase || 'Select'}
                                        </span>
                                        <ChevronRight
                                          className="h-3.5 w-3.5 shrink-0 text-[#6b7280]"
                                          strokeWidth={2}
                                        />
                                      </button>
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <Input
                                        type="number"
                                        value={fc.minScale}
                                        onChange={(e) =>
                                          updateFatigueCase(
                                            profile.id,
                                            fc.id,
                                            'minScale',
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        className="h-8 w-full rounded border-[#e2e8f0] px-2 text-[13px]"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <Input
                                        type="number"
                                        value={fc.maxScale}
                                        onChange={(e) =>
                                          updateFatigueCase(
                                            profile.id,
                                            fc.id,
                                            'maxScale',
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        className="h-8 w-full rounded border-[#e2e8f0] px-2 text-[13px]"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <div className="group/timetip relative">
                                        <Input
                                          type="number"
                                          value={fc.time ?? ''}
                                          onChange={(e) => {
                                            const raw = e.target.value;
                                            updateFatigueCase(
                                              profile.id,
                                              fc.id,
                                              'time',
                                              raw === '' ? null : (parseFloat(raw) || 0)
                                            );
                                          }}
                                          disabled={fc.cycles !== null}
                                          className="h-8 w-full rounded border-[#e2e8f0] px-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                        {fc.cycles !== null && (
                                          <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[11px] leading-none text-white opacity-0 shadow-sm transition-opacity group-hover/timetip:opacity-100">
                                            Clear the &lsquo;Cycles&rsquo; field to add time
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <div className="group/cyclestip relative">
                                        <Input
                                          type="number"
                                          value={fc.cycles ?? ''}
                                          onChange={(e) => {
                                            const raw = e.target.value;
                                            updateFatigueCase(
                                              profile.id,
                                              fc.id,
                                              'cycles',
                                              raw === '' ? null : (parseFloat(raw) || 0)
                                            );
                                          }}
                                          disabled={fc.time !== null}
                                          className="h-8 w-full rounded border-[#e2e8f0] px-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                        {fc.time !== null && (
                                          <span className="pointer-events-none absolute bottom-full right-0 z-50 mb-1.5 whitespace-nowrap rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[11px] leading-none text-white opacity-0 shadow-sm transition-opacity group-hover/cyclestip:opacity-100">
                                            Clear the &lsquo;Time&rsquo; field to add number of Cycles
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-1 py-1.5">
                                      <button
                                        type="button"
                                        onClick={() => deleteFatigueCase(profile.id, fc.id)}
                                        aria-label="Delete fatigue case"
                                        className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] opacity-0 hover:bg-[#fee2e2] hover:text-[#dc2626] group-hover:opacity-100"
                                      >
                                        <Trash2 className="h-3 w-3" strokeWidth={2} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {profile.cases.length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={8}
                                      className="py-6 text-center text-[13px] text-[#6b7280]"
                                    >
                                      No fatigue cases. Click "+ Add fatigue case".
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                            {/* Add fatigue case — same pattern as other tables */}
                            <button
                              type="button"
                              onClick={() => addFatigueCase(profile.id)}
                              className="flex w-full items-center justify-center gap-1.5 border-t border-[#e5e7eb] py-2 text-[13px] font-medium text-[#006496] hover:bg-[#f0f9ff]"
                            >
                              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                              Add fatigue case
                            </button>
                          </div>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  ))}

                {fatigueProfiles.length === 0 && (
                  <div className="py-12 text-center text-[14px] text-[#6b7280]">
                    No fatigue profiles yet. Click "Add fatigue profile".
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <LoadCasePickerDialog
        open={pickingLoadCase !== null}
        loadCaseNames={loadCases.map((lc) => lc.name)}
        current={
          pickingLoadCase
            ? (fatigueProfiles
                .find((p) => p.id === pickingLoadCase.profileId)
                ?.cases.find((c) => c.id === pickingLoadCase.caseId)?.loadCase ?? '')
            : ''
        }
        onSelect={(name) => {
          if (pickingLoadCase) {
            updateFatigueCase(pickingLoadCase.profileId, pickingLoadCase.caseId, 'loadCase', name);
          }
        }}
        onClose={() => setPickingLoadCase(null)}
      />
    </div>
  );
}
