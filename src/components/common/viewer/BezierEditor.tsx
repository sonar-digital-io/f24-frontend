import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ControlPoint } from '@/types';
import { BezierZoomControls } from '@/components/common/viewer/BezierZoomControls';
import { ChartGrid } from '@/components/common/viewer/ChartGrid';
import { ChartAnchorPoint } from '@/components/common/viewer/ChartAnchorPoint';
import { useChartZoomPan, CHART_ZOOM_MIN, CHART_ZOOM_MAX, CHART_ZOOM_STEP } from '@/hooks/useChartZoomPan';
import {
  VB_WIDTH,
  VB_HEIGHT,
  PAD_LEFT,
  PAD_RIGHT,
  PAD_TOP,
  PAD_BOTTOM,
  dataToPx,
  pxToData,
  clamp,
  computeTicks,
  decimalsForStep,
  catmullRomPath,
} from '@/lib/bezierMath';

/**
 * Interactive Catmull-Rom spline editor with N control points.
 *
 * All points are "on-curve" anchors — the smooth curve passes through each
 * one. This makes adding intermediate knots intuitive.
 *
 * Interactions:
 * - Click on background  → insert a new anchor at that position
 * - Drag anchor          → move it (bounded by its neighbors / xMin·xMax)
 * - Double-click anchor  → remove it, including endpoints — blocked once
 *   `minPoints` remain (default 2)
 * - +/- buttons          → zoom in / out
 * - Drag background      → pan (only when zoomed in)
 * - Double-click bg      → reset zoom & pan
 *
 * Ghost curve:
 * - While dragging an anchor, the green dashed curve shows where the curve
 *   was BEFORE the drag started. It vanishes the moment you release.
 */

export interface BezierEditorProps {
  points: ControlPoint[];
  onChange: (points: ControlPoint[]) => void;
  yMax?: number;
  yMin?: number;
  yStep?: number;
  xMin?: number;
  xMax?: number;
  xStep?: number;
  rootX?: number;
  /** Show the root-position reference line, and cap point 0 at it — off for
   *  charts with no concept of a start position (e.g. load limits). */
  showRootIndicator?: boolean;
  /** Fewest points the curve may shrink to via double-click delete — callers
   *  vary (e.g. 2 for load limits, more where a curve needs extra shape). */
  minPoints?: number;
  yUnit?: string;
  className?: string;
}

