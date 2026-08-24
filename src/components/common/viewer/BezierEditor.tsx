import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { ControlPoint } from '@/types';
import { BezierZoomControls } from '@/components/common/viewer/BezierZoomControls';
import { ChartBackgroundRect } from '@/components/common/viewer/ChartBackgroundRect';
import { ChartGrid } from '@/components/common/viewer/ChartGrid';
import { ChartAnchorPointsLayer } from '@/components/common/viewer/ChartAnchorPointsLayer';
import { useChartZoomPan } from '@/hooks/useChartZoomPan';
import { useBezierEditorInteractions } from '@/hooks/useBezierEditorInteractions';
import {
  VB_WIDTH,
  VB_HEIGHT,
  PAD_LEFT,
  PAD_RIGHT,
  PAD_TOP,
  PAD_BOTTOM,
  dataToPx,
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
  /** Fires once per completed point drag (on release) — for callers that autosave
   *  on "settled" edits rather than on every in-progress `onChange`. */
  onCommit?: () => void;
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
  onCommit,
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

  const {
    zoom,
    viewX,
    viewY,
    viewW,
    viewH,
    panningPointerId,
    hasPannedRef,
    screenToViewBox,
    resetView,
    bgPointerHandlers,
    zoomControlProps,
  } = useChartZoomPan(svgRef);

  const {
    draggingIndex,
    blockedAtRoot,
    preEditPointsRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleKeyDown,
    handlePointDoubleClick,
    handleBgClick,
  } = useBezierEditorInteractions({
    points,
    onChange,
    onCommit,
    xMin,
    xMax,
    yMin,
    yMax,
    xStep,
    yStep,
    rootX,
    showRootIndicator,
    minPoints,
    screenToViewBox,
    hasPannedRef,
  });

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
      <BezierZoomControls {...zoomControlProps} />

      <svg
        ref={svgRef}
        viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
        className="h-full w-full"
        aria-label="Distribution chart"
        style={{ touchAction: 'none' }}
        /* No onWheel — scroll zoom deliberately disabled */
      >
        {/* Background: catches pan + click-to-add-point + dbl-click zoom reset */}
        <ChartBackgroundRect
          viewX={viewX}
          viewY={viewY}
          viewW={viewW}
          viewH={viewH}
          zoom={zoom}
          panningPointerId={panningPointerId}
          idleCursor="crosshair"
          bgPointerHandlers={bgPointerHandlers}
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
        <ChartAnchorPointsLayer
          points={points}
          project={(p) => dataToPx(p, xMin, xMax, yMin, yMax)}
          draggingIndex={draggingIndex}
          minPoints={minPoints}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handlePointDoubleClick}
          onKeyDown={handleKeyDown}
        />

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
