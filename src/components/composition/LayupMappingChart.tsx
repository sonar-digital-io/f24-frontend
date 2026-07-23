import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ControlPoint } from '@/types';
import { BezierZoomControls } from '@/components/common/viewer/BezierZoomControls';
import { ChartGrid } from '@/components/common/viewer/ChartGrid';
import { ChartAnchorPoint } from '@/components/common/viewer/ChartAnchorPoint';
import { useChartZoomPan, CHART_ZOOM_MIN, CHART_ZOOM_MAX, CHART_ZOOM_STEP } from '@/hooks/useChartZoomPan';
import { dataToPx, pxToData, clamp, computeTicks, decimalsForStep } from '@/lib/bezierMath';

/**
 * Layup mapping chart — closed straight-line polygon over a static blade
 * planform background. All control points are freely draggable.
 */

// Blade planform outline in VB pixel coordinates.
// Source: lapat.svg (viewBox 0 0 359 71), placed in the Figma chart at
//   left=76px, top=103.76px, w=357px, h=69px with -scale-y-100 flip.
// Grid: y=0 at inner-div top+8px (=bezier py=28), y=-14 at bezier py=243 → 215px/14m.
// Blade bounding box in data: x 10..54.6 m, y -9.43..-4.94 m (after flip correction).
// Transform: cx = 80.8 + svg_x * 1.0137,  cy = 162.8 - svg_y * 0.9845
const BLADE_PATH =
  'M 356.2 158.7 ' +
  'C 275.9 164.8 126.1 161.2 61.2 158.7 ' +
  'L 61.2 124.2 ' +
  'L 172.8 94.1 ' +
  'L 413.7 131.8 ' +
  'C 428.0 138.3 436.6 152.7 356.2 158.7 Z';

interface LayupMappingChartProps {
  points: ControlPoint[];
  onChange: (points: ControlPoint[]) => void;
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

  const { zoom, viewX, viewY, viewW, viewH, panningPointerId, zoomBy, screenToViewBox, resetView, bgPointerHandlers } =
    useChartZoomPan(svgRef);

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
    const x = clamp(raw.x, xMin, xMax);
    const y = clamp(raw.y, yMin, yMax);
    onChange(points.map((p, i) => (i === idx ? { x, y } : p)));
  }

  function handlePointerUp(idx: number, e: React.PointerEvent<SVGCircleElement>) {
    if (draggingIndex !== idx) return;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }
    setDraggingIndex(null);
  }

  const yTicks = computeTicks(yMin, yMax, yStep);
  const xTicks = computeTicks(xMin, xMax, xStep);
  const yDecimals = decimalsForStep(yStep);
  const xDecimals = decimalsForStep(xStep);

  // Closed polygon points string
  const polygonPoints = points
    .map((p) => {
      const { cx, cy } = dataToPx(p, xMin, xMax, yMin, yMax);
      return `${cx.toFixed(1)},${cy.toFixed(1)}`;
    })
    .join(' ');

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
        aria-label="Layup mapping chart"
        style={{ touchAction: 'none' }}
      >
        {/* Background hit area for pan */}
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
                : 'default',
          }}
          {...bgPointerHandlers}
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

        {/* Static blade planform background */}
        <path
          d={BLADE_PATH}
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
              tooltip="Drag to move"
            />
          );
        })}
      </svg>
    </div>
  );
}