export function BezierEditor({
  points,
  onChange,
  yMax = 24,
  yMin = 0,
  yStep = 2,
  xMin = 0,
  xMax = 1,
  xStep = 0.1,
  rootX = 0.05,
  showRootIndicator = true,
  minPoints = 2,
  yUnit = '',
  className,
}: BezierEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  // True while dragging point 0 past rootX — shows the "can't go past start
  // position" label instead of silently clamping without feedback.
  const [blockedAtRoot, setBlockedAtRoot] = useState(false);

  // Ghost curve: snapshot of control points at the moment a drag starts.
  // Rendered in green while dragging, cleared (via draggingIndex→null) on release.
  const preEditPointsRef = useRef<ControlPoint[] | null>(null);

  const {
    zoom,
    viewX,
    viewY,
    viewW,
    viewH,
    panningPointerId,
    hasPannedRef,
    zoomBy,
    screenToViewBox,
    resetView,
    bgPointerHandlers,
  } = useChartZoomPan(svgRef);

  // ── Control-point drag ───────────────────────────────────────────────────
  function handlePointerDown(idx: number, e: React.PointerEvent<SVGCircleElement>) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    // Snapshot before edit — shown as green ghost while dragging
    preEditPointsRef.current = points.map((p) => ({ ...p }));
    setDraggingIndex(idx);
  }

  function handlePointerMove(idx: number, e: React.PointerEvent<SVGCircleElement>) {
    if (draggingIndex !== idx) return;
    const local = screenToViewBox(e.clientX, e.clientY);
    if (!local) return;
    let { x, y } = pxToData(local.x, local.y, xMin, xMax, yMin, yMax);
    y = clamp(y, yMin, yMax);
    const xEps = (xMax - xMin) * 0.001;
    if (idx === 0) {
      // The first point represents the start position — draggable in x too,
      // bounded by the chart's xMin, the next point, and (when shown) rootX —
      // it can sit before the start position, but never past it.
      const neighborUpper = points.length > 1 ? points[1].x - xEps : xMax;
      const upper = showRootIndicator ? Math.min(neighborUpper, rootX) : neighborUpper;
      if (showRootIndicator) setBlockedAtRoot(x > rootX);
      x = clamp(x, xMin, upper);
    } else if (idx === points.length - 1) {
      const lower = points.length > 1 ? points[idx - 1].x + xEps : xMin;
      x = clamp(x, lower, xMax);
    } else {
      x = clamp(x, points[idx - 1].x + xEps, points[idx + 1].x - xEps);
    }
    onChange(points.map((p, i) => (i === idx ? { x, y } : p)));
  }

  function handlePointerUp(idx: number, e: React.PointerEvent<SVGCircleElement>) {
    if (draggingIndex !== idx) return;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }
    // Setting draggingIndex → null causes the ghost to disappear on next render
    setDraggingIndex(null);
    setBlockedAtRoot(false);
  }

  // Double-click any anchor (including endpoints) to remove it — blocked
  // once `minPoints` remain, per-caller since not every curve's floor is 2.
  function handlePointDoubleClick(idx: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (points.length <= minPoints) return;
    onChange(points.filter((_, i) => i !== idx));
  }

  /** Click on background → insert a new anchor at that data position. */
  function handleBgClick(e: React.MouseEvent<SVGRectElement>) {
    if (hasPannedRef.current) return; // ignore drag-end clicks
    const local = screenToViewBox(e.clientX, e.clientY);
    if (!local) return;
    let { x, y } = pxToData(local.x, local.y, xMin, xMax, yMin, yMax);
    // Stay strictly between the two fixed endpoints (which may sit inside
    // the xMin..xMax range), so the point array stays x-sorted. With fewer
    // than 2 points there's no "between" yet — fall back to the chart's
    // own bounds instead (otherwise firstX === lastX and this always no-ops).
    const firstX = points.length >= 2 ? points[0].x : xMin;
    const lastX = points.length >= 2 ? points[points.length - 1].x : xMax;
    const margin = (xMax - xMin) * 0.02;
    if (lastX - firstX <= 2 * margin) return;
    x = clamp(x, firstX + margin, lastX - margin);
    y = clamp(y, yMin, yMax);
    // Skip if too close to an existing anchor
    if (points.some((p) => Math.abs(p.x - x) < (xMax - xMin) * 0.03)) return;
    // Insert in x-sorted order. With 0 or 1 existing points there's no
    // "middle" to find via neighbor comparison, so place explicitly instead.
    const idx =
      points.length === 0
        ? 0
        : points.length === 1
          ? (x < points[0].x ? 0 : 1)
          : (() => {
              const insertIdx = points.findIndex((p, i) => i > 0 && p.x >= x);
              return insertIdx === -1 ? points.length - 1 : insertIdx;
            })();
    onChange([...points.slice(0, idx), { x, y }, ...points.slice(idx)]);
  }

  // Degenerate bounds would put NaN into every coordinate (or loop forever
  // building ticks) — bail out with a placeholder instead.
  if (xMax <= xMin || yMax <= yMin || xStep <= 0 || yStep <= 0) {
    return (
      <div className="flex h-[260px] w-full items-center justify-center rounded-md bg-white text-[12px] text-[#6b7280]">
        Invalid chart bounds
      </div>
    );
  }

  const yTicks = computeTicks(yMin, yMax, yStep);
  const xTicks = computeTicks(xMin, xMax, xStep);
  const yDecimals = decimalsForStep(yStep);
  const xDecimals = decimalsForStep(xStep);
  const rootPx = dataToPx({ x: rootX, y: 0 }, xMin, xMax, yMin, yMax).cx;

  return (
    <div className={cn('relative h-[260px] w-full rounded-md bg-white', className)}>
      {/* Zoom controls */}
      <BezierZoomControls
        onZoomIn={() => zoomBy(CHART_ZOOM_STEP)}
        onZoomOut={() => zoomBy(1 / CHART_ZOOM_STEP)}
        canZoomIn={zoom < CHART_ZOOM_MAX}
        canZoomOut={zoom > CHART_ZOOM_MIN}
      />

      <svg
        ref={svgRef}
        viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
        className="h-full w-full"
        aria-label="Distribution chart"
        style={{ touchAction: 'none' }}
        /* No onWheel — scroll zoom deliberately disabled */
      >
        {/* Background: catches pan + click-to-add-point + dbl-click zoom reset */}
        <rect
          x={viewX}
          y={viewY}
          width={viewW}
          height={viewH}
          fill="transparent"
          style={{
            cursor:
              zoom > 1
                ? panningPointerId !== null
                  ? 'grabbing'
                  : 'grab'
                : 'crosshair',
          }}
          {...bgPointerHandlers}
          onClick={handleBgClick}
          onDoubleClick={resetView}
        />

        {yUnit && (
          <text x="6" y="12" fontSize="10" fill="#6b7280">
            [{yUnit}]
          </text>
        )}

        <ChartGrid
          xTicks={xTicks}
          yTicks={yTicks}
          xMin={xMin}
          xMax={xMax}
          yMin={yMin}
          yMax={yMax}
          xDecimals={xDecimals}
          yDecimals={yDecimals}
        />

        {/* Root indicator */}
        {showRootIndicator && (
          <line
            x1={rootPx}
            y1={PAD_TOP}
            x2={rootPx}
            y2={VB_HEIGHT - PAD_BOTTOM}
            stroke="#f59e0b"
            strokeWidth="1.5"
            opacity="0.8"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Ghost curve — pre-drag snapshot, shown only while a point is being dragged */}
        {draggingIndex !== null && preEditPointsRef.current && (
          <path
            d={catmullRomPath(preEditPointsRef.current, xMin, xMax, yMin, yMax)}
            fill="none"
            stroke="#22c55e"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.85"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Active curve */}
        <path
          d={catmullRomPath(points, xMin, xMax, yMin, yMax)}
          fill="none"
          stroke="#0066cc"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />

        {/* Draggable anchors */}
        {points.map((p, idx) => {
          const { cx, cy } = dataToPx(p, xMin, xMax, yMin, yMax);
          return (
            <ChartAnchorPoint
              key={idx}
              cx={cx}
              cy={cy}
              isDragging={draggingIndex === idx}
              onPointerDown={(e) => handlePointerDown(idx, e)}
              onPointerMove={(e) => handlePointerMove(idx, e)}
              onPointerUp={(e) => handlePointerUp(idx, e)}
              onPointerCancel={(e) => handlePointerUp(idx, e)}
              onDoubleClick={(e) => handlePointDoubleClick(idx, e)}
              tooltip={
                points.length > minPoints
                  ? 'Drag to move · Double-click to remove'
                  : 'Drag to move'
              }
            />
          );
        })}

        {/* Blocked-drag label — point 0 can't be dragged past the start position */}
        {draggingIndex === 0 && blockedAtRoot && (() => {
          const labelW = 172;
          const labelH = 22;
          const cx = clamp(rootPx, PAD_LEFT + labelW / 2, VB_WIDTH - PAD_RIGHT - labelW / 2);
          const y = PAD_TOP + 6;
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect x={cx - labelW / 2} y={y} width={labelW} height={labelH} rx={4} fill="#171717" />
              <text x={cx} y={y + labelH / 2 + 4} textAnchor="middle" fontSize="11" fill="white">
                Can&apos;t go past start position
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
