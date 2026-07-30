import { useState } from 'react';
import { FoldHorizontal, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BezierEditor } from '@/components/common/viewer/BezierEditor';
import { BezierPointsTable } from '@/components/common/viewer/BezierPointsTable';
import type { ControlPoint } from '@/types';
import { DropdownSelect } from '@/components/common/form/DropdownSelect';
import { ProfileDistributionSwitch } from '@/components/geometry/ProfileDistributionSwitch';
import { SectionTabs } from '@/components/geometry/SectionTabs';
import { FoldableSectionList } from '@/components/geometry/FoldableSectionList';
import { useEditableSectionPoints } from '@/hooks/useEditableSectionPoints';
import type { ProfileGeneratorParameters } from '@/api/types/geometry';

// Only NACA 4 digit is supported by the backend right now.
const PROFILE_TYPES = ['NACA 4 digit'];
const API_PROFILE_TYPE = 'naca_4_digit';

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

/** UI section key -> profile-generator parameter reference, per the tools/profile-generator spec. */
const SECTION_TO_REFERENCE: Record<SectionKey, string> = {
  'maximum-camber': 'max_camber',
  'maximum-camber-position': 'max_camber_position',
  thickness: 'max_thickness',
};

// Initial control points for each curve.
// (x in 0..1 = relative radius, y in 0..yMax = camber/position/thickness %)
// The first point's x must match the default Start position below (0.05) — the
// backend rejects a profile-generator payload whose curves start before the
// declared start_position (which itself must be >= the geometry's root/nominal
// radius).
const DEFAULT_START_POSITION = 0.05;

const INITIAL_SECTION_POINTS: Record<SectionKey, ControlPoint[]> = {
  'maximum-camber': [
    { x: DEFAULT_START_POSITION, y: 0 },
    { x: 0.4186, y: 23.7654 },
    { x: 0.91, y: 22.13445 },
    { x: 1, y: 5.7 },
  ],
  'maximum-camber-position': [
    { x: DEFAULT_START_POSITION, y: 0 },
    { x: 0.35, y: 12 },
    { x: 0.7, y: 18 },
    { x: 1, y: 8 },
  ],
  thickness: [
    { x: DEFAULT_START_POSITION, y: 5 },
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
  /** PUT /geometry/:id/tools/profile-generator/ — persist the current parameters. */
  onSaveParameters?: (params: ProfileGeneratorParameters) => void;
  /** POST /geometry/:id/tools/profile-generator/ — run the generator. */
  onGenerate?: (params: ProfileGeneratorParameters) => void;
  saving?: boolean;
  generating?: boolean;
  saveError?: boolean;
  generateError?: boolean;
}

export function ProfileDistributionPanel({
  folded,
  onFoldToggle,
  onSaveParameters,
  onGenerate,
  saving,
  generating,
  saveError,
  generateError,
}: ProfileDistributionPanelProps) {
  const [type, setType] = useState('NACA 4 digit');
  const [startPos, setStartPos] = useState(String(DEFAULT_START_POSITION));
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

  // The three curves' first point stays in sync with each other, but is
  // independent from the Start position field/yellow line — that field
  // only controls where the reference indicator is drawn, not the curves.
  function handleCurveChange(key: SectionKey, next: ControlPoint[]) {
    const prevFirstX = sectionPoints[key][0]?.x;
    const nextFirstX = next[0]?.x;
    setPointsForSection(key, next);
    if (nextFirstX === undefined || nextFirstX === prevFirstX) return;
    SECTION_KEYS.forEach((otherKey) => {
      if (otherKey === key) return;
      const otherPoints = sectionPoints[otherKey];
      if (otherPoints[0]?.x === nextFirstX) return;
      setPointsForSection(
        otherKey,
        otherPoints.map((p, i) => (i === 0 ? { ...p, x: nextFirstX } : p))
      );
    });
  }

  function handleStartPosChange(raw: string) {
    setStartPos(raw);
  }

  function buildParams(): ProfileGeneratorParameters {
    return {
      type: API_PROFILE_TYPE,
      start_position: Number(startPos) || 0,
      end_position: Number(endPos) || 0,
      profile_count: Number(profileCount) || 0,
      name: 'Profile',
      parameters: SECTION_KEYS.map((key) => ({
        reference: SECTION_TO_REFERENCE[key],
        curve_type: 'bezier',
        control_points: sectionPoints[key],
      })),
    };
  }

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
                onChange={(next) => handleCurveChange(key, next)}
                yMax={Y_MAX}
                rootX={Number.isFinite(parseFloat(startPos)) ? parseFloat(startPos) : DEFAULT_START_POSITION}
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
            <DropdownSelect value={type} onChange={setType} options={PROFILE_TYPES} disabled />
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
              onChange={(e) => handleStartPosChange(e.target.value)}
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

        {(onSaveParameters || onGenerate) && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {onSaveParameters && (
                <button
                  type="button"
                  onClick={() => onSaveParameters(buildParams())}
                  disabled={saving}
                  className="inline-flex h-8 items-center justify-center rounded-md border border-[#e2e8f0] bg-white px-3 text-[12px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save parameters'}
                </button>
              )}
              {onGenerate && (
                <button
                  type="button"
                  onClick={() => onGenerate(buildParams())}
                  disabled={generating}
                  className="inline-flex h-8 items-center justify-center rounded-md bg-[#006496] px-3 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? 'Generating…' : 'Generate'}
                </button>
              )}
            </div>
            {saveError && <p className="text-[13px] text-[#dc2626]">Failed to save parameters. Please try again.</p>}
            {generateError && <p className="text-[13px] text-[#dc2626]">Failed to generate. Please try again.</p>}
          </div>
        )}

        <p className="pt-2 text-[16px] font-semibold leading-none text-[#0a0a0a]">
          Distribution curves
        </p>

        {/* Sub-tabs — only when expanded; folded mode stacks all sections instead. */}
        {!folded && (
          <SectionTabs
            sectionKeys={SECTION_KEYS}
            sectionLabels={SECTION_LABELS}
            value={subTab}
            onValueChange={setSubTab}
          />
        )}
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
