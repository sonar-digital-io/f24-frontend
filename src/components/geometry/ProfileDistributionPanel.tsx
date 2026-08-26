import { useEffect, useState } from 'react';
import { FoldHorizontal, Info, Loader2, Check } from 'lucide-react';
import type { ControlPoint } from '@/types';
import { SectionTabs } from '@/components/geometry/SectionTabs';
import { FoldablePanelShell } from '@/components/geometry/FoldablePanelShell';
import { ProfileGeneratorTopRow } from '@/components/geometry/ProfileGeneratorTopRow';
import { ProfileDistributionSectionBody } from '@/components/geometry/ProfileDistributionSectionBody';
import { Tip } from '@/components/common/list/Tip';
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
    { x: 1, y: 0 },
  ],
  'maximum-camber-position': [
    { x: DEFAULT_START_POSITION, y: 0 },
    { x: 1, y: 0 },
  ],
  thickness: [
    { x: DEFAULT_START_POSITION, y: 5 },
    { x: 1, y: 5 },
  ],
};

/** Y axis upper bound for the camber chart. */
const Y_MAX = 24;

interface ProfileDistributionPanelProps {
  /** Whether the panel is folded (all 3 sections stacked vertically, no sub-tabs).
   *  Lifted to the parent so the surrounding `<aside>` can shrink in width. */
  folded: boolean;
  onFoldToggle: () => void;
  /** Global properties' root radius, as a percentage (e.g. "10" for 10%) —
   *  kept in sync with Start position, which is the same value as a fraction (0.1). */
  rootRadiusPercent?: string;
  /** Previously saved parameters — from GET /geometry/:id/'s nested
   *  profile_generator_parameters, or whatever was last sent to PUT/POST
   *  /geometry/:id/tools/profile-generator/ — hydrated into profile count,
   *  end position and the three curves. */
  initialParameters?: ProfileGeneratorParameters;
  /** Autosaves on every field blur and every completed bezier point move: PUTs the
   *  parameters (same as the old "Save parameters" button), then — only once that
   *  succeeds — POSTs to regenerate the profiles (same as the old "Generate" button). */
  onCommit: (params: ProfileGeneratorParameters) => void;
  /** Either half of the commit (save or generate) is in flight. */
  committing?: boolean;
  /** The last commit's generate step succeeded, and nothing has been edited since. */
  profilesUpdated?: boolean;
}

