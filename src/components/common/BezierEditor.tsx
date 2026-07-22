import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ControlPoint } from '@/types';
import { BezierZoomControls } from '@/components/common/BezierZoomControls';
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
 * - Drag anchor          → move it (endpoints locked to xMin / xMax)
 * - Double-click anchor  → remove it (not available for the two endpoints)
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
  yUnit?: string;
  className?: string;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const ZOOM_STEP = 1.25;

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
  yUnit = '',
  className,
}: BezierEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Ghost curve: snapshot of control points at the moment a drag starts.
  // Rendered in green while dragging, cleared (via draggingIndex→null) on release.
  const preEditPointsRef = useRef<ControlPoint[] | null>(null);

  // Zoom + pan
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

  // Track whether a background pointer-down resulted in actual panning so we
  // can distinguish a plain click (→ add point) from a drag-end.
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
    if (idx === 0 || idx === points.length - 1) {
      // Endpoints move vertically only — pinned to their CURRENT x, not to
      // xMin/xMax, so callers may keep endpoints inside the visible range.
      x = points[idx].x;
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
  }

  // Double-click a middle anchor to remove it
  function handlePointDoubleClick(idx: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (idx === 0 || idx === points.length - 1) return; // keep endpoints
    if (points.length <= 3) return; // keep minimum 3 points
    onChange(points.filter((_, i) => i !== idx));
  }

  // ── Zoom (buttons only — no scroll wheel) ────────────────────────────────
  function zoomBy(factor: number) {
    const next = clamp(zoom * factor, ZOOM_MIN, ZOOM_MAX);
    if (next === zoom) return;
    if (next <= 1) { setPanX(0); setPanY(0); }
    setZoom(next);
  }

  // ── Background: pan + add point ──────────────────────────────────────────
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
    if (dx * dx + dy * dy > 16) hasPannedRef.current = true; // 4 px threshold
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

  /** Click on background → insert a new anchor at that data position. */
  function handleBgClick(e: React.MouseEvent<SVGRectElement>) {
    if (hasPannedRef.current) return; // ignore drag-end clicks
    const local = screenToViewBox(e.clientX, e.clientY);
    if (!local) return;
    let { x, y } = pxToData(local.x, local.y, xMin, xMax, yMin, yMax);
    // Stay strictly between the two fixed endpoints (which may sit inside
    // the xMin..xMax range), so the point array stays x-sorted.
    const firstX = points[0]?.x ?? xMin;
    const lastX = points[points.length - 1]?.x ?? xMax;
    const margin = (xMax - xMin) * 0.02;
    if (lastX - firstX <= 2 * margin) return;
    x = clamp(x, firstX + margin, lastX - margin);
    y = clamp(y, yMin, yMax);
    // Skip if too close to an existing anchor
    if (points.some((p) => Math.abs(p.x - x) < (xMax - xMin) * 0.03)) return;
    // Insert in x-sorted order (always before the last fixed endpoint)
    const insertIdx = points.findIndex((p, i) => i > 0 && p.x >= x);
    const idx = insertIdx === -1 ? points.length - 1 : insertIdx;
    onChange([...points.slice(0, idx), { x, y }, ...points.slice(idx)]);
  }

  function handleBgDoubleClick() {
    setZoom(1);
    setPanX(0);
    setPanY(0);
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
  const rootPx = dataToPx({ x: rootX, y: 0 }, xMin, xMax, yMin, yMax).cx;

  return (
    <div className={cn('relative h-[260px] w-full rounded-md bg-white', className)}>
      {/* Zoom controls */}
      <BezierZoomControls
        onZoomIn={() => zoomBy(ZOOM_STEP)}
        onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
        canZoomIn={zoom < ZOOM_MAX}
        canZoomOut={zoom > ZOOM_MIN}
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
          onPointerDown={handleBgPointerDown}
          onPointerMove={handleBgPointerMove}
          onPointerUp={handleBgPointerUp}
          onPointerCancel={handleBgPointerUp}
          onClick={handleBgClick}
          onDoubleClick={handleBgDoubleClick}
        />

        {yUnit && (
          <text x="6" y="12" fontSize="10" fill="#6b7280">
            [{yUnit}]
          </text>
        )}

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
          const isDragging = draggingIndex === idx;
          const isEndpoint = idx === 0 || idx === points.length - 1;
          return (
            <g key={idx}>
              {/* Invisible hit area (larger than visible dot for easier grab) */}
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
                onDoubleClick={(e) => handlePointDoubleClick(idx, e)}
              >
                {!isEndpoint && (
                  <title>Drag to move · Double-click to remove</title>
                )}
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
