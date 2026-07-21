import { useRef, useState } from 'react';

/**
 * Lightweight 2D airfoil preview using the NACA 4-digit parametric equations.
 *
 * When startPosition / endPosition are provided the component is interactive:
 *   - full outline = thin black "rail"
 *   - arc between the two positions = thick blue segment (shorter arc wins)
 *   - two draggable handles snap along the rail
 *
 * Signed chord-position convention:
 *   positive → upper surface (0 = leading edge, 1 = trailing edge)
 *   negative → lower surface (0 = leading edge, -1 = trailing edge)
 */

interface AirfoilPreviewProps {
  maxCamber: number; // %
  maxCamberPosition: number; // %
  thickness: number; // %
  className?: string;
  startPosition?: number;
  endPosition?: number;
  onStartChange?: (val: number) => void;
  onEndChange?: (val: number) => void;
}

export function AirfoilPreview({
  maxCamber,
  maxCamberPosition,
  thickness,
  className,
  startPosition,
  endPosition,
  onStartChange,
  onEndChange,
}: AirfoilPreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const m = maxCamber / 100;
  const p = Math.max(0.001, Math.min(0.999, maxCamberPosition / 100));
  const t = thickness / 100;
  const N = 50;

  function yt(x: number) {
    return (
      (t / 0.2) *
      (0.2969 * Math.sqrt(x) -
        0.126 * x -
        0.3516 * x * x +
        0.2843 * x * x * x -
        0.1015 * x * x * x * x)
    );
  }

  function yc(x: number) {
    if (x < p) return (m / (p * p)) * (2 * p * x - x * x);
    return (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x);
  }

  function dycDx(x: number) {
    if (x < p) return ((2 * m) / (p * p)) * (p - x);
    return ((2 * m) / ((1 - p) * (1 - p))) * (p - x);
  }

  function nacaPt(x: number, upper: boolean): [number, number] {
    const theta = Math.atan(dycDx(x));
    const ytx = yt(x);
    const ycx = yc(x);
    const px = upper ? x - ytx * Math.sin(theta) : x + ytx * Math.sin(theta);
    const py = upper ? ycx + ytx * Math.cos(theta) : ycx - ytx * Math.cos(theta);
    return [px, py];
  }

  const upperPts: [number, number][] = [];
  const lowerPts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const x = 0.5 * (1 - Math.cos((Math.PI * i) / N));
    upperPts.push(nacaPt(x, true));
    lowerPts.push(nacaPt(x, false));
  }

  // allPts[0] = upper trailing edge, allPts[N] = leading edge, allPts[2N] = lower trailing edge
  const allPts: [number, number][] = [...upperPts.slice().reverse(), ...lowerPts];

  const vbW = 400;
  const vbH = 100;
  const padX = 12;
  const padY = 8;
  const innerW = vbW - 2 * padX;
  const innerH = vbH - 2 * padY;
  const yScale = 3.5;

  function toSvg([x, y]: [number, number]): [number, number] {
    return [padX + x * innerW, vbH / 2 - y * innerH * yScale];
  }

  function ptStr(pt: [number, number]): string {
    const [sx, sy] = toSvg(pt);
    return `${sx.toFixed(2)},${sy.toFixed(2)}`;
  }

  // Signed chord position → allPts index
  function signedToIdx(pos: number): number {
    const x = Math.abs(pos);
    const j = Math.round((N / Math.PI) * Math.acos(Math.max(-1, Math.min(1, 1 - 2 * x))));
    return pos >= 0 ? N - j : N + j;
  }

  // allPts index → signed chord position
  function idxToSigned(idx: number): number {
    const j = idx <= N ? N - idx : idx - N;
    const x = 0.5 * (1 - Math.cos((Math.PI * j) / N));
    return idx <= N ? x : -x;
  }

  // Shorter arc between two indices (wraps around trailing edge if needed)
  function segPts(idxA: number, idxB: number): [number, number][] {
    const lo = Math.min(idxA, idxB);
    const hi = Math.max(idxA, idxB);
    if (hi - lo <= N) return allPts.slice(lo, hi + 1);
    return [...allPts.slice(hi), ...allPts.slice(0, lo + 1)];
  }

  // Closest allPts index to SVG viewBox coordinates
  function closestIdx(svgX: number, svgY: number): number {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i <= 2 * N; i++) {
      const [sx, sy] = toSvg(allPts[i]);
      const d = (sx - svgX) ** 2 + (sy - svgY) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  function ptrToSvg(e: React.PointerEvent): [number, number] {
    const rect = svgRef.current!.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * vbW,
      ((e.clientY - rect.top) / rect.height) * vbH,
    ];
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragging) return;
    const [svgX, svgY] = ptrToSvg(e);
    const val = Math.round(idxToSigned(closestIdx(svgX, svgY)) * 100) / 100;
    if (dragging === 'start') onStartChange?.(val);
    else onEndChange?.(val);
  }

  function startDrag(which: 'start' | 'end', e: React.PointerEvent<SVGCircleElement>) {
    e.preventDefault();
    // Capture on the SVG so onPointerMove fires there even outside bounds
    svgRef.current!.setPointerCapture(e.pointerId);
    setDragging(which);
  }

  const fullPath = `M ${allPts.map(ptStr).join(' L ')} Z`;

  const interactive = startPosition !== undefined && endPosition !== undefined;
  const startIdx = interactive ? signedToIdx(startPosition!) : null;
  const endIdx = interactive ? signedToIdx(endPosition!) : null;
  const segmentPath =
    interactive ? `M ${segPts(startIdx!, endIdx!).map(ptStr).join(' L ')}` : null;
  const startPt = startIdx !== null ? toSvg(allPts[startIdx]) : null;
  const endPt = endIdx !== null ? toSvg(allPts[endIdx]) : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${vbW} ${vbH}`}
      className={className}
      aria-label="2D airfoil preview"
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={handlePointerMove}
      onPointerUp={() => setDragging(null)}
      style={dragging ? { cursor: 'grabbing' } : undefined}
    >
      {/* Full outline — thin black rail */}
      <path d={fullPath} fill="none" stroke="#1a1a1a" strokeWidth="1.5" />

      {/* Active segment — thick blue */}
      {segmentPath && (
        <path
          d={segmentPath}
          fill="none"
          stroke="#0066cc"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Handles */}
      {startPt && (
        <g>
          <circle
            cx={startPt[0]}
            cy={startPt[1]}
            r={14}
            fill="transparent"
            style={{ cursor: dragging === 'start' ? 'grabbing' : 'grab', touchAction: 'none' }}
            onPointerDown={(e) => startDrag('start', e)}
          />
          <circle cx={startPt[0]} cy={startPt[1]} r={dragging === 'start' ? 7 : 6} fill="#0066cc" style={{ pointerEvents: 'none' }} />
          <circle cx={startPt[0]} cy={startPt[1]} r={3} fill="white" style={{ pointerEvents: 'none' }} />
        </g>
      )}
      {endPt && (
        <g>
          <circle
            cx={endPt[0]}
            cy={endPt[1]}
            r={14}
            fill="transparent"
            style={{ cursor: dragging === 'end' ? 'grabbing' : 'grab', touchAction: 'none' }}
            onPointerDown={(e) => startDrag('end', e)}
          />
          <circle cx={endPt[0]} cy={endPt[1]} r={dragging === 'end' ? 7 : 6} fill="#0066cc" style={{ pointerEvents: 'none' }} />
          <circle cx={endPt[0]} cy={endPt[1]} r={3} fill="white" style={{ pointerEvents: 'none' }} />
        </g>
      )}
    </svg>
  );
}
