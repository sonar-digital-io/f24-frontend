import { useRef, useState } from 'react';
import type { ControlPoint } from '@/types';
import { ChartFrame } from '@/components/common/viewer/ChartFrame';
import { ChartAnchorPointsLayer } from '@/components/common/viewer/ChartAnchorPointsLayer';
import { useChartZoomPan } from '@/hooks/useChartZoomPan';
import {
  dataToPx,
  pxToData,
  clamp,
  computeChartAxis,
  isConvexPolygon,
  pointsToPolygonString,
  MIN_LAYUP_POLYGON_POINTS,
} from '@/lib/bezierMath';

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
  xUnit?: string;
  yUnit?: string;
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
  xUnit = '',
  yUnit = '',
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
  // stops moving it there — the drag/nudge itself isn't cancelled. If the
  // polygon was already concave (e.g. legacy data), don't lock all further
  // edits — only block moves that turn an already-convex polygon concave.
  function commitIfConvex(idx: number, x: number, y: number) {
    const next = points.map((p, i) => (i === idx ? { x, y } : p));
    if (isConvexPolygon(points) && !isConvexPolygon(next)) return;
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
  // but the polygon always needs at least MIN_LAYUP_POLYGON_POINTS points to stay a closed shape.
  function handlePointDoubleClick(idx: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (points.length <= MIN_LAYUP_POLYGON_POINTS) return;
    onChange(points.filter((_, i) => i !== idx));
  }

  // Keyboard alternative to dragging (arrow keys nudge by a tenth of a grid
  // step) and to double-click-to-delete (Delete/Backspace) — the anchor is
  // otherwise mouse/touch-only.
  function handleKeyDown(idx: number, e: React.KeyboardEvent<SVGCircleElement>) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (points.length <= MIN_LAYUP_POLYGON_POINTS) return;
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

  const xAxis = computeChartAxis(xMin, xMax, xStep);
  const yAxis = computeChartAxis(yMin, yMax, yStep);

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
    <ChartFrame
      svgRef={svgRef}
      ariaLabel="Layup mapping chart"
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
      yMin={yMin}
      yMax={yMax}
      xDecimals={xAxis.decimals}
      yDecimals={yAxis.decimals}
      xUnit={xUnit}
      yUnit={yUnit}
      className={className}
    >
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
        minPoints={MIN_LAYUP_POLYGON_POINTS}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handlePointDoubleClick}
        onKeyDown={handleKeyDown}
      />
    </ChartFrame>
  );
}
