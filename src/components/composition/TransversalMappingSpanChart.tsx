import { useRef, useState } from 'react';
import { ChartFrame } from '@/components/common/viewer/ChartFrame';
import { useChartZoomPan } from '@/hooks/useChartZoomPan';
import { dataToPx, pxToData, computeChartAxis } from '@/lib/bezierMath';
import {
  getMappingBoundary,
  type TransversalMapping,
} from '@/components/composition/TransversalMappingRow';
import type { GeometryProfile } from '@/api/types/geometry';

interface TransversalMappingSpanChartProps {
  mapping: TransversalMapping;
  coveredProfilesSortedByPosition: GeometryProfile[];
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

/**
 * Whole-span view of one transversal mapping: X = each covered profile's
 * real spanwise position, Y = chordwise position (0-1). Two point series
 * (start boundary, end boundary) connected by a polyline each — since inner
 * points are either locked (pinned) or linearly interpolated by
 * construction, the polyline itself is the live interpolation preview.
 * Locked points aren't draggable (drag the lock target via the popover
 * instead, opened by double-clicking any point). See
 * docs/superpowers/specs/2026-08-30-transversal-mapping-span-view-design.md.
 */
export function TransversalMappingSpanChart({
  mapping,
  coveredProfilesSortedByPosition,
  onChangeBoundary,
  onOpenProfileEditor,
  onRecalculate,
  onClose,
}: TransversalMappingSpanChartProps) {
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
  if (profiles.length === 0) return null;
  const xMin = profiles[0].position;
  const xMax = profiles[profiles.length - 1].position || xMin + 1;
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
    const points = profiles
      .map((p) => ({ profile: p, boundary: getMappingBoundary(mapping, p.id) }))
      .filter(({ boundary }) => boundary[field] != null);

    const linePoints = points
      .map(({ profile, boundary }) => {
        const { cx, cy } = project(profile.position, boundary[field]!);
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
        {points.map(({ profile, boundary }) => {
          const { cx, cy } = project(profile.position, boundary[field]!);
          const lockKey = field === 'startPosition' ? 'startLockedTo' : 'endLockedTo';
          const locked = boundary[lockKey] != null;
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
                  onDoubleClick={() => onOpenProfileEditor(profile.id)}
                />
              ) : (
                <circle
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill={color}
                  stroke="#0a0a0a"
                  strokeWidth={1}
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDragTarget({ profileId: profile.id, field });
                  }}
                  onDoubleClick={() => onOpenProfileEditor(profile.id)}
                />
              )}
            </g>
          );
        })}
      </g>
    );
  }

  const hasInnerProfiles = profiles.length > 2;
  const start = getMappingBoundary(mapping, profiles[0]?.id ?? null);
  const end = getMappingBoundary(mapping, profiles[profiles.length - 1]?.id ?? null);
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
          Purple = start boundary, teal = end boundary. Diamond = locked to an intersection
          (double-click to change). Drag a circle to adjust; double-click to fine-tune numerically.
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
