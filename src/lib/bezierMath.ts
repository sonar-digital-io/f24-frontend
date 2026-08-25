import type { ControlPoint } from '@/types';

/** Pure, framework-independent math helpers for `BezierEditor`'s data <-> pixel
 *  mapping and Catmull-Rom curve construction. */

export const VB_WIDTH = 460;
export const VB_HEIGHT = 260;
export const PAD_LEFT = 40;
export const PAD_RIGHT = 12;
export const PAD_TOP = 16;
export const PAD_BOTTOM = 26;

export function dataToPx(p: ControlPoint, xMin: number, xMax: number, yMin: number, yMax: number) {
  const w = VB_WIDTH - PAD_LEFT - PAD_RIGHT;
  const h = VB_HEIGHT - PAD_TOP - PAD_BOTTOM;
  return {
    cx: PAD_LEFT + ((p.x - xMin) / (xMax - xMin)) * w,
    cy: PAD_TOP + (1 - (p.y - yMin) / (yMax - yMin)) * h,
  };
}

export function pxToData(
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

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Evenly-spaced axis tick values in [min, max], starting at the first multiple of `step` >= min. */
export function computeTicks(min: number, max: number, step: number): number[] {
  const ticks: number[] = [];
  const first = Math.ceil(min / step) * step;
  for (let v = first; v <= max + 1e-9; v += step) {
    ticks.push(Math.round(v / step) * step);
  }
  return ticks;
}

/** Decimal places to display for a tick step (0 for whole-number steps). */
export function decimalsForStep(step: number): number {
  return step >= 1 ? 0 : Math.max(0, -Math.floor(Math.log10(step)));
}

/** "Nice" axis step (1/2/5 × 10^n) that gives roughly `targetTicks` grid lines over `range`. */
export function niceStep(range: number, targetTicks = 8): number {
  if (!(range > 0)) return 1;
  const raw = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const nice = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  return nice * mag;
}

/**
 * Widens `step` (if needed) to a "nice" step so that plotting `[min, max]`
 * with it never draws more than `maxTicks` gridlines. Callers sometimes pass
 * a fixed step for a range that's user-editable (e.g. chart Y bounds) — once
 * the range grows, that fixed step alone can flood the chart with gridlines.
 */
export function capStepForTicks(min: number, max: number, step: number, maxTicks = 10): number {
  if (!(max > min) || !(step > 0)) return step;
  const range = max - min;
  return range / step <= maxTicks ? step : niceStep(range, maxTicks);
}

/** SVG `<polygon points="...">` string for a set of data points, mapped through `dataToPx`. */
export function pointsToPolygonString(
  points: ControlPoint[],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
): string {
  return points
    .map((p) => {
      const { cx, cy } = dataToPx(p, xMin, xMax, yMin, yMax);
      return `${cx.toFixed(1)},${cy.toFixed(1)}`;
    })
    .join(' ');
}

export interface MappingBounds {
  longitudinalMin: number;
  longitudinalMax: number;
  transversalMin: number;
  transversalMax: number;
}

/**
 * Longitudinal-mapping chart bounds — ported from the sibling project's
 * `updateTopViewDrawing`: raw min/max over the blade's leading+trailing edge
 * (both in absolute/real units, straight from GET /geometry/:id/top-view/),
 * padded by `paddingRatio`, then expanded further so any already-saved
 * mapping point (also absolute) is never clipped outside the chart.
 */
export function computeMappingBounds(
  leadingEdge: ControlPoint[],
  trailingEdge: ControlPoint[],
  existingPoints: ControlPoint[],
  paddingRatio = 0.1,
): MappingBounds {
  const edgePoints = [...leadingEdge, ...trailingEdge];
  if (edgePoints.length === 0) {
    return { longitudinalMin: 0, longitudinalMax: 1, transversalMin: -1, transversalMax: 1 };
  }
  const rawLongMin = Math.min(...edgePoints.map((p) => p.x));
  const rawLongMax = Math.max(...edgePoints.map((p) => p.x));
  const rawTransMin = Math.min(...edgePoints.map((p) => p.y));
  const rawTransMax = Math.max(...edgePoints.map((p) => p.y));

  // Reference project's formula multiplies the transversal range by
  // paddingRatio*longitudinalRange then divides by that same transversal
  // range again — it cancels out, leaving padding proportional to the
  // longitudinal range only (kept as-is to match its actual behavior).
  const longitudinalPadding = (rawLongMax - rawLongMin) * paddingRatio;
  const transversalPadding = (paddingRatio * (rawLongMax - rawLongMin)) / 2;

  let longitudinalMin = rawLongMin - longitudinalPadding;
  let longitudinalMax = rawLongMax + longitudinalPadding;
  let transversalMin = rawTransMin - transversalPadding;
  let transversalMax = rawTransMax + transversalPadding;

  existingPoints.forEach((p) => {
    if (p.x > longitudinalMax) longitudinalMax = p.x;
    if (p.x < longitudinalMin) longitudinalMin = p.x;
    if (p.y > transversalMax) transversalMax = p.y;
    if (p.y < transversalMin) transversalMin = p.y;
  });

  return { longitudinalMin, longitudinalMax, transversalMin, transversalMax };
}

/**
 * Bounding box over every point of every top-view `profiles` segment (root,
 * tip, and any others), padded by `paddingRatio` independently in each
 * direction — used to seed a brand-new layup mapping's rectangle.
 */
export function computeProfilesBoundingRect(profiles: ControlPoint[][], paddingRatio = 0.1): MappingBounds {
  const points = profiles.flat();
  if (points.length === 0) {
    return { longitudinalMin: 0, longitudinalMax: 1, transversalMin: -1, transversalMax: 1 };
  }
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const xPad = (maxX - minX) * paddingRatio;
  const yPad = (maxY - minY) * paddingRatio;
  return {
    longitudinalMin: minX - xPad,
    longitudinalMax: maxX + xPad,
    transversalMin: minY - yPad,
    transversalMax: maxY + yPad,
  };
}

/**
 * Linearly interpolates a sampled edge curve's y at a given x — used to find
 * where the leading/trailing edge sits at an arbitrary spanwise position
 * (e.g. a spar's profile position) instead of only at the sampled points
 * themselves. Points must be sorted by x ascending. Falls back to the
 * nearest endpoint's y when x is outside the sampled range.
 */
export function interpolateEdgeY(points: ControlPoint[], x: number): number {
  if (points.length === 0) return 0;
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
      return a.y + (b.y - a.y) * t;
    }
  }
  return points[points.length - 1].y;
}