export function ProfileDistributionPanel({
  folded,
  onFoldToggle,
  rootRadiusPercent,
  initialParameters,
  onCommit,
  committing,
  profilesUpdated,
}: ProfileDistributionPanelProps) {
  const [type, setType] = useState('NACA 4 digit');
  const [startPos, setStartPos] = useState(String(DEFAULT_START_POSITION));

  // Start position mirrors Global properties' root radius — same value, just
  // a fraction (0.1) instead of a percentage (10).
  useEffect(() => {
    const percent = parseFloat((rootRadiusPercent ?? '').replace(',', '.'));
    if (!Number.isFinite(percent)) return;
    setStartPos(String(percent / 100));
  }, [rootRadiusPercent]);

  const [endPos, setEndPos] = useState(String(initialParameters?.end_position ?? 1));
  const [profileCount, setProfileCount] = useState(String(initialParameters?.profile_count ?? 6));
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

  const rootX = Number.isFinite(parseFloat(startPos)) ? parseFloat(startPos) : DEFAULT_START_POSITION;

  // Points are edited (dragged, deleted, typed, added) well before a commit is due —
  // `requestCommit` just marks one pending; the effect below reads the settled state
  // once React has actually applied it, so a commit requested mid-update (e.g. from
  // the same handler that just added a point) never reads a stale pre-update value.
  const [commitTick, setCommitTick] = useState(0);
  function requestCommit() {
    setCommitTick((t) => t + 1);
  }

  // This panel unmounts/remounts on tab switch, so mounting == opening the tab —
  // save immediately rather than waiting for the first field blur/point edit.
  useEffect(() => {
    requestCommit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    sectionPoints,
    setPointsForSection,
    addPoint,
    getInputValue,
    handleInputChange,
    handleInputBlur,
  } = useEditableSectionPoints(
    (() => {
      const parameterMap = new Map((initialParameters?.parameters ?? []).map((p) => [p.reference, p]));
      return SECTION_KEYS.reduce((acc, key) => {
        const saved = parameterMap.get(SECTION_TO_REFERENCE[key]);
        acc[key] = saved?.control_points ?? INITIAL_SECTION_POINTS[key];
        return acc;
      }, {} as Record<SectionKey, ControlPoint[]>);
    })(),
    () => ({ min: 0, max: Y_MAX }),
    2,
    () => rootX,
    requestCommit
  );

  // The three curves' first point stays in sync with each other.
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

  // Point 0 (relative radius) defaults to the Start position field's value —
  // pushed into all three curves whenever it changes (typed, or synced from
  // Global properties' root radius).
  useEffect(() => {
    SECTION_KEYS.forEach((key) => {
      const points = sectionPoints[key];
      if (points[0]?.x === rootX) return;
      setPointsForSection(key, points.map((p, i) => (i === 0 ? { ...p, x: rootX } : p)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootX]);

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

  // Points can be deleted down to 0 in the chart — block autosaving until every
  // curve has at least the 2 points a bezier curve needs.
  const hasEnoughPoints = SECTION_KEYS.every((key) => sectionPoints[key].length >= 2);

  // Fires once per requested commit, after the triggering state change (a moved/
  // deleted/added point, or a field's new value) has actually been applied — never
  // on every keystroke/drag-step in between.
  useEffect(() => {
    if (commitTick === 0) return;
    if (hasEnoughPoints) onCommit(buildParams());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitTick]);

  // A single section's chart + table BODY (no heading). Heading is rendered
  // by the accordion item in folded mode, and is hidden in expanded mode
  // because sub-tabs already name the section.
  function renderSectionBody(key: SectionKey) {
    const valueLabel =
      key === 'maximum-camber'
        ? 'Max Cam (%)'
        : key === 'maximum-camber-position'
          ? 'Max Cam pos (%)'
          : 'Thickness (%)';
    return (
      <ProfileDistributionSectionBody
        folded={folded}
        points={sectionPoints[key]}
        onChange={(next) => handleCurveChange(key, next)}
        onCommit={requestCommit}
        yMax={Y_MAX}
        rootX={rootX}
        valueLabel={valueLabel}
        idPrefix={key}
        showDistribution={showDistribution[key]}
        onShowDistributionChange={(v) => setShowDistribution((s) => ({ ...s, [key]: v }))}
        showTable={showTable[key]}
        onShowTableChange={(v) => setShowTable((s) => ({ ...s, [key]: v }))}
        getInputValue={(idx, field) => getInputValue(key, idx, field)}
        onInputChange={(idx, field, raw) => handleInputChange(key, idx, field, raw)}
        onInputBlur={(idx, field) => handleInputBlur(key, idx, field)}
        onAddPoint={() => addPoint(key)}
        onRemovePoint={(idx) => {
          handleCurveChange(key, sectionPoints[key].filter((_, i) => i !== idx));
          requestCommit();
        }}
      />
    );
  }

  // In folded mode the Type column needs more room than the numeric ones —
  // otherwise dropdown options like "Custom airfoil" get clipped. Expanded
  // mode has plenty of horizontal space, so equal columns are fine.
  const topRowGrid = folded
    ? 'grid grid-cols-[minmax(160px,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-end gap-3'
    : 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-end gap-4';

  const header = (
    <div className="flex flex-col gap-4 p-6 pb-4">
      <div className="flex items-center justify-between">
        <p className="text-[16px] font-semibold leading-none text-[#0a0a0a]">Airfoil generation settings</p>
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

      <ProfileGeneratorTopRow
        gridClassName={topRowGrid}
        type={type}
        onTypeChange={setType}
        profileTypes={PROFILE_TYPES}
        profileCount={profileCount}
        onProfileCountChange={setProfileCount}
        startPos={startPos}
        onStartPosChange={handleStartPosChange}
        endPos={endPos}
        onEndPosChange={setEndPos}
        onFieldBlur={requestCommit}
      />

      <div className="flex min-h-5 items-center gap-[6px]">
        {committing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-[#737373]" strokeWidth={2} />
            <span className="text-[14px] leading-5 text-[#737373]">Saving…</span>
          </>
        ) : profilesUpdated ? (
          <>
            <Check className="h-4 w-4 text-[#737373]" strokeWidth={2} />
            <span className="text-[14px] leading-5 text-[#737373]">Profiles updated</span>
            <Tip label="Profiles were regenerated from the current settings and distribution curves.">
              <Info className="h-3.5 w-3.5 text-[#006496]" strokeWidth={2} />
            </Tip>
          </>
        ) : null}
        {!hasEnoughPoints && <p className="text-[13px] text-[#dc2626]">Each curve needs at least 2 points.</p>}
      </div>

      <p className="pt-2 text-[16px] font-semibold leading-none text-[#0a0a0a]">Distribution curves</p>

      {/* Sub-tabs — only when expanded; folded mode stacks all sections instead. */}
      {!folded && (
        <SectionTabs sectionKeys={SECTION_KEYS} sectionLabels={SECTION_LABELS} value={subTab} onValueChange={setSubTab} />
      )}
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
