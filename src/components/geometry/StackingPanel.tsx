import { useState } from 'react';
import { ChevronDown, ChevronUp, FoldHorizontal } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BezierEditor } from '@/components/common/viewer/BezierEditor';
import { BezierPointsTable } from '@/components/common/viewer/BezierPointsTable';
import type { ControlPoint } from '@/types';
import { useEditableSectionPoints } from '@/hooks/useEditableSectionPoints';

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
}

export function StackingPanel({ folded, onFoldToggle }: StackingPanelProps) {
  const [subTab, setSubTab] = useState<SectionKey>('sweep');
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    sweep: true,
    dihedral: true,
    twist: true,
    chord: true,
  });

  const {
    sectionPoints,
    setPointsForSection,
    addPoint,
    getInputValue,
    handleInputChange,
    handleInputBlur,
  } = useEditableSectionPoints(
    INITIAL_SECTION_POINTS,
    (key) => ({ min: SECTION_Y_MIN[key], max: SECTION_Y_MAX[key] }),
    5
  );

  function toggleSection(key: SectionKey) {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));
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
          yMin={SECTION_Y_MIN[key]}
          yMax={SECTION_Y_MAX[key]}
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
      {/* Header: sub-tabs (expanded mode) + toggle button */}
      <div className="flex items-center justify-between gap-4 p-6 pb-4">
        {!folded ? (
          <Tabs value={subTab} onValueChange={(v) => setSubTab(v as SectionKey)}>
            <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
              {SECTION_KEYS.map((key) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                >
                  {SECTION_LABELS[key]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <div />
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

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        {folded ? (
          <div className="flex flex-col gap-3">
            {SECTION_KEYS.map((key) => {
              const open = openSections[key];
              return (
                <div
                  key={key}
                  className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(key)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[#f9fafb]"
                  >
                    <span className="text-[16px] font-semibold leading-6 text-[#0a0a0a]">
                      {SECTION_LABELS[key]}
                    </span>
                    {open ? (
                      <ChevronUp className="h-4 w-4 text-[#6b7280]" strokeWidth={2} />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#6b7280]" strokeWidth={2} />
                    )}
                  </button>
                  {open && (
                    <div className="border-t border-[#e5e7eb] p-4">{renderSectionBody(key)}</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          renderSectionBody(subTab)
        )}
      </div>
    </div>
  );
}
