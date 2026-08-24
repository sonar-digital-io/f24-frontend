import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ControlPoint } from '@/types';
import { BezierZoomControls } from '@/components/common/viewer/BezierZoomControls';
import { ChartBackgroundRect } from '@/components/common/viewer/ChartBackgroundRect';
import { ChartGrid } from '@/components/common/viewer/ChartGrid';
import { ChartAnchorPointsLayer } from '@/components/common/viewer/ChartAnchorPointsLayer';
import { useChartZoomPan } from '@/hooks/useChartZoomPan';
import {
  dataToPx,
  pxToData,
  clamp,
  computeTicks,
  decimalsForStep,
  isConvexPolygon,
  pointsToPolygonString,
} from '@/lib/bezierMath';

/** The polygon can never drop below this many corners. */
const MIN_POINTS = 4;

/**
 * Layup mapping chart — closed straight-line polygon over the blade's real
 * planform background (leading + trailing edge, from GET /geometry/:id/top-view/).
 * All control points are freely draggable.
 */

interface LayupMappingChartProps {
  points: ControlPoint[];
  onChange: (points: ControlPoint[]) => void;
  /** Leading-edge points [longitudinal, transversal], in the chart's own data scale. */
  leadingEdge: ControlPoint[];
  /** Trailing-edge points [longitudinal, transversal], in the chart's own data scale. */
  trailingEdge: ControlPoint[];
  xMin?: number;
  xMax?: number;
  xStep?: number;
  yMin?: number;
  yMax?: number;
  yStep?: number;
  className?: string;
}

export function LayupMappingChart({
  points,
  onChange,
  leadingEdge,
  trailingEdge,
  xMin = 5,
  xMax = 55,
  xStep = 5,
  yMin = -14,
  yMax = 0,
  yStep = 2,
  className,
}: LayupMappingChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

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

  // Dragging past the point where the polygon would fold in on itself just
  // stops moving it there — the drag/nudge itself isn't cancelled.
  function commitIfConvex(idx: number, x: number, y: number) {
    const next = points.map((p, i) => (i === idx ? { x, y } : p));
    if (!isConvexPolygon(next)) return;
    onChange(next);
  }

  // ── Control-point drag ───────────────────────────────────────────────────
  function handlePointerDown(idx: number, e: React.PointerEvent<SVGCircleElement>) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingIndex(idx);
  }

  function handlePointerMove(idx: number, e: React.PointerEvent<SVGCircleElement>) {
    if (draggingIndex !== idx) return;
    const local = screenToViewBox(e.clientX, e.clientY);
    if (!local) return;
    const raw = pxToData(local.x, local.y, xMin, xMax, yMin, yMax);
    commitIfConvex(idx, clamp(raw.x, xMin, xMax), clamp(raw.y, yMin, yMax));
  }

  function handlePointerUp(idx: number, e: React.PointerEvent<SVGCircleElement>) {
    if (draggingIndex !== idx) return;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }
    setDraggingIndex(null);
  }

  // Double-click any point to remove it, same as the other bezier canvases —
  // but the polygon always needs at least MIN_POINTS points to stay a closed shape.
  function handlePointDoubleClick(idx: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (points.length <= MIN_POINTS) return;
    onChange(points.filter((_, i) => i !== idx));
  }

  // Keyboard alternative to dragging (arrow keys nudge by a tenth of a grid
  // step) and to double-click-to-delete (Delete/Backspace) — the anchor is
  // otherwise mouse/touch-only.
  function handleKeyDown(idx: number, e: React.KeyboardEvent<SVGCircleElement>) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (points.length <= MIN_POINTS) return;
      onChange(points.filter((_, i) => i !== idx));
      return;
    }
    const point = points[idx];
    let x = point.x;
    let y = point.y;
    switch (e.key) {
      case 'ArrowLeft': x -= xStep * 0.1; break;
      case 'ArrowRight': x += xStep * 0.1; break;
      case 'ArrowUp': y += yStep * 0.1; break;
      case 'ArrowDown': y -= yStep * 0.1; break;
      default: return;
    }
    e.preventDefault();
    commitIfConvex(idx, clamp(x, xMin, xMax), clamp(y, yMin, yMax));
  }

  const yTicks = computeTicks(yMin, yMax, yStep);
  const xTicks = computeTicks(xMin, xMax, xStep);
  const yDecimals = decimalsForStep(yStep);
  const xDecimals = decimalsForStep(xStep);

  // Closed polygon points string
  const polygonPoints = pointsToPolygonString(points, xMin, xMax, yMin, yMax);

  // Blade planform background: leading edge forward, trailing edge back, closed.
  const bladeOutlinePoints = pointsToPolygonString(
    [...leadingEdge, ...trailingEdge.slice().reverse()],
    xMin,
    xMax,
    yMin,
    yMax,
  );

  return (
    <div className={cn('relative h-[260px] w-full rounded-md bg-white', className)}>
      {/* Zoom controls */}
      <BezierZoomControls {...zoomControlProps} />

      <svg
        ref={svgRef}
        viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
        className="h-full w-full"
        aria-label="Layup mapping chart"
        style={{ touchAction: 'none' }}
      >
        {/* Background hit area for pan */}
        <ChartBackgroundRect
          viewX={viewX}
          viewY={viewY}
          viewW={viewW}
          viewH={viewH}
          zoom={zoom}
          panningPointerId={panningPointerId}
          bgPointerHandlers={bgPointerHandlers}
          onDoubleClick={resetView}
        />

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

        {/* Blade planform background — leading/trailing edge from GET /geometry/:id/top-view/ */}
        <polygon
          points={bladeOutlinePoints}
          fill="#f1f5f9"
          stroke="#1e293b"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: 'none' }}
        />

        {/* Closed polygon */}
        <polygon
          points={polygonPoints}
          fill="rgba(0, 102, 204, 0.08)"
          stroke="#0066cc"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: 'none' }}
        />

        {/* Draggable control points */}
        <ChartAnchorPointsLayer
          points={points}
          project={(p) => dataToPx(p, xMin, xMax, yMin, yMax)}
          draggingIndex={draggingIndex}
          minPoints={MIN_POINTS}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handlePointDoubleClick}
          onKeyDown={handleKeyDown}
        />
      </svg>
    </div>
  );
}
