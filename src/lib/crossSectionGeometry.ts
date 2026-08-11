/** Pure, framework-independent SVG geometry helpers for `CrossSectionDialog`'s
 *  cross-section rendering. */

/**
 * Shift every SVG-space point inward along the local perpendicular by `offset`
 * viewport units. The allPts curve is CW in screen coords, so the inward normal
 * at tangent (tx, ty) is (ty/|t|, −tx/|t|).
 */
export function offsetSvgPts(svgPts: [number, number][], offset: number): [number, number][] {
  const n = svgPts.length;
  return svgPts.map((_, i) => {
    const [xi, yi] = svgPts[i];
    const prev = svgPts[(i - 1 + n) % n];
    const next = svgPts[(i + 1) % n];
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const len = Math.sqrt(tx * tx + ty * ty);
    if (len < 1e-10) return [xi, yi] as [number, number];
    return [xi + (ty / len) * offset, yi + (-tx / len) * offset] as [number, number];
  });
}

/** Cumulative arc-length fractions along svgPts (0 at index 0, 1 at last index). */
export function computeArcFractions(svgPts: [number, number][]): number[] {
  const n = svgPts.length;
  const cum = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    const dx = svgPts[i][0] - svgPts[i - 1][0];
    const dy = svgPts[i][1] - svgPts[i - 1][1];
    cum[i] = cum[i - 1] + Math.sqrt(dx * dx + dy * dy);
  }
  const total = cum[n - 1];
  return total > 0 ? cum.map((l) => l / total) : cum;
}

/** Perimeter-fraction (0..1, as returned by the transversal mapping endpoint)
 *  → nearest point index, via binary search over the monotonically
 *  increasing arc fractions from `computeArcFractions`. */
export function fracToIdx(arcFracs: number[], frac: number): number {
  let lo = 0;
  let hi = arcFracs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arcFracs[mid] < frac) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Label for a perimeter fraction (0..1) relative to the leading edge. */
export function perimeterLabel(frac: number, leFrac: number): string {
  if (frac < 0.005) return 'Upper TE';
  if (frac > 0.995) return 'Lower TE';
  if (Math.abs(frac - leFrac) < 0.02) return 'Leading edge';
  return frac < leFrac ? `Upper ${frac.toFixed(2)}` : `Lower ${(1 - frac).toFixed(2)}`;
}

/** Point on the contour at an exact perimeter fraction, interpolated between
 *  its two bracketing samples — used so a segment's endpoints land precisely
 *  where the mapping says, instead of snapping to the nearest sampled point
 *  (which is what `fracToIdx` alone gives, and where those segments used to
 *  visibly cut a corner short of their real position). */
export function interpolateAtFraction(
  pts: [number, number][],
  arcFracs: number[],
  frac: number,
): [number, number] {
  const n = pts.length;
  if (n === 0) return [0, 0];
  if (frac <= arcFracs[0]) return pts[0];
  if (frac >= arcFracs[n - 1]) return pts[n - 1];
  const idx = fracToIdx(arcFracs, frac);
  const prevIdx = Math.max(0, idx - 1);
  const f0 = arcFracs[prevIdx];
  const f1 = arcFracs[idx];
  const t = f1 === f0 ? 0 : (frac - f0) / (f1 - f0);
  const [x0, y0] = pts[prevIdx];
  const [x1, y1] = pts[idx];
  return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
}

/**
 * Points tracing the arc between two perimeter fractions (0..1) along a
 * closed contour — endpoints are the exact interpolated fraction, not the
 * nearest sample; wraps through the 0/1 seam only when `endFrac < startFrac`.
 */
export function buildArcPoints(
  svgPts: [number, number][],
  arcFracs: number[],
  startFrac: number,
  endFrac: number,
): [number, number][] {
  const wrap = endFrac < startFrac;
  const lo = Math.min(startFrac, endFrac);
  const hi = Math.max(startFrac, endFrac);
  const loPt = interpolateAtFraction(svgPts, arcFracs, lo);
  const hiPt = interpolateAtFraction(svgPts, arcFracs, hi);
  const loIdx = fracToIdx(arcFracs, lo);
  const hiIdx = fracToIdx(arcFracs, hi);
  if (!wrap) {
    return [loPt, ...svgPts.slice(loIdx, hiIdx), hiPt];
  }
  return [hiPt, ...svgPts.slice(hiIdx), ...svgPts.slice(0, loIdx), loPt];
}

export function segD(pts: [number, number][]): string {
  return 'M ' + pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L ');
}

/** Fit arbitrary data-space points into an SVG viewport: uniform scale (both
 *  axes, so the true shape/aspect ratio is preserved), centered within the
 *  padded area, Y flipped (data-space up = smaller SVG y). */
export function fitPointsToSvg(
  points: [number, number][],
  innerW: number,
  innerH: number,
  padX: number,
  padY: number,
): [number, number][] {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xRange = Math.max(xMax - xMin, 1e-9);
  const yRange = Math.max(yMax - yMin, 1e-9);
  const scale = Math.min(innerW / xRange, innerH / yRange);
  const drawW = xRange * scale;
  const drawH = yRange * scale;
  const offsetX = padX + (innerW - drawW) / 2;
  const offsetY = padY + (innerH - drawH) / 2;
  return points.map(([x, y]) => [
    offsetX + (x - xMin) * scale,
    offsetY + (yMax - y) * scale,
  ]);
}

