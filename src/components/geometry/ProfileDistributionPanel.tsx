import { useState } from 'react';
import { ChevronDown, ChevronUp, FoldHorizontal, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BezierEditor } from '@/components/common/viewer/BezierEditor';
import { BezierPointsTable } from '@/components/common/viewer/BezierPointsTable';
import type { ControlPoint } from '@/types';
import { DropdownSelect } from '@/components/common/form/DropdownSelect';
import { ProfileDistributionSwitch } from '@/components/geometry/ProfileDistributionSwitch';
import { useEditableSectionPoints } from '@/hooks/useEditableSectionPoints';

const PROFILE_TYPES = ['NACA 4 digit', 'NACA 5 digit', 'Custom airfoil'];

type SectionKey = 'maximum-camber' | 'maximum-camber-position' | 'thickness';

const SECTION_KEYS: SectionKey[] = [
  'maximum-camber',
  'maximum-camber-position',
  'thickness',
];

const SECTION_LABELS: Record<SectionKey, string> = {
  'maximum-camber': 'Maximum camber',
  'maximum-camber-position': 'Maximum camber position',
  thickness: 'Thickness (TMC)',
};

// Initial control points for each curve.
// (x in 0..1 = relative radius, y in 0..yMax = camber/position/thickness %)
const INITIAL_SECTION_POINTS: Record<SectionKey, ControlPoint[]> = {
  'maximum-camber': [
    { x: 0, y: 0 },
    { x: 0.4186, y: 23.7654 },
    { x: 0.91, y: 22.13445 },
    { x: 1, y: 5.7 },
  ],
  'maximum-camber-position': [
    { x: 0, y: 0 },
    { x: 0.35, y: 12 },
    { x: 0.7, y: 18 },
    { x: 1, y: 8 },
  ],
  thickness: [
    { x: 0, y: 5 },
    { x: 0.3, y: 22 },
    { x: 0.7, y: 18 },
    { x: 1, y: 3 },
  ],
};

/** Y axis upper bound for the camber chart. */
const Y_MAX = 24;

interface ProfileDistributionPanelProps {
  /** Whether the panel is folded (all 3 sections stacked vertically, no sub-tabs).
   *  Lifted to the parent so the surrounding `<aside>` can shrink in width. */
  folded: boolean;
  onFoldToggle: () => void;
}

