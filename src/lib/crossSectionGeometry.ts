/** Pure, framework-independent NACA airfoil + SVG geometry helpers for
 *  `CrossSectionDialog`'s cross-section rendering. */

const N = 50;

// ─── NACA math ────────────────────────────────────────────────────────────────

// allPts[0] = upper TE (x=1), allPts[N] = LE (x=0), allPts[2N] = lower TE (x=1)
export function buildAllPts(m: number, p: number, t: number): [number, number][] {
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
    return x < p
      ? (m / (p * p)) * (2 * p * x - x * x)
      : (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x);
  }
  function dycDx(x: number) {
    return x < p
      ? ((2 * m) / (p * p)) * (p - x)
      : ((2 * m) / ((1 - p) * (1 - p))) * (p - x);
  }
  function nacaPt(x: number, upper: boolean): [number, number] {
    const theta = Math.atan(dycDx(x));
    const ytx = yt(x);
    const ycx = yc(x);
    return upper
      ? [x - ytx * Math.sin(theta), ycx + ytx * Math.cos(theta)]
      : [x + ytx * Math.sin(theta), ycx - ytx * Math.cos(theta)];
  }
  const upper: [number, number][] = [];
  const lower: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const x = 0.5 * (1 - Math.cos((Math.PI * i) / N));
    upper.push(nacaPt(x, true));
    lower.push(nacaPt(x, false));
  }
  return [...upper.slice().reverse(), ...lower];
}

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

// signed chord position (−1..1) → allPts index
export function signedToIdx(pos: number): number {
  const x = Math.abs(pos);
  const j = Math.round((N / Math.PI) * Math.acos(Math.max(-1, Math.min(1, 1 - 2 * x))));
  return pos >= 0 ? N - j : N + j;
}

/** Label for a regular-layup perimeter fraction. */
export function perimeterLabel(frac: number, leFrac: number): string {
  if (frac < 0.005) return 'Upper TE';
  if (frac > 0.995) return 'Lower TE';
  if (Math.abs(frac - leFrac) < 0.02) return 'Leading edge';
  return frac < leFrac ? `Upper ${frac.toFixed(2)}` : `Lower ${(1 - frac).toFixed(2)}`;
}

/** Label for a signed chord position (transversal). */
export function chordLabel(pos: number): string {
  if (Math.abs(pos) < 0.015) return 'Leading edge';
  if (Math.abs(pos - 1) < 0.015) return 'Upper TE';
  if (Math.abs(pos + 1) < 0.015) return 'Lower TE';
  return pos > 0 ? `Upper ${pos.toFixed(2)}` : `Lower ${Math.abs(pos).toFixed(2)}`;
}

/** Extract path points from pre-computed SVG-offset point array. */
export function getSegPts(
  svgPts: [number, number][],
  lo: number,
  hi: number,
  wrap: boolean,
): [number, number][] {
  if (!wrap) return svgPts.slice(lo, hi + 1);
  return [...svgPts.slice(hi), ...svgPts.slice(0, lo + 1)];
}

export function segD(pts: [number, number][]): string {
  return 'M ' + pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L ');
}

export const CROSS_SECTION_N = N;
