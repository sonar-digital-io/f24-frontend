import { useState } from 'react';
import { FoldHorizontal, Loader2 } from 'lucide-react';
import type { ControlPoint, CurveType } from '@/types';
import { SectionTabs } from '@/components/geometry/SectionTabs';
import { FoldablePanelShell } from '@/components/geometry/FoldablePanelShell';
import { StackingSectionBody } from '@/components/geometry/StackingSectionBody';
import { useEditableSectionPoints } from '@/hooks/useEditableSectionPoints';
import { useDeferredCommit } from '@/hooks/useDeferredCommit';
import { clamp } from '@/lib/bezierMath';
import type { GeometryEdge, GeometryEdgeInput } from '@/api/types/geometry';

type SectionKey = 'sweep' | 'dihedral' | 'twist' | 'chord';

const SECTION_KEYS: SectionKey[] = ['sweep', 'dihedral', 'twist', 'chord'];

const SECTION_LABELS: Record<SectionKey, string> = {
  sweep: 'Sweep',
  dihedral: 'Dihedral',
  twist: 'Twist',
  chord: 'Chord',
};

const SECTION_TABLE_HEADING: Record<SectionKey, string> = {
  sweep: 'Sweep (m)',
  dihedral: 'Dihedral (m)',
  twist: 'Twist (°)',
  chord: 'Chord (m)',
};

const SECTION_Y_MIN: Record<SectionKey, number> = {
  sweep: -0.3,
  dihedral: -0.3,
  twist: -5,
  chord: 0,
};

const SECTION_Y_MAX: Record<SectionKey, number> = {
  sweep: 0.3,
  dihedral: 0.3,
  twist: 20,
  chord: 6,
};

const SECTION_Y_STEP: Record<SectionKey, number> = {
  sweep: 0.1,
  dihedral: 0.1,
  twist: 5,
  chord: 1,
};

// Same fallback ProfileDistributionPanel uses before Global properties' root
// radius has loaded.
const DEFAULT_ROOT_X = 0.05;

const INITIAL_SECTION_POINTS: Record<SectionKey, ControlPoint[]> = {
  sweep: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ],
  dihedral: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ],
  twist: [
    { x: 0, y: 10 },
    { x: 1, y: 10 },
  ],
  chord: [
    { x: 0.1, y: 3 },
    { x: 1, y: 3 },
  ],
};

interface StackingPanelProps {
  folded: boolean;
  onFoldToggle: () => void;
  /** Prefill from the backend (GET /geometry/:id/edges/) instead of the mock defaults. */
  initialEdges?: GeometryEdge[];
  /** Global properties' root radius, as a percentage (e.g. "10" for 10%) —
   *  same value as Profile distribution's Start position, as a fraction. */
  rootRadiusPercent?: string;
  /** Autosaves on every field blur and every completed bezier point move/add/remove:
   *  PUT /geometry/:id/edges/ with the current sweep/dihedral/twist/chord curves. */
  onCommit?: (edges: GeometryEdgeInput[]) => void;
  committing?: boolean;
  saveError?: boolean;
  /** Global properties' nominal radius (m) — sweep/dihedral/chord's ymin/ymax
   *  are sent to the backend as a fraction of this; twist (degrees) is not. */
  nominalRadius?: number;
}

function edgeMap(initialEdges?: GeometryEdge[]): Map<string, GeometryEdge> {
  return new Map((initialEdges ?? []).map((e) => [e.edge_type, e]));
}

// Sweep/dihedral/chord are length units (m) — the backend stores their
// ymin/ymax as a fraction of nominal_radius. Twist is degrees, not a length,
// so it's sent/received as-is.
function radiusDivisor(key: SectionKey, nominalRadius?: number): number {
  return key !== 'twist' && nominalRadius ? nominalRadius : 1;
}

