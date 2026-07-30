import { useState } from 'react';
import { FoldHorizontal } from 'lucide-react';
import { BezierEditor } from '@/components/common/viewer/BezierEditor';
import { BezierPointsTable } from '@/components/common/viewer/BezierPointsTable';
import type { ControlPoint } from '@/types';
import { SectionTabs } from '@/components/geometry/SectionTabs';
import { FoldableSectionList } from '@/components/geometry/FoldableSectionList';
import { useEditableSectionPoints } from '@/hooks/useEditableSectionPoints';
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

const INITIAL_SECTION_POINTS: Record<SectionKey, ControlPoint[]> = {
  sweep: [
    { x: 0, y: 0 },
    { x: 0.2, y: 0.1 },
    { x: 0.6278, y: 0.24688 },
    { x: 1, y: -0.13466 },
  ],
  dihedral: [
    { x: 0, y: 0 },
    { x: 0.3, y: 0.05 },
    { x: 0.7, y: 0.18 },
    { x: 1, y: 0.05 },
  ],
  twist: [
    { x: 0, y: 14.0 },
    { x: 0.25, y: 10.5 },
    { x: 0.65, y: 3.2 },
    { x: 1, y: 0.0 },
  ],
  chord: [
    { x: 0, y: 1.8 },
    { x: 0.28, y: 4.6 },
    { x: 0.65, y: 2.8 },
    { x: 1, y: 0.9 },
  ],
};

interface StackingPanelProps {
  folded: boolean;
  onFoldToggle: () => void;
  /** Prefill from the backend (GET /geometry/:id/edges/) instead of the mock defaults. */
  initialEdges?: GeometryEdge[];
  /** PUT /geometry/:id/edges/ — persist the current sweep/dihedral/twist/chord curves. */
  onSave?: (edges: GeometryEdgeInput[]) => void;
  saving?: boolean;
  saveError?: boolean;
}

function edgeMap(initialEdges?: GeometryEdge[]): Map<string, GeometryEdge> {
  return new Map((initialEdges ?? []).map((e) => [e.edge_type, e]));
}

export function StackingPanel({ folded, onFoldToggle, initialEdges, onSave, saving, saveError }: StackingPanelProps) {
  const [subTab, setSubTab] = useState<SectionKey>('sweep');
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    sweep: true,
    dihedral: true,
    twist: true,
    chord: true,
  });

  // Y-axis bounds come from the backend edge when available, falling back to
  // the mock defaults — captured once at mount, same as the initial points.
  const [yBounds] = useState<Record<SectionKey, { min: number; max: number }>>(() => {
    const map = edgeMap(initialEdges);
    return {
      sweep: { min: map.get('sweep')?.ymin ?? SECTION_Y_MIN.sweep, max: map.get('sweep')?.ymax ?? SECTION_Y_MAX.sweep },
      dihedral: { min: map.get('dihedral')?.ymin ?? SECTION_Y_MIN.dihedral, max: map.get('dihedral')?.ymax ?? SECTION_Y_MAX.dihedral },
      twist: { min: map.get('twist')?.ymin ?? SECTION_Y_MIN.twist, max: map.get('twist')?.ymax ?? SECTION_Y_MAX.twist },
      chord: { min: map.get('chord')?.ymin ?? SECTION_Y_MIN.chord, max: map.get('chord')?.ymax ?? SECTION_Y_MAX.chord },
    };
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
    5
  );

  function toggleSection(key: SectionKey) {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));
  }

  function buildEdges(): GeometryEdgeInput[] {
    return SECTION_KEYS.map((key) => ({
      edge_type: key,
      curve_type: 'bezier',
      ymin: yBounds[key].min,
      ymax: yBounds[key].max,
      curve: sectionPoints[key],
    }));
  }

  function renderSectionBody(key: SectionKey) {
    const points = sectionPoints[key];
    return (
      <div
        className={
          folded
            ? 'flex flex-col gap-4'
            : 'grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,384px)]'
        }
      >
        <BezierEditor
          points={points}
          onChange={(next) => setPointsForSection(key, next)}
          yMin={yBounds[key].min}
          yMax={yBounds[key].max}
          yStep={SECTION_Y_STEP[key]}
          rootX={0.05}
        />
        <BezierPointsTable
          points={points}
          valueLabel={SECTION_TABLE_HEADING[key]}
          idPrefix={key}
          getInputValue={(idx, field) => getInputValue(key, idx, field)}
          onChange={(idx, field, raw) => handleInputChange(key, idx, field, raw)}
          onBlur={(idx, field) => handleInputBlur(key, idx, field)}
          onAddPoint={() => addPoint(key)}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex w-full ${folded ? 'max-w-[516px]' : 'max-w-[924px]'} max-h-[calc(100vh-128px)] flex-col rounded-[14px] border border-[#e5e7eb] bg-white/95 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-[max-width] duration-150`}
    >
      {/* Header: sub-tabs (expanded mode) + save + toggle button */}
      <div className="flex flex-col gap-2 p-6 pb-4">
        <div className="flex items-center justify-between gap-4">
          {!folded ? (
            <SectionTabs
              sectionKeys={SECTION_KEYS}
              sectionLabels={SECTION_LABELS}
              value={subTab}
              onValueChange={setSubTab}
            />
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            {onSave && (
              <button
                type="button"
                onClick={() => onSave(buildEdges())}
                disabled={saving}
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-3 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
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
        {saveError && <p className="text-[13px] text-[#dc2626]">Failed to save. Please try again.</p>}
      </div>

      <FoldableSectionList
        folded={folded}
        sectionKeys={SECTION_KEYS}
        sectionLabels={SECTION_LABELS}
        openSections={openSections}
        onToggleSection={toggleSection}
        activeTab={subTab}
        renderSectionBody={renderSectionBody}
      />
    </div>
  );
}
