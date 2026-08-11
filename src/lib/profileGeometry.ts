import type { ControlPoint } from '@/types';

/**
 * A profile's "position" (as sent to/from the spars endpoint) is a global
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

/**
 * The arc-length fraction where the contour crosses y = 0 near the leading
 * edge — the boundary between "upper" (y >= 0) and "lower" (y < 0)
 * positions. Verified against real profile data: for one profile this comes
 * out to ~0.551165, not the leading edge's minimum-x vertex (~0.53 for that
 * same profile) — the two are close but not the same point, so this must be
 * derived from the actual zero-crossing, per profile, not assumed as 0.5.
 */
export function leadingEdgeFraction(points: [number, number][]): number {
  const pts = toControlPoints(points);
  if (pts.length === 0) return 0.5;
  const fracs = arcLengthFractions(pts);
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    if (prev.y >= 0 && cur.y < 0) {
      const t = prev.y === cur.y ? 0 : prev.y / (prev.y - cur.y);
      return fracs[i - 1] + (fracs[i] - fracs[i - 1]) * t;
    }
  }
  return 0.5;
}

/** Chordwise fraction (0 = leading edge / min x, 1 = trailing edge / max x)
 *  of a local profile-space x — used to place a spar point on the main
 *  spanwise canvas by interpolating between the leading/trailing edge at
 *  that profile's span position (which only knows chordwise position, not
 *  arc-length around the contour). */
export function chordFractionForLocalX(points: [number, number][], localX: number): number {
  if (points.length === 0) return 0;
  const xs = points.map(([x]) => x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  if (maxX === minX) return 0;
  return Math.max(0, Math.min(1, (localX - minX) / (maxX - minX)));
}