export function StackingPanel({ folded, onFoldToggle, initialEdges, rootRadiusPercent, onCommit, committing, saveError, nominalRadius }: StackingPanelProps) {
  const rootXPercent = parseFloat((rootRadiusPercent ?? '').replace(',', '.'));
  const rootX = Number.isFinite(rootXPercent) ? rootXPercent / 100 : DEFAULT_ROOT_X;
  const [subTab, setSubTab] = useState<SectionKey>('sweep');
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    sweep: true,
    dihedral: true,
    twist: true,
    chord: true,
  });

  // Y-axis bounds come from the backend edge when available, falling back to
  // the mock defaults — initial value only, then user-editable below. Backend
  // values are a fraction of nominal_radius (except twist) — scale up to the
  // curve's real units for display.
  const [yBounds, setYBounds] = useState<Record<SectionKey, { min: number; max: number }>>(() => {
    const map = edgeMap(initialEdges);
    function bound(key: SectionKey) {
      const edge = map.get(key);
      if (!edge) return { min: SECTION_Y_MIN[key], max: SECTION_Y_MAX[key] };
      const divisor = radiusDivisor(key, nominalRadius);
      return { min: edge.ymin * divisor, max: edge.ymax * divisor };
    }
    return {
      sweep: bound('sweep'),
      dihedral: bound('dihedral'),
      twist: bound('twist'),
      chord: bound('chord'),
    };
  });

  const [curveType, setCurveType] = useState<Record<SectionKey, CurveType>>(() => {
    const map = edgeMap(initialEdges);
    return {
      sweep: map.get('sweep')?.curve_type ?? 'spline',
      dihedral: map.get('dihedral')?.curve_type ?? 'spline',
      twist: map.get('twist')?.curve_type ?? 'spline',
      chord: map.get('chord')?.curve_type ?? 'spline',
    };
  });

  const requestCommit = useDeferredCommit(() => {
    if (hasEnoughPoints) onCommit?.(buildEdges());
  });

  const {
    sectionPoints,
    setPointsForSection,
    addPoint,
    getInputValue,
    handleInputChange,
    handleInputBlur,
  } = useEditableSectionPoints(
    (() => {
      const map = edgeMap(initialEdges);
      return {
        sweep: map.get('sweep')?.curve ?? INITIAL_SECTION_POINTS.sweep,
        dihedral: map.get('dihedral')?.curve ?? INITIAL_SECTION_POINTS.dihedral,
        twist: map.get('twist')?.curve ?? INITIAL_SECTION_POINTS.twist,
        chord: map.get('chord')?.curve ?? INITIAL_SECTION_POINTS.chord,
      };
    })(),
    (key) => yBounds[key],
    5,
    () => rootX,
    requestCommit
  );

  function handleCurveTypeChange(key: SectionKey, next: CurveType) {
    setCurveType((current) => ({ ...current, [key]: next }));
    requestCommit();
  }

  function toggleSection(key: SectionKey) {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));
  }

  // Text buffer for the Y min/max inputs, mirroring useEditableSectionPoints'
  // editingValues pattern so in-progress text (e.g. a lone "-") isn't clobbered.
  const [boundInputs, setBoundInputs] = useState<Record<string, string>>({});

  function boundInputKey(key: SectionKey, field: 'min' | 'max') {
    return `${key}-${field}`;
  }

  function getBoundInputValue(key: SectionKey, field: 'min' | 'max') {
    const inputKey = boundInputKey(key, field);
    if (boundInputs[inputKey] !== undefined) return boundInputs[inputKey];
    return String(yBounds[key][field]);
  }

  function handleBoundChange(key: SectionKey, field: 'min' | 'max', raw: string) {
    const normalized = raw.replace(',', '.');
    setBoundInputs((v) => ({ ...v, [boundInputKey(key, field)]: normalized }));
    const parsed = parseFloat(normalized);
    if (!Number.isFinite(parsed)) return;
    setYBounds((current) => {
      const next = { ...current[key], [field]: parsed };
      if (next.max <= next.min) return current;
      return { ...current, [key]: next };
    });
  }

  // Clamp existing points into the new bounds only once the value is
  // committed (blur) — clamping on every keystroke flattens the curve
  // against whatever partial number has been typed so far (e.g. "0" while
  // typing "0.6"), permanently losing the original points.
  function handleBoundBlur(key: SectionKey, field: 'min' | 'max') {
    setBoundInputs((v) => {
      const inputKey = boundInputKey(key, field);
      if (v[inputKey] === undefined) return v;
      const next = { ...v };
      delete next[inputKey];
      return next;
    });
    const { min, max } = yBounds[key];
    setPointsForSection(
      key,
      sectionPoints[key].map((p) => ({ ...p, y: clamp(p.y, min, max) }))
    );
    requestCommit();
  }

  function buildEdges(): GeometryEdgeInput[] {
    return SECTION_KEYS.map((key) => {
      const divisor = radiusDivisor(key, nominalRadius);
      return {
        edge_type: key,
        curve_type: curveType[key],
        ymin: yBounds[key].min / divisor,
        ymax: yBounds[key].max / divisor,
        curve: sectionPoints[key],
      };
    });
  }

  // Points can be deleted down to 0 in the chart — block autosaving until every
  // curve has at least the 2 points a bezier curve needs.
  const hasEnoughPoints = SECTION_KEYS.every((key) => sectionPoints[key].length >= 2);

  function renderSectionBody(key: SectionKey) {
    return (
      <StackingSectionBody
        folded={folded}
        sectionKey={key}
        points={sectionPoints[key]}
        onChange={(next) => setPointsForSection(key, next)}
        onCommit={requestCommit}
        curveType={curveType[key]}
        onCurveTypeChange={(next) => handleCurveTypeChange(key, next)}
        yMin={yBounds[key].min}
        yMax={yBounds[key].max}
        yStep={SECTION_Y_STEP[key]}
        rootX={rootX}
        valueLabel={SECTION_TABLE_HEADING[key]}
        getBoundInputValue={(field) => getBoundInputValue(key, field)}
        onBoundChange={(field, raw) => handleBoundChange(key, field, raw)}
        onBoundBlur={(field) => handleBoundBlur(key, field)}
        getInputValue={(idx, field) => getInputValue(key, idx, field)}
        onInputChange={(idx, field, raw) => handleInputChange(key, idx, field, raw)}
        onInputBlur={(idx, field) => handleInputBlur(key, idx, field)}
        onAddPoint={() => addPoint(key)}
        onRemovePoint={(idx) => {
          setPointsForSection(key, sectionPoints[key].filter((_, i) => i !== idx));
          requestCommit();
        }}
      />
    );
  }

  const header = (
    <div className="flex flex-col gap-2 p-6 pb-4">
      <div className="flex items-center justify-between gap-4">
        {!folded ? (
          <SectionTabs sectionKeys={SECTION_KEYS} sectionLabels={SECTION_LABELS} value={subTab} onValueChange={setSubTab} />
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {committing && (
            <div className="flex items-center gap-[6px]">
              <Loader2 className="h-4 w-4 animate-spin text-[#737373]" strokeWidth={2} />
              <span className="text-[14px] leading-5 text-[#737373]">Saving…</span>
            </div>
          )}
          <button
            type="button"
            onClick={onFoldToggle}
            aria-pressed={folded}
            aria-label={folded ? 'Show sections one at a time (expand)' : 'Show all sections as accordion (fold)'}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#006496] text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580]"
          >
            <FoldHorizontal className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
      {!hasEnoughPoints && <p className="text-[13px] text-[#dc2626]">Each curve needs at least 2 points.</p>}
      {saveError && <p className="text-[13px] text-[#dc2626]">Failed to save. Please try again.</p>}
    </div>
  );

  return (
    <FoldablePanelShell
      folded={folded}
      header={header}
      sectionKeys={SECTION_KEYS}
      sectionLabels={SECTION_LABELS}
      openSections={openSections}
      onToggleSection={toggleSection}
      activeTab={subTab}
      renderSectionBody={renderSectionBody}
    />
  );
}
