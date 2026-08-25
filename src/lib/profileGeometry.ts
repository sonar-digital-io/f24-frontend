import type { ControlPoint } from '@/types';

/**
 * A profile's "position" is a global
 * arc-length fraction along its ENTIRE closed 2D contour — 0 at the first
 * sampled point (the trailing edge), increasing around the upper surface,
 * reaching the leading-edge (minimum-x) vertex at some profile-specific
 * fraction, then continuing around the lower surface back to 1 at the
 * trailing edge. That leading-edge fraction is NOT a fixed 0.5 — it depends
 * on how the two surfaces are actually sampled (point density differs), so
 * it's derived per profile from the real contour instead of assumed.
 */

function toControlPoints(points: [number, number][]): ControlPoint[] {
  return points.map(([x, y]) => ({ x, y }));
}

/** Cumulative arc-length fraction (0..1) at each point along the ordered contour. */
function arcLengthFractions(points: ControlPoint[]): number[] {
  const dist = [0];
  for (let i = 1; i < points.length; i++) {
    dist.push(dist[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const total = dist[dist.length - 1] || 1;
  return dist.map((d) => d / total);
}

/** Point on the closed contour at a given global arc-length fraction. */
export function pointAtArcFraction(points: [number, number][], fraction: number): ControlPoint {
  const pts = toControlPoints(points);
  if (pts.length === 0) return { x: 0, y: 0 };
  const fracs = arcLengthFractions(pts);
  const t = Math.max(0, Math.min(1, fraction));
  for (let i = 1; i < fracs.length; i++) {
    if (t <= fracs[i]) {
      const segT = fracs[i] === fracs[i - 1] ? 0 : (t - fracs[i - 1]) / (fracs[i] - fracs[i - 1]);
      return {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * segT,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * segT,
      };
    }
  }
  return pts[pts.length - 1];
}

/** Global arc-length fraction of the contour point nearest a given (x, y) —
 *  used to snap a dragged handle back onto the profile's own outline. */
export function arcFractionNearestTo(points: [number, number][], target: ControlPoint): number {
  const pts = toControlPoints(points);
  if (pts.length === 0) return 0;
  const fracs = arcLengthFractions(pts);
  let bestT = 0;
  let bestDist = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby;
    const s = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((target.x - a.x) * abx + (target.y - a.y) * aby) / len2));
    const px = a.x + abx * s;
    const py = a.y + aby * s;
    const d = Math.hypot(target.x - px, target.y - py);
    if (d < bestDist) {
      bestDist = d;
      bestT = fracs[i - 1] + (fracs[i] - fracs[i - 1]) * s;
    }
  }
  return bestT;
}

export interface ProfileDomain {
  domainXMin: number;
  domainXMax: number;
  domainYMin: number;
  domainYMax: number;
}

/** Padded x/y domain bounds for rendering a profile's raw contour points —
 *  scaled to the profile's own bounds (not a fixed aspect ratio) so the
 *  outline fills the chart instead of sitting tiny in a true-aspect box. */
export function profileDomainFromPoints(points: [number, number][]): ProfileDomain {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const xMin = xs.length ? Math.min(...xs) : 0;
  const xMax = xs.length ? Math.max(...xs) : 1;
  const yMin = ys.length ? Math.min(...ys) : -0.1;
  const yMax = ys.length ? Math.max(...ys) : 0.1;
  const xPad = (xMax - xMin) * 0.08 || 0.1;
  const yPad = (yMax - yMin) * 0.15 || 0.02;
  return {
    domainXMin: xMin - xPad,
    domainXMax: xMax + xPad,
    domainYMin: yMin - yPad,
    domainYMax: yMax + yPad,
  };
}