/**
 * Constrains a control point's x drag to stay within its neighbors (with a
 * small margin). The first/last point may move too, but stay within the
 * xMin..xMax domain and can't cross their nearest neighbor — e.g. the first
 * point represents the profile's start position, which must stay within the
 * chart's range and can't pass the second point.
 */
export function applyXConstraints(
  points: ControlPoint[],
  idx: number,
  nextX: number,
  xMin = 0,
  xMax = 1,
  /** Point 0 additionally can't sit past this (e.g. the profile's start position). */
  rootX?: number
): number {
  const eps = (xMax - xMin) * 0.001 || 0.001;
  if (idx === 0) {
    const neighborUpper = points[1] ? points[1].x - eps : xMax;
    const upper = rootX !== undefined ? Math.min(neighborUpper, rootX) : neighborUpper;
    return Math.max(xMin, Math.min(upper, nextX));
  }
  if (idx === points.length - 1) {
    const lower = points[idx - 1] ? points[idx - 1].x + eps : xMin;
    return Math.max(lower, Math.min(xMax, nextX));
  }
  const minX = points[idx - 1].x + eps;
  const maxX = points[idx + 1].x - eps;
  return Math.max(minX, Math.min(maxX, nextX));
}

/** The layup-mapping polygon can never drop below this many corners. */
export const MIN_LAYUP_POLYGON_POINTS = 4;

/**
 * Whether a closed polygon (points listed in order) is convex — no vertex bends
 * back in on the shape. Used to block edits to the layup-mapping polygon that
 * would fold it into a concave shape. Consecutive collinear points (zero cross
 * product) don't count as a direction change by themselves.
 */
export function isConvexPolygon(points: ControlPoint[]): boolean {
  const n = points.length;
  if (n < 4) return true;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const c = points[(i + 2) % n];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross === 0) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/**
 * Catmull-Rom → cubic Bézier approximation.
 * Tension = 1/6 (standard uniform Catmull-Rom).
 * Phantom endpoints are reflected so the curve reaches both ends cleanly.
 */
export function catmullRomPath(
  pts: ControlPoint[],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
): string {
  if (pts.length < 2) return '';
  const px = pts.map((p) => dataToPx(p, xMin, xMax, yMin, yMax));
  let d = `M ${px[0].cx.toFixed(1)},${px[0].cy.toFixed(1)}`;
  for (let i = 0; i < px.length - 1; i++) {
    const p0 =
      i > 0
        ? px[i - 1]
        : { cx: 2 * px[0].cx - px[1].cx, cy: 2 * px[0].cy - px[1].cy };
    const p1 = px[i];
    const p2 = px[i + 1];
    const p3 =
      i + 2 < px.length
        ? px[i + 2]
        : {
            cx: 2 * px[px.length - 1].cx - px[px.length - 2].cx,
            cy: 2 * px[px.length - 1].cy - px[px.length - 2].cy,
          };
    const t = 1 / 6;
    const cp1x = p1.cx + (p2.cx - p0.cx) * t;
    const cp1y = p1.cy + (p2.cy - p0.cy) * t;
    const cp2x = p2.cx - (p3.cx - p1.cx) * t;
    const cp2y = p2.cy - (p3.cy - p1.cy) * t;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.cx.toFixed(1)},${p2.cy.toFixed(1)}`;
  }
  return d;
}
