import { useRef, useState } from 'react';
import { ChartFrame } from '@/components/common/viewer/ChartFrame';
import { useChartZoomPan } from '@/hooks/useChartZoomPan';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { dataToPx, pxToData, computeChartAxis } from '@/lib/bezierMath';
import { effectiveBoundaryValue } from '@/lib/transversalMapping';
import {
  getMappingBoundary,
  type TransversalMapping,
} from '@/components/composition/TransversalMappingRow';
import type { GeometryProfile } from '@/api/types/geometry';
import type { CompositionProfileIntersections } from '@/api/types/composition';

interface TransversalMappingSpanChartProps {
  mapping: TransversalMapping;
  coveredProfilesSortedByPosition: GeometryProfile[];
  intersectionsData: CompositionProfileIntersections[] | undefined;
  onChangeBoundary: (
    profileId: number,
    field: 'startPosition' | 'endPosition',
    position: number,
  ) => void;
  onOpenProfileEditor: (profileId: number) => void;
  onRecalculate: () => void;
  onClose: () => void;
}

type DragTarget = { profileId: number; field: 'startPosition' | 'endPosition' } | null;

const Y_MIN = 0;
const Y_MAX = 1;
const Y_STEP = 0.1;
/** Cold-start y for a boundary profile of a mapping whose positions are all
 *  still unset — something has to be on screen to drag or double-click. */
const SEED_Y = 0.5;

/**
 * A point is genuinely "locked" (pinned to a landmark, so not freely
 * draggable) only when its locked-to intersection's own position IS the
 * stored position. `resolveLockedTo` snaps every freely-dragged position to
 * its nearest intersection id at save time, so a non-null `lockedTo` alone
 * means nothing — after one save+reload every point would look pinned.
 */
function isGenuinelyLocked(
  profileId: number,
  lockedTo: number | null,
  storedPosition: number | null,
  intersectionsData: CompositionProfileIntersections[] | undefined,
): boolean {
  if (lockedTo == null || storedPosition == null) return false;
  const intersection = intersectionsData
    ?.find((p) => p.profile_id === profileId)
    ?.intersections.find((i) => i.id === lockedTo);
  if (!intersection) return false;
  return Math.abs(intersection.position - storedPosition) < 1e-6;
}

interface SeriesPoint {
  profile: GeometryProfile;
  value: number;
  /** No explicitly-set value on this profile — the value shown is computed
   *  (interpolated, or the cold-start seed), so it renders faded/dashed. */
  isGhost: boolean;
  locked: boolean;
}

/**
 * Whole-span view of one transversal mapping: X = each covered profile's
 * real spanwise position, Y = chordwise position (0-1). Two point series
 * (start boundary, end boundary) connected by a polyline each — the polyline
 * is the live preview of exactly what save will write, since both it and
 * `buildTransversalMappingPayload` read `effectiveBoundaryValue`. Points
 * without an explicitly-set value are drawn as faded, dashed "ghosts"; they
 * drag like any other point (which is what makes them real). Genuinely
 * pinned points aren't draggable (change the lock target via the popover
 * instead, opened by double-clicking any point). See
 * docs/superpowers/specs/2026-08-30-transversal-mapping-span-view-design.md.
 */
