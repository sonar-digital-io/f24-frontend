import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';
import type { ControlPoint } from '@/components/BezierEditor';

export type { ControlPoint };

/**
 * Layup mapping chart — closed straight-line polygon over a static blade
 * planform background. All control points are freely draggable.
 */

const VB_WIDTH = 460;
const VB_HEIGHT = 260;
const PAD_LEFT = 40;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 26;

const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const ZOOM_STEP = 1.25;

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

function dataToPx(
  p: ControlPoint,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
) {
  const w = VB_WIDTH - PAD_LEFT - PAD_RIGHT;
  const h = VB_HEIGHT - PAD_TOP - PAD_BOTTOM;
  return {
    cx: PAD_LEFT + ((p.x - xMin) / (xMax - xMin)) * w,
    cy: PAD_TOP + (1 - (p.y - yMin) / (yMax - yMin)) * h,
  };
}

function pxToData(
  cx: number,
  cy: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
): ControlPoint {
  const w = VB_WIDTH - PAD_LEFT - PAD_RIGHT;
  const h = VB_HEIGHT - PAD_TOP - PAD_BOTTOM;
  return {
    x: xMin + (xMax - xMin) * ((cx - PAD_LEFT) / w),
    y: yMin + (yMax - yMin) * (1 - (cy - PAD_TOP) / h),
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
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

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [panningPointerId, setPanningPointerId] = useState<number | null>(null);
  const panStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const hasPannedRef = useRef(false);

  const viewW = VB_WIDTH / zoom;
  const viewH = VB_HEIGHT / zoom;
  const centerOffsetX = (VB_WIDTH - viewW) / 2;
  const centerOffsetY = (VB_HEIGHT - viewH) / 2;
  const clampedPanX = clamp(panX, -centerOffsetX, centerOffsetX);
  const clampedPanY = clamp(panY, -centerOffsetY, centerOffsetY);
  const viewX = centerOffsetX + clampedPanX;
  const viewY = centerOffsetY + clampedPanY;

  function screenToViewBox(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
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

  // ── Zoom ─────────────────────────────────────────────────────────────────
  function zoomBy(factor: number) {
    const next = clamp(zoom * factor, ZOOM_MIN, ZOOM_MAX);
    if (next === zoom) return;
    if (next <= 1) { setPanX(0); setPanY(0); }
    setZoom(next);
  }

  // ── Pan ──────────────────────────────────────────────────────────────────
  function handleBgPointerDown(e: React.PointerEvent<SVGRectElement>) {
    hasPannedRef.current = false;
    if (zoom <= 1) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setPanningPointerId(e.pointerId);
    panStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      panX: clampedPanX,
      panY: clampedPanY,
    };
  }

  function handleBgPointerMove(e: React.PointerEvent<SVGRectElement>) {
    if (panningPointerId === null || !panStartRef.current) return;
    const dx = e.clientX - panStartRef.current.pointerX;
    const dy = e.clientY - panStartRef.current.pointerY;
    if (dx * dx + dy * dy > 16) hasPannedRef.current = true;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vbDx = (dx / rect.width) * viewW;
    const vbDy = (dy / rect.height) * viewH;
    setPanX(panStartRef.current.panX - vbDx);
    setPanY(panStartRef.current.panY - vbDy);
  }

  function handleBgPointerUp(e: React.PointerEvent<SVGRectElement>) {
    if (panningPointerId === null) return;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    setPanningPointerId(null);
    panStartRef.current = null;
  }

  function handleBgDoubleClick() {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }

  // ── Ticks ────────────────────────────────────────────────────────────────
  const yTicks: number[] = [];
  const firstYTick = Math.ceil(yMin / yStep) * yStep;
  for (let v = firstYTick; v <= yMax + 1e-9; v += yStep) {
    yTicks.push(Math.round(v / yStep) * yStep);
  }
  const xTicks: number[] = [];
  const firstXTick = Math.ceil(xMin / xStep) * xStep;
  for (let v = firstXTick; v <= xMax + 1e-9; v += xStep) {
    xTicks.push(Math.round(v / xStep) * xStep);
  }
  const yDecimals = yStep >= 1 ? 0 : Math.max(0, -Math.floor(Math.log10(yStep)));
  const xDecimals = xStep >= 1 ? 0 : Math.max(0, -Math.floor(Math.log10(xStep)));

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
      <div className="absolute right-2 top-2 z-10 flex flex-col overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoomBy(ZOOM_STEP)}
          disabled={zoom >= ZOOM_MAX}
          className="flex h-6 w-6 items-center justify-center text-[#6b7280] hover:bg-[#f1f5f9] disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoomBy(1 / ZOOM_STEP)}
          disabled={zoom <= ZOOM_MIN}
          className="flex h-6 w-6 items-center justify-center border-t border-[#e5e7eb] text-[#6b7280] hover:bg-[#f1f5f9] disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

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
          onPointerDown={handleBgPointerDown}
          onPointerMove={handleBgPointerMove}
          onPointerUp={handleBgPointerUp}
          onPointerCancel={handleBgPointerUp}
          onDoubleClick={handleBgDoubleClick}
        />

        {/* Y grid + labels */}
        {yTicks.map((v) => {
          const { cy } = dataToPx({ x: xMin, y: v }, xMin, xMax, yMin, yMax);
          return (
            <g key={`y${v}`}>
              <text x="22" y={cy + 4} fontSize="9" fill="#6b7280">
                {v.toFixed(yDecimals)}
              </text>
              <line
                x1={PAD_LEFT}
                y1={cy}
                x2={VB_WIDTH - PAD_RIGHT}
                y2={cy}
                stroke="#f1f5f9"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}

        {/* X grid + labels */}
        {xTicks.map((v) => {
          const { cx } = dataToPx({ x: v, y: yMin }, xMin, xMax, yMin, yMax);
          return (
            <g key={`x${v}`}>
              <line
                x1={cx}
                y1={PAD_TOP}
                x2={cx}
                y2={VB_HEIGHT - PAD_BOTTOM}
                stroke="#f1f5f9"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={cx - 9}
                y={VB_HEIGHT - PAD_BOTTOM + 14}
                fontSize="9"
                fill="#6b7280"
              >
                {v.toFixed(xDecimals)}
              </text>
            </g>
          );
        })}

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
          const isDragging = draggingIndex === idx;
          return (
            <g key={idx}>
              {/* Invisible hit area */}
              <circle
                cx={cx}
                cy={cy}
                r="14"
                fill="transparent"
                style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                onPointerDown={(e) => handlePointerDown(idx, e)}
                onPointerMove={(e) => handlePointerMove(idx, e)}
                onPointerUp={(e) => handlePointerUp(idx, e)}
                onPointerCancel={(e) => handlePointerUp(idx, e)}
              >
                <title>Drag to move</title>
              </circle>
              {/* Visible dot */}
              <circle
                cx={cx}
                cy={cy}
                r={isDragging ? 7 : 6}
                fill="#0066cc"
                style={{ pointerEvents: 'none' }}
              />
              <circle
                cx={cx}
                cy={cy}
                r="3"
                fill="white"
                style={{ pointerEvents: 'none' }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
