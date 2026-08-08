import { useRef, useState } from 'react';
import { BezierZoomControls } from '@/components/common/viewer/BezierZoomControls';
import { useChartZoomPan, CHART_ZOOM_MIN, CHART_ZOOM_MAX, CHART_ZOOM_STEP } from '@/hooks/useChartZoomPan';
import {
  computeTicks,
  dataToPx,
  decimalsForStep,
  niceStep,
  pxToData,
  PAD_BOTTOM,
  PAD_LEFT,
  PAD_RIGHT,
  PAD_TOP,
  VB_HEIGHT,
  VB_WIDTH,
} from '@/lib/bezierMath';
import { arcFractionNearestTo, leadingEdgeFraction, pointAtArcFraction } from '@/lib/profileGeometry';
import type { ControlPoint } from '@/types';

interface SparProfileChartProps {
  /** Raw profile contour from GET /geometry/:id/profiles/:profileId/. */
  points: [number, number][];
  /** Null until the user sets it (via the position input or by dragging) — no default value. */
  upperPosition: number | null;
  lowerPosition: number | null;
  onUpperPositionChange: (v: number) => void;
  onLowerPositionChange: (v: number) => void;
}

/**
 * One profile's 2D cross-section with draggable upper/lower handles marking
 * where a spar crosses it — used inside an expanded spar table row (one
 * instance for the start profile, one for the end profile). X/Y are scaled
 * independently to the profile's own point bounds (like the app's other
 * charts) so the outline fills the canvas instead of sitting tiny in a
 * true-aspect box, and the view is zoomable/pannable for a closer look.
 */
export function SparProfileChart({
  points,
  upperPosition,
  lowerPosition,
  onUpperPositionChange,
  onLowerPositionChange,
}: SparProfileChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'upper' | 'lower' | null>(null);

  const { zoom, viewX, viewY, viewW, viewH, panningPointerId, zoomBy, screenToViewBox, resetView, bgPointerHandlers } =
    useChartZoomPan(svgRef);

  // The boundary between "upper" and "lower" positions along the contour's
  // arc length — the leading-edge vertex's own fraction, not a fixed 0.5
  // (see lib/profileGeometry.ts).
  const boundary = leadingEdgeFraction(points);
  const allPoints: ControlPoint[] = points.map(([x, y]) => ({ x, y }));
  const xs = allPoints.map((p) => p.x);
  const ys = allPoints.map((p) => p.y);
  const xMin = xs.length ? Math.min(...xs) : 0;
  const xMax = xs.length ? Math.max(...xs) : 1;
  const yMin = ys.length ? Math.min(...ys) : -0.1;
  const yMax = ys.length ? Math.max(...ys) : 0.1;
  const xPad = (xMax - xMin) * 0.08 || 0.1;
  const yPad = (yMax - yMin) * 0.15 || 0.02;

  const domainXMin = xMin - xPad;
  const domainXMax = xMax + xPad;
  const domainYMin = yMin - yPad;
  const domainYMax = yMax + yPad;

  function toPx(p: ControlPoint) {
    return dataToPx(p, domainXMin, domainXMax, domainYMin, domainYMax);
  }

  const outlinePath = allPoints.length
    ? allPoints
        .map((p) => toPx(p))
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`)
        .join(' ') + ' Z'
    : '';

  const upperHandle = upperPosition != null ? toPx(pointAtArcFraction(points, upperPosition)) : null;
  const lowerHandle = lowerPosition != null ? toPx(pointAtArcFraction(points, lowerPosition)) : null;

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const local = screenToViewBox(e.clientX, e.clientY);
    if (!local) return;
    const data = pxToData(local.x, local.y, domainXMin, domainXMax, domainYMin, domainYMax);
    const t = arcFractionNearestTo(points, data);
    // Upper stays on the upper-surface arc (before the leading edge), lower
    // on the lower-surface arc (after it) — dragging can't cross the nose.
    if (dragging === 'upper') onUpperPositionChange(Math.min(t, boundary));
    else onLowerPositionChange(Math.max(t, boundary));
  }

  function startDrag(which: 'upper' | 'lower', e: React.PointerEvent<SVGCircleElement>) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(which);
  }

  function endDrag(e: React.PointerEvent) {
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setDragging(null);
  }

  const xStep = niceStep(domainXMax - domainXMin);
  const yStep = niceStep(domainYMax - domainYMin);
  const xTicks = computeTicks(domainXMin, domainXMax, xStep);
  const yTicks = computeTicks(domainYMin, domainYMax, yStep);
  const xDecimals = decimalsForStep(xStep);
  const yDecimals = decimalsForStep(yStep);

  return (
    <div className="relative h-[220px] w-full rounded-md border border-[#e5e7eb] bg-white">
      <BezierZoomControls
        onZoomIn={() => zoomBy(CHART_ZOOM_STEP)}
        onZoomOut={() => zoomBy(1 / CHART_ZOOM_STEP)}
        canZoomIn={zoom < CHART_ZOOM_MAX}
        canZoomOut={zoom > CHART_ZOOM_MIN}
      />
      <svg
        ref={svgRef}
        viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
        className="h-full w-full touch-none"
        aria-label="Profile cross-section"
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <rect
          x={viewX}
          y={viewY}
          width={viewW}
          height={viewH}
          fill="transparent"
          style={{ cursor: zoom > 1 ? (panningPointerId !== null ? 'grabbing' : 'grab') : 'default' }}
          {...bgPointerHandlers}
          onDoubleClick={resetView}
        />

        {yTicks.map((v) => {
          const { cy } = toPx({ x: domainXMin, y: v });
          return (
            <g key={`y${v}`}>
              <line
                x1={PAD_LEFT}
                y1={cy}
                x2={VB_WIDTH - PAD_RIGHT}
                y2={cy}
                stroke="#f1f5f9"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <text x={4} y={cy + 3} fontSize="8" fill="#9ca3af">
                {v.toFixed(yDecimals)}
              </text>
            </g>
          );
        })}
        {xTicks.map((v) => {
          const { cx } = toPx({ x: v, y: domainYMin });
          return (
            <g key={`x${v}`}>
              <line
                x1={cx}
                y1={PAD_TOP}
                x2={cx}
                y2={VB_HEIGHT - PAD_BOTTOM}
                stroke="#f1f5f9"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <text x={cx - 10} y={VB_HEIGHT - PAD_BOTTOM + 12} fontSize="8" fill="#9ca3af">
                {v.toFixed(xDecimals)}
              </text>
            </g>
          );
        })}

        <path d={outlinePath} fill="none" stroke="#0a0a0a" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />

        {upperHandle && lowerHandle && (
          <line
            x1={upperHandle.cx}
            y1={upperHandle.cy}
            x2={lowerHandle.cx}
            y2={lowerHandle.cy}
            stroke="#dc2626"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {upperHandle && (
          <circle
            cx={upperHandle.cx}
            cy={upperHandle.cy}
            r={7}
            fill="#d1d5db"
            stroke="#9ca3af"
            className="cursor-grab"
            onPointerDown={(e) => startDrag('upper', e)}
          />
        )}
        {lowerHandle && (
          <circle
            cx={lowerHandle.cx}
            cy={lowerHandle.cy}
            r={7}
            fill="#d1d5db"
            stroke="#9ca3af"
            className="cursor-grab"
            onPointerDown={(e) => startDrag('lower', e)}
          />
        )}
      </svg>
    </div>
  );
}
