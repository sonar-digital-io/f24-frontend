import { useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

/**
 * Interactive cubic Bézier editor with 4 control points.
 *
 * - State lives in DATA space (x: 0..1, y: 0..yMax). Pixel coordinates are
 *   computed on every render — so resizing / zoom is a no-op for the state.
 * - Drag uses Pointer Events + setPointerCapture for unified touch + mouse +
 *   pen behaviour. `touch-action: none` on draggable elements prevents the
 *   page from scrolling while dragging on mobile.
 * - Two-way sync: parent owns the points state and passes onChange. The same
 *   array is rendered by the chart AND by the table input rows in
 *   ProfileDistributionPanel, so editing either updates the other.
 * - Constraints: P0.x = 0 (root) and P3.x = 1 (tip) are fixed; inner control
 *   points must stay monotone in x (P0.x ≤ P1.x ≤ P2.x ≤ P3.x).
 *
 * Zoom / pan:
 * - viewBox-based zoom. We don't transform individual nodes — instead the
 *   SVG viewBox shrinks around a focal point (chart center for buttons,
 *   cursor for scroll-wheel). This means drag math via getScreenCTM() picks
 *   up the new transform automatically — no manual zoom-adjustment in the
 *   control-point drag handler.
 * - Pan only active when zoom > 1 (no reason to pan when the whole chart fits).
 * - Double-click on the background resets zoom + pan.
 *
 * Bundle cost: 0 — only React + Pointer Events. If we ever need brushing,
 * multi-curve overlay, or rich axis controls, swap to visx
 * (@visx/curve + @visx/drag + @visx/zoom) or D3 (d3-drag + d3-zoom + d3-shape).
 */

export interface ControlPoint {
  x: number; // 0..1
  y: number; // 0..yMax
}

export interface BezierEditorProps {
  points: ControlPoint[]; // length 4 for cubic Bézier
  onChange: (points: ControlPoint[]) => void;
  /** Y axis upper bound (data units). Default 24 — matches Figma camber %. */
  yMax?: number;
  /** Y axis lower bound (data units). Default 0. Set to a negative number for
   *  curves that go below zero (e.g. Sweep / Dihedral in Stacking tab). */
  yMin?: number;
  /** Y axis step for grid + labels. Default 2. */
  yStep?: number;
  /** Previous curve for reference (read-only). */
  previousPoints?: ControlPoint[];
  /** Position of the root indicator (orange vertical line) in data x. */
  rootX?: number;
}

// Chart layout in SVG viewport coordinates (base, before zoom).
const VB_WIDTH = 460;
const VB_HEIGHT = 260;
const PAD_LEFT = 40;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 26;

const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const ZOOM_STEP_BUTTON = 1.25; // each click multiplies zoom by this
const ZOOM_STEP_WHEEL = 1.1; // each wheel notch

function dataToPx(p: ControlPoint, yMin: number, yMax: number) {
  const w = VB_WIDTH - PAD_LEFT - PAD_RIGHT;
  const h = VB_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const yRange = yMax - yMin;
  return {
    cx: PAD_LEFT + p.x * w,
    cy: PAD_TOP + (1 - (p.y - yMin) / yRange) * h,
  };
}

function pxToData(cx: number, cy: number, yMin: number, yMax: number): ControlPoint {
  const w = VB_WIDTH - PAD_LEFT - PAD_RIGHT;
  const h = VB_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const yRange = yMax - yMin;
  return {
    x: (cx - PAD_LEFT) / w,
    y: yMin + yRange * (1 - (cy - PAD_TOP) / h),
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function BezierEditor({
  points,
  onChange,
  yMax = 24,
  yMin = 0,
  yStep = 2,
  previousPoints,
  rootX = 0.05,
}: BezierEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Zoom + pan state. panX/panY are offsets to the viewBox top-left in
  // viewBox units (base coords).
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [panningPointerId, setPanningPointerId] = useState<number | null>(null);
  const panStartRef = useRef<{ pointerX: number; pointerY: number; panX: number; panY: number } | null>(null);

  // Computed viewBox. When zoom == 1 this equals the base box.
  // viewW = VB_WIDTH / zoom; viewBox top-left is shifted by pan and by the
  // amount needed to keep the chart centered.
  const viewW = VB_WIDTH / zoom;
  const viewH = VB_HEIGHT / zoom;
  // Centered offset before pan
  const centerOffsetX = (VB_WIDTH - viewW) / 2;
  const centerOffsetY = (VB_HEIGHT - viewH) / 2;
  // Clamp pan so we don't scroll past the chart edges
  const maxPanX = centerOffsetX;
  const maxPanY = centerOffsetY;
  const clampedPanX = clamp(panX, -maxPanX, maxPanX);
  const clampedPanY = clamp(panY, -maxPanY, maxPanY);
  const viewX = centerOffsetX + clampedPanX;
  const viewY = centerOffsetY + clampedPanY;

  // Convert mouse/touch screen coords -> SVG viewBox coords using the SVG CTM.
  // This handles container scaling + viewBox zoom without us having to track them manually.
  function screenToViewBox(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inv = ctm.inverse();
    const local = pt.matrixTransform(inv);
    return { x: local.x, y: local.y };
  }

  // --- Control point drag ---
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

    let { x, y } = pxToData(local.x, local.y, yMin, yMax);
    y = clamp(y, yMin, yMax);

    if (idx === 0) {
      x = 0;
    } else if (idx === points.length - 1) {
      x = 1;
    } else {
      const minX = points[idx - 1].x + 0.001;
      const maxX = points[idx + 1].x - 0.001;
      x = clamp(x, minX, maxX);
    }

    onChange(points.map((p, i) => (i === idx ? { x, y } : p)));
  }

  function handlePointerUp(idx: number, e: React.PointerEvent<SVGCircleElement>) {
    if (draggingIndex !== idx) return;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // ignore — capture may have ended already
    }
    setDraggingIndex(null);
  }

  // --- Zoom ---
  function zoomBy(factor: number, focalScreenX?: number, focalScreenY?: number) {
    const nextZoom = clamp(zoom * factor, ZOOM_MIN, ZOOM_MAX);
    if (nextZoom === zoom) return;

    // If a focal point is given (cursor), keep the data point under it stable.
    // Otherwise zoom around the chart center (pan/center unchanged in viewBox coords).
    if (focalScreenX !== undefined && focalScreenY !== undefined) {
      const local = screenToViewBox(focalScreenX, focalScreenY);
      if (local) {
        const nextViewW = VB_WIDTH / nextZoom;
        const nextViewH = VB_HEIGHT / nextZoom;
        // We want: local.x = nextViewX + (focal_ratio_x) * nextViewW
        //          where focal_ratio_x = (local.x - viewX) / viewW
        const ratioX = (local.x - viewX) / viewW;
        const ratioY = (local.y - viewY) / viewH;
        const nextViewX = local.x - ratioX * nextViewW;
        const nextViewY = local.y - ratioY * nextViewH;
        const nextCenterOffsetX = (VB_WIDTH - nextViewW) / 2;
        const nextCenterOffsetY = (VB_HEIGHT - nextViewH) / 2;
        setPanX(clamp(nextViewX - nextCenterOffsetX, -nextCenterOffsetX, nextCenterOffsetX));
        setPanY(clamp(nextViewY - nextCenterOffsetY, -nextCenterOffsetY, nextCenterOffsetY));
      }
    } else {
      // Centered zoom — keep pan relative to center
      if (nextZoom <= 1) {
        setPanX(0);
        setPanY(0);
      }
    }
    setZoom(nextZoom);
  }

  function handleZoomInClick() {
    zoomBy(ZOOM_STEP_BUTTON);
  }
  function handleZoomOutClick() {
    zoomBy(1 / ZOOM_STEP_BUTTON);
  }
  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    if (e.deltaY === 0) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? ZOOM_STEP_WHEEL : 1 / ZOOM_STEP_WHEEL;
    zoomBy(factor, e.clientX, e.clientY);
  }

  // --- Pan (background drag) ---
  function handleBgPointerDown(e: React.PointerEvent<SVGRectElement>) {
    if (zoom <= 1) return; // no pan when fully zoomed out
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
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // Convert pointer delta from screen pixels to viewBox units
    const screenDx = e.clientX - panStartRef.current.pointerX;
    const screenDy = e.clientY - panStartRef.current.pointerY;
    const vbDx = (screenDx / rect.width) * viewW;
    const vbDy = (screenDy / rect.height) * viewH;
    // Dragging right should reveal content from the left — so pan moves in the opposite direction
    setPanX(panStartRef.current.panX - vbDx);
    setPanY(panStartRef.current.panY - vbDy);
  }

  function handleBgPointerUp(e: React.PointerEvent<SVGRectElement>) {
    if (panningPointerId === null) return;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setPanningPointerId(null);
    panStartRef.current = null;
  }

  function handleBgDoubleClick() {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }

  // --- Path building ---
  function curvePath(pts: ControlPoint[]) {
    if (pts.length < 2) return '';
    const m = dataToPx(pts[0], yMin, yMax);
    let d = `M ${m.cx},${m.cy}`;
    if (pts.length === 4) {
      const c1 = dataToPx(pts[1], yMin, yMax);
      const c2 = dataToPx(pts[2], yMin, yMax);
      const c3 = dataToPx(pts[3], yMin, yMax);
      d += ` C ${c1.cx},${c1.cy} ${c2.cx},${c2.cy} ${c3.cx},${c3.cy}`;
    } else {
      for (let i = 1; i < pts.length; i++) {
        const p = dataToPx(pts[i], yMin, yMax);
        d += ` L ${p.cx},${p.cy}`;
      }
    }
    return d;
  }

  const yTicks: number[] = [];
  // Generate ticks across [yMin, yMax]. Start from a multiple of yStep at or
  // below yMin so labels line up at round values (e.g. -0.3, -0.2, ...).
  const firstTick = Math.ceil(yMin / yStep) * yStep;
  for (let v = firstTick; v <= yMax + 1e-9; v += yStep) {
    // Round to mitigate float drift like 0.30000000000000004
    yTicks.push(Math.round(v / yStep) * yStep);
  }
  const xTicks: number[] = [];
  for (let i = 0; i <= 10; i++) xTicks.push(i / 10);
  const rootPx = dataToPx({ x: rootX, y: 0 }, yMin, yMax).cx;

  // vector-effect="non-scaling-stroke" keeps line widths the same when zoomed.
  // For text we'd need to counter-scale, but the viewBox scale we use is mild
  // enough that text remains readable at ZOOM_MAX = 8x.

  return (
    <div className="relative h-[260px] w-full rounded-md bg-white">
      {/* Zoom controls */}
      <div className="absolute right-2 top-2 z-10 flex flex-col overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={handleZoomInClick}
          disabled={zoom >= ZOOM_MAX}
          className="flex h-6 w-6 items-center justify-center text-[#6b7280] hover:bg-[#f1f5f9] disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={handleZoomOutClick}
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
        aria-label="Camber distribution chart"
        style={{ touchAction: 'none' }}
        onWheel={handleWheel}
      >
        {/* Background — receives pan drag + double-click reset */}
        <rect
          x={viewX}
          y={viewY}
          width={viewW}
          height={viewH}
          fill="transparent"
          style={{ cursor: zoom > 1 ? (panningPointerId !== null ? 'grabbing' : 'grab') : 'default' }}
          onPointerDown={handleBgPointerDown}
          onPointerMove={handleBgPointerMove}
          onPointerUp={handleBgPointerUp}
          onPointerCancel={handleBgPointerUp}
          onDoubleClick={handleBgDoubleClick}
        />

        <text x="6" y="12" fontSize="10" fill="#6b7280">
          (%)
        </text>

        {/* Y grid + labels */}
        {yTicks.map((v) => {
          const { cy } = dataToPx({ x: 0, y: v }, yMin, yMax);
          // Format: integer if yStep >= 1, otherwise enough decimals for yStep
          const decimals = yStep >= 1 ? 0 : Math.max(0, -Math.floor(Math.log10(yStep)));
          const label = v.toFixed(decimals);
          return (
            <g key={`y${v}`}>
              <text x="22" y={cy + 4} fontSize="9" fill="#6b7280">
                {label}
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
          const { cx } = dataToPx({ x: v, y: 0 }, yMin, yMax);
          return (
            <g key={`x${v.toFixed(2)}`}>
              <line
                x1={cx}
                y1={PAD_TOP}
                x2={cx}
                y2={VB_HEIGHT - PAD_BOTTOM}
                stroke="#f1f5f9"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <text x={cx - 9} y={VB_HEIGHT - PAD_BOTTOM + 14} fontSize="9" fill="#6b7280">
                {v.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Root indicator */}
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

        {/* Previous curve (read-only) */}
        {previousPoints && previousPoints.length === points.length && (
          <path
            d={curvePath(previousPoints)}
            fill="none"
            stroke="#22c55e"
            strokeWidth="1.5"
            opacity="0.8"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Tangent dashed lines */}
        {points.length === 4 && (
          <>
            <line
              {...lineProps(points[0], points[1], yMin, yMax)}
              stroke="#0066cc"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.55"
              vectorEffect="non-scaling-stroke"
            />
            <line
              {...lineProps(points[1], points[2], yMin, yMax)}
              stroke="#0066cc"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.55"
              vectorEffect="non-scaling-stroke"
            />
            <line
              {...lineProps(points[2], points[3], yMin, yMax)}
              stroke="#0066cc"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.55"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}

        {/* Active curve */}
        <path
          d={curvePath(points)}
          fill="none"
          stroke="#0066cc"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />

        {/* Draggable control points (rendered LAST so they sit on top) */}
        {points.map((p, idx) => {
          const { cx, cy } = dataToPx(p, yMin, yMax);
          const isDragging = draggingIndex === idx;
          return (
            <g key={idx}>
              {/* Invisible larger hit target for easier grabbing on touch screens */}
              <circle
                cx={cx}
                cy={cy}
                r="14"
                fill="transparent"
                style={{ cursor: 'grab', touchAction: 'none' }}
                onPointerDown={(e) => handlePointerDown(idx, e)}
                onPointerMove={(e) => handlePointerMove(idx, e)}
                onPointerUp={(e) => handlePointerUp(idx, e)}
                onPointerCancel={(e) => handlePointerUp(idx, e)}
              />
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

function lineProps(a: ControlPoint, b: ControlPoint, yMin: number, yMax: number) {
  const A = dataToPx(a, yMin, yMax);
  const B = dataToPx(b, yMin, yMax);
  return { x1: A.cx, y1: A.cy, x2: B.cx, y2: B.cy };
}