export function TransversalMappingSpanChart({
  mapping,
  coveredProfilesSortedByPosition,
  intersectionsData,
  onChangeBoundary,
  onOpenProfileEditor,
  onRecalculate,
  onClose,
}: TransversalMappingSpanChartProps) {
  useEscapeKey(onClose);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const {
    zoom,
    viewX,
    viewY,
    viewW,
    viewH,
    panningPointerId,
    screenToViewBox,
    resetView,
    bgPointerHandlers,
    zoomControlProps,
  } = useChartZoomPan(svgRef);

  const profiles = coveredProfilesSortedByPosition;
  // Degenerate bounds would put NaN into every coordinate — bail out with a
  // placeholder instead (same idiom as CurveEditor).
  if (profiles.length < 2 || profiles[profiles.length - 1].position <= profiles[0].position) {
    return (
      <div className="flex h-[280px] w-[720px] items-center justify-center rounded-[14px] border border-[#e5e7eb] bg-white text-[12px] text-[#6b7280]">
        {profiles.length === 0
          ? 'This mapping’s profiles are no longer in the geometry.'
          : 'Start and end profile must be different.'}
      </div>
    );
  }
  const xMin = profiles[0].position;
  const xMax = profiles[profiles.length - 1].position;
  const xAxis = computeChartAxis(xMin, xMax, (xMax - xMin) / 5 || 1);
  const yAxis = computeChartAxis(Y_MIN, Y_MAX, Y_STEP);

  function project(x: number, y: number) {
    return dataToPx({ x, y }, xMin, xMax, Y_MIN, Y_MAX);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragTarget) return;
    const local = screenToViewBox(e.clientX, e.clientY);
    if (!local) return;
    const data = pxToData(local.x, local.y, xMin, xMax, Y_MIN, Y_MAX);
    const clamped = Math.max(0, Math.min(1, data.y));
    onChangeBoundary(dragTarget.profileId, dragTarget.field, clamped);
  }

  function handlePointerUp() {
    setDragTarget(null);
  }

  function renderSeries(field: 'startPosition' | 'endPosition', color: string) {
    const lockKey = field === 'startPosition' ? 'startLockedTo' : 'endLockedTo';
    const sideLabel = field === 'startPosition' ? 'Start' : 'End';

    const points: SeriesPoint[] = [];
    profiles.forEach((profile, i) => {
      const own = getMappingBoundary(mapping, profile.id);
      const effective = effectiveBoundaryValue(
        profiles,
        mapping.profileBoundaries,
        profile.id,
        field,
      );
      // Cold start: the mapping's own two boundary profiles always get a
      // handle, even with nothing set anywhere yet, so the mapping can be
      // created from scratch. Inner profiles stay hidden until there is
      // something real to interpolate from.
      const isEndpoint = i === 0 || i === profiles.length - 1;
      const value = effective ?? (isEndpoint ? SEED_Y : null);
      if (value == null) return;
      points.push({
        profile,
        value,
        isGhost: own[field] == null,
        locked: isGenuinelyLocked(profile.id, own[lockKey], own[field], intersectionsData),
      });
    });

    const linePoints = points
      .map(({ profile, value }) => {
        const { cx, cy } = project(profile.position, value);
        return `${cx.toFixed(1)},${cy.toFixed(1)}`;
      })
      .join(' ');

    return (
      <g key={field}>
        {linePoints && (
          <polyline
            points={linePoints}
            fill="none"
            stroke={color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {points.map(({ profile, value, isGhost, locked }) => {
          const { cx, cy } = project(profile.position, value);
          const label = `${sideLabel} boundary on ${profile.name}${
            locked ? ' (locked to an intersection)' : isGhost ? ' (not yet set)' : ''
          }`;
          const ghostProps = isGhost ? { opacity: 0.45, strokeDasharray: '2 2' } : {};
          const isDragging = dragTarget?.profileId === profile.id && dragTarget.field === field;
          return (
            <g key={profile.id}>
              {locked ? (
                <rect
                  x={cx - 5}
                  y={cy - 5}
                  width={10}
                  height={10}
                  fill={color}
                  stroke="#0a0a0a"
                  strokeWidth={1}
                  transform={`rotate(45 ${cx} ${cy})`}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  aria-label={label}
                  onDoubleClick={() => onOpenProfileEditor(profile.id)}
                >
                  <title>{label}</title>
                </rect>
              ) : (
                <circle
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill={color}
                  stroke="#0a0a0a"
                  strokeWidth={1}
                  {...ghostProps}
                  style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                  role="button"
                  tabIndex={0}
                  aria-label={label}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDragTarget({ profileId: profile.id, field });
                  }}
                  onDoubleClick={() => onOpenProfileEditor(profile.id)}
                >
                  <title>{label}</title>
                </circle>
              )}
            </g>
          );
        })}
      </g>
    );
  }

  const hasInnerProfiles = profiles.length > 2;
  const start = getMappingBoundary(mapping, profiles[0].id);
  const end = getMappingBoundary(mapping, profiles[profiles.length - 1].id);
  const canRecalculate =
    hasInnerProfiles &&
    start.startPosition != null &&
    start.endPosition != null &&
    end.startPosition != null &&
    end.endPosition != null;

  return (
    <div className="flex w-[720px] flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[16px] font-semibold leading-6 text-[#0a0a0a]">
          {mapping.name || 'Untitled mapping'} — span
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
        >
          ×
        </button>
      </div>

      <ChartFrame
        svgRef={svgRef}
        ariaLabel="Transversal mapping span"
        viewX={viewX}
        viewY={viewY}
        viewW={viewW}
        viewH={viewH}
        zoom={zoom}
        panningPointerId={panningPointerId}
        bgPointerHandlers={bgPointerHandlers}
        onBgDoubleClick={resetView}
        zoomControlProps={zoomControlProps}
        xTicks={xAxis.ticks}
        yTicks={yAxis.ticks}
        xMin={xMin}
        xMax={xMax}
        yMin={Y_MIN}
        yMax={Y_MAX}
        xDecimals={xAxis.decimals}
        yDecimals={yAxis.decimals}
        yUnit=""
        xUnit=""
        className="h-[280px] w-full"
      >
        <g
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {renderSeries('startPosition', '#9333ea')}
          {renderSeries('endPosition', '#0d9488')}
        </g>
      </ChartFrame>

      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#6b7280]">
          X: profile position along the span. Y: chordwise position (0–1). Purple = start boundary,
          teal = end boundary. Diamond = locked to an intersection (double-click to change). Faded
          dashed circle = not set yet, showing the interpolated value. Drag a circle to adjust;
          double-click to fine-tune numerically.
        </p>
        <button
          type="button"
          onClick={onRecalculate}
          disabled={!canRecalculate}
          className="inline-flex h-8 shrink-0 items-center rounded-md border border-[#e2e8f0] bg-white px-3 text-[12px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Recalculate
        </button>
      </div>
    </div>
  );
}