export function ProfileDistributionPanel({
  folded,
  onFoldToggle,
}: ProfileDistributionPanelProps) {
  const [type, setType] = useState('NACA 4 digit');
  const [startPos, setStartPos] = useState('0.05');
  const [endPos, setEndPos] = useState('1');
  const [profileCount, setProfileCount] = useState('6');
  const [subTab, setSubTab] = useState<SectionKey>('maximum-camber');
  // Per-section: in folded mode all three sections render their own switch,
  // so a shared boolean would flip all of them at once.
  const [showDistribution, setShowDistribution] = useState<Record<SectionKey, boolean>>({
    'maximum-camber': true,
    'maximum-camber-position': true,
    thickness: true,
  });
  const [showTable, setShowTable] = useState<Record<SectionKey, boolean>>({
    'maximum-camber': true,
    'maximum-camber-position': true,
    thickness: true,
  });

  // Which folded-mode accordion items are open. By default only the first.
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    'maximum-camber': true,
    'maximum-camber-position': false,
    thickness: false,
  });

  function toggleSection(key: SectionKey) {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));
  }

  const {
    sectionPoints,
    setPointsForSection,
    addPoint,
    getInputValue,
    handleInputChange,
    handleInputBlur,
  } = useEditableSectionPoints(INITIAL_SECTION_POINTS, () => ({ min: 0, max: Y_MAX }), 2);

  // A single section's chart + table BODY (no heading). Heading is rendered
  // by the accordion item in folded mode, and is hidden in expanded mode
  // because sub-tabs already name the section.
  function renderSectionBody(key: SectionKey) {
    const points = sectionPoints[key];
    const valueLabel =
      key === 'maximum-camber'
        ? 'Max Cam (%)'
        : key === 'maximum-camber-position'
          ? 'Max Cam pos (%)'
          : 'Thickness (%)';
    return (
      <div className="flex flex-col gap-4">
        <div
          className={
            folded
              ? 'flex flex-col gap-4'
              : 'grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,384px)]'
          }
        >
          {/* Distribution view */}
          <div className="flex flex-col gap-3">
            <ProfileDistributionSwitch
              checked={showDistribution[key]}
              onChange={(v) => setShowDistribution((s) => ({ ...s, [key]: v }))}
              label="Distribution view"
            />
            {showDistribution[key] && (
              <BezierEditor
                points={points}
                onChange={(next) => setPointsForSection(key, next)}
                yMax={Y_MAX}
                rootX={Number.isFinite(parseFloat(startPos)) ? parseFloat(startPos) : 0.05}
              />
            )}
          </div>

          {/* Table */}
          <div className="flex flex-col gap-3">
            <ProfileDistributionSwitch
              checked={showTable[key]}
              onChange={(v) => setShowTable((s) => ({ ...s, [key]: v }))}
              label="Table"
            />
            {showTable[key] && (
              <BezierPointsTable
                points={points}
                valueLabel={valueLabel}
                idPrefix={key}
                getInputValue={(idx, field) => getInputValue(key, idx, field)}
                onChange={(idx, field, raw) => handleInputChange(key, idx, field, raw)}
                onBlur={(idx, field) => handleInputBlur(key, idx, field)}
                onAddPoint={() => addPoint(key)}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // In folded mode the Type column needs more room than the numeric ones —
  // otherwise dropdown options like "Custom airfoil" get clipped. Expanded
  // mode has plenty of horizontal space, so equal columns are fine.
  const topRowGrid = folded
    ? 'grid grid-cols-[minmax(160px,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-end gap-3'
    : 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-end gap-4';

  return (
    <div
      className={`flex w-full ${folded ? 'max-w-[516px]' : 'max-w-[924px]'} max-h-[calc(100vh-128px)] flex-col rounded-[14px] border border-[#e5e7eb] bg-white/95 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-[max-width] duration-150`}
    >
      {/* Sticky top region: section title + top row + distribution curves title + sub-tabs */}
      <div className="flex flex-col gap-4 p-6 pb-4">
        <div className="flex items-center justify-between">
          <p className="text-[16px] font-semibold leading-none text-[#0a0a0a]">
            Airfoil generation settings
          </p>
          <button
            type="button"
            onClick={onFoldToggle}
            aria-pressed={folded}
            aria-label={folded ? 'Show all sections at once (currently folded)' : 'Show sections one at a time (fold)'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#006496] text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580]"
          >
            <FoldHorizontal className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className={topRowGrid}>
          <div className="flex flex-col gap-2">
            <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">Type</Label>
            <DropdownSelect value={type} onChange={setType} options={PROFILE_TYPES} />
          </div>
          <div className="flex flex-col gap-2">
            <div className="group/tip relative flex items-center gap-1.5">
              <Label
                htmlFor="profile-count"
                className="text-[14px] font-medium leading-none text-[#0a0a0a]"
              >
                Profile count
              </Label>
              <Info className="h-3.5 w-3.5 shrink-0 text-[#6b7280]" strokeWidth={2} />
              <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-[280px] rounded-md bg-[#171717] px-3 py-2 text-[13px] leading-5 text-white opacity-0 shadow-md transition-opacity group-hover/tip:opacity-100">
                Sets the initial number of generated profiles. You can add, delete, or modify individual profiles in the &apos;Profiles&apos; step.
              </div>
            </div>
            <Input
              id="profile-count"
              value={profileCount}
              onChange={(e) => setProfileCount(e.target.value)}
              className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="profile-start-pos"
              className="text-[14px] font-medium leading-none text-[#0a0a0a]"
            >
              Start position
            </Label>
            <Input
              id="profile-start-pos"
              value={startPos}
              onChange={(e) => setStartPos(e.target.value)}
              className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="profile-end-pos"
              className="text-[14px] font-medium leading-none text-[#0a0a0a]"
            >
              End position
            </Label>
            <Input
              id="profile-end-pos"
              value={endPos}
              onChange={(e) => setEndPos(e.target.value)}
              className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
            />
          </div>
        </div>

        <p className="pt-2 text-[16px] font-semibold leading-none text-[#0a0a0a]">
          Distribution curves
        </p>

        {/* Sub-tabs — only when expanded; folded mode stacks all sections instead. */}
        {!folded && (
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
        )}
      </div>

      {/* Scrollable section area */}
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
