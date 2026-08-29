import { useRef } from 'react';
import type { ControlPoint, CurveType } from '@/types';
import { ChartFrame } from '@/components/common/viewer/ChartFrame';
import { ChartAnchorPointsLayer } from '@/components/common/viewer/ChartAnchorPointsLayer';
import { useChartZoomPan } from '@/hooks/useChartZoomPan';
import { useCurveEditorInteractions } from '@/hooks/useCurveEditorInteractions';
import {
  VB_WIDTH,
  VB_HEIGHT,
  PAD_LEFT,
  PAD_RIGHT,
  PAD_TOP,
  PAD_BOTTOM,
  dataToPx,
  clamp,
  computeChartAxis,
  catmullRomPath,
  bezierControlPolygonPath,
  pointsToPolygonString,
} from '@/lib/bezierMath';

/**
 * Interactive curve editor — `curveType: 'spline'` renders a Catmull-Rom
 * interpolating spline (every point sits on the curve); `curveType: 'bezier'`
 * renders a real Bézier curve whose point list IS the control polygon
 * (De Casteljau-evaluated) — only the first/last points sit on the curve,
 * every point in between pulls it without ever being touched by it (shown
 * with a dashed control-polygon guide).
 *
 * Both curve types share identical point-manipulation UX:
 * - Click on background  → insert a new point at that position
 * - Drag a point         → move it (bounded by its neighbors / xMin·xMax)
 * - Double-click a point → remove it, including endpoints — blocked once
 *   `minPoints` remain (default 2)
 * - +/- buttons          → zoom in / out
 * - Drag background      → pan (only when zoomed in)
 * - Double-click bg      → reset zoom & pan
 *
 * Ghost curve:
 * - While dragging a point, the green dashed curve shows where the curve
 *   was BEFORE the drag started. It vanishes the moment you release.
 */
export interface CurveEditorProps {
  curveType: CurveType;
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
  xUnit?: string;
  yUnit?: string;
  className?: string;
}

export function CurveEditor({
  curveType,
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
  xUnit = '',
  yUnit = '',
  className,
}: CurveEditorProps) {
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
  } = useCurveEditorInteractions({
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

  const buildPath = curveType === 'bezier' ? bezierControlPolygonPath : catmullRomPath;
  const xAxis = computeChartAxis(xMin, xMax, xStep);
  const yAxis = computeChartAxis(yMin, yMax, yStep);
  const rootPx = dataToPx({ x: rootX, y: 0 }, xMin, xMax, yMin, yMax).cx;

  return (
    <ChartFrame
      svgRef={svgRef}
      ariaLabel={curveType === 'bezier' ? 'Bézier distribution chart' : 'Distribution chart'}
      viewX={viewX}
      viewY={viewY}
      viewW={viewW}
      viewH={viewH}
      zoom={zoom}
      panningPointerId={panningPointerId}
      idleCursor="crosshair"
      bgPointerHandlers={bgPointerHandlers}
      onBgClick={handleBgClick}
      onBgDoubleClick={resetView}
      zoomControlProps={zoomControlProps}
      xTicks={xAxis.ticks}
      yTicks={yAxis.ticks}
      xMin={xMin}
      xMax={xMax}
      yMin={yMin}
      yMax={yMax}
      xDecimals={xAxis.decimals}
      yDecimals={yAxis.decimals}
      xUnit={xUnit}
      yUnit={yUnit}
      className={className}
    >
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

      {/* Control-polygon guide — bezier only, hints which points are off-curve */}
      {curveType === 'bezier' && (
        <polyline
          points={pointsToPolygonString(points, xMin, xMax, yMin, yMax)}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="3 2"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Ghost curve — pre-drag snapshot, shown only while a point is being dragged */}
      {draggingIndex !== null && preEditPointsRef.current && (
        <path
          d={buildPath(preEditPointsRef.current, xMin, xMax, yMin, yMax)}
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
        d={buildPath(points, xMin, xMax, yMin, yMax)}
        fill="none"
        stroke="#0066cc"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />

      {/* Draggable points */}
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
      {draggingIndex === 0 &&
        blockedAtRoot &&
        (() => {
          const labelW = 172;
          const labelH = 22;
          const cx = clamp(rootPx, PAD_LEFT + labelW / 2, VB_WIDTH - PAD_RIGHT - labelW / 2);
          const y = PAD_TOP + 6;
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect
                x={cx - labelW / 2}
                y={y}
                width={labelW}
                height={labelH}
                rx={4}
                fill="#171717"
              />
              <text x={cx} y={y + labelH / 2 + 4} textAnchor="middle" fontSize="11" fill="white">
                Can&apos;t go past start position
              </text>
            </g>
          );
        })()}
    </ChartFrame>
  );
}
