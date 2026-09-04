import type { ControlPoint, CurveType } from '@/types';

/** Pure, framework-independent math helpers for CurveEditor's data <-> pixel
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

export interface ChartAxis {
  ticks: number[];
  decimals: number;
}

/** One axis' gridline ticks + label decimal count, capped to at most 10
 *  gridlines (see `capStepForTicks`) — shared by every SVG chart's x/y axis. */
export function computeChartAxis(min: number, max: number, step: number): ChartAxis {
  const effectiveStep = capStepForTicks(min, max, step);
  return { ticks: computeTicks(min, max, effectiveStep), decimals: decimalsForStep(effectiveStep) };
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
export function computeProfilesBoundingRect(
  profiles: ControlPoint[][],
  paddingRatio = 0.1,
): MappingBounds {
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
 * instead of only at the sampled points themselves. Points must be sorted
 * by x ascending. Falls back to the
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
  rootX?: number,
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
    const p0 = i > 0 ? px[i - 1] : { cx: 2 * px[0].cx - px[1].cx, cy: 2 * px[0].cy - px[1].cy };
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

/** De Casteljau evaluation of a control polygon at parameter `t` (0..1), in
 *  data space (not pixels) — the same algorithm `bezierControlPolygonPath`
 *  uses for rendering, factored out so curve-type conversion can sample raw
 *  (x,y) points instead of an SVG path string. */
function bezierPointAt(points: ControlPoint[], t: number): ControlPoint {
  let layer = points;
  while (layer.length > 1) {
    const next: ControlPoint[] = [];
    for (let i = 0; i < layer.length - 1; i++) {
      next.push({
        x: layer[i].x + (layer[i + 1].x - layer[i].x) * t,
        y: layer[i].y + (layer[i + 1].y - layer[i].y) * t,
      });
    }
    layer = next;
  }
  return layer[0];
}

/** Catmull-Rom evaluation at a global parameter `t` (0..1) spanning every
 *  segment, in data space — same phantom-endpoint reflection and tension as
 *  `catmullRomPath`, just evaluated directly instead of converted to a
 *  per-segment cubic-Bézier SVG path. */
function catmullRomPointAt(points: ControlPoint[], t: number): ControlPoint {
  const segmentCount = points.length - 1;
  const segmentT = clamp(t, 0, 1) * segmentCount;
  const i = Math.min(Math.floor(segmentT), segmentCount - 1);
  const localT = segmentT - i;
  const p0 = i > 0 ? points[i - 1] : { x: 2 * points[0].x - points[1].x, y: 2 * points[0].y - points[1].y };
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 =
    i + 2 < points.length
      ? points[i + 2]
      : {
          x: 2 * points[points.length - 1].x - points[points.length - 2].x,
          y: 2 * points[points.length - 1].y - points[points.length - 2].y,
        };
  const t2 = localT * localT;
  const t3 = t2 * localT;
  const coeff = [
    -t3 + 2 * t2 - localT,
    3 * t3 - 5 * t2 + 2,
    -3 * t3 + 4 * t2 + localT,
    t3 - t2,
  ];
  return {
    x: 0.5 * (coeff[0] * p0.x + coeff[1] * p1.x + coeff[2] * p2.x + coeff[3] * p3.x),
    y: 0.5 * (coeff[0] * p0.y + coeff[1] * p1.y + coeff[2] * p2.y + coeff[3] * p3.y),
  };
}

/** Samples `count` evenly-t-spaced points along a curve, in data space. */
function sampleCurve(points: ControlPoint[], curveType: CurveType, count: number): ControlPoint[] {
  const evalAt = curveType === 'bezier' ? bezierPointAt : catmullRomPointAt;
  return Array.from({ length: count }, (_, i) => evalAt(points, i / (count - 1)));
}

function binomial(n: number, k: number): number {
  let result = 1;
  for (let i = 0; i < k; i++) result = (result * (n - i)) / (i + 1);
  return result;
}

function bernstein(degree: number, i: number, t: number): number {
  return binomial(degree, i) * Math.pow(t, i) * Math.pow(1 - t, degree - i);
}

/** Solves the small dense linear system `Ax = b` via Gaussian elimination with
 *  partial pivoting — local to the Bézier curve fit below, not a general-purpose
 *  matrix library (the systems here are a handful of control points, never large). */
function solveLinearSystem(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    }
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const pivotVal = m[col][col] || 1e-9;
    for (let row = col + 1; row < n; row++) {
      const factor = m[row][col] / pivotVal;
      for (let k = col; k <= n; k++) m[row][k] -= factor * m[col][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = m[row][n];
    for (let col = row + 1; col < n; col++) sum -= m[row][col] * x[col];
    x[row] = sum / (m[row][row] || 1e-9);
  }
  return x;
}

/**
 * Least-squares fits a degree-(numControlPoints-1) Bézier control polygon to
 * `samples`, pinning the first/last control point to samples' first/last
 * point exactly (both curve families interpolate their own endpoints, so
 * those already match) — the interior control points are the only unknowns,
 * solved via the normal equations of the Bernstein basis (linear in the
 * control points), independently for x and y.
 */
function fitBezierControlPoints(samples: ControlPoint[], numControlPoints: number): ControlPoint[] {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (numControlPoints <= 2) return [first, last];

  const degree = numControlPoints - 1;
  const interior = numControlPoints - 2;
  const basis = samples.map((_, i) => {
    const t = i / (samples.length - 1);
    return Array.from({ length: numControlPoints }, (_, j) => bernstein(degree, j, t));
  });

  const a: number[][] = Array.from({ length: interior }, () => new Array(interior).fill(0));
  const bx = new Array(interior).fill(0);
  const by = new Array(interior).fill(0);
  samples.forEach((sample, i) => {
    const row = basis[i];
    const residualX = sample.x - row[0] * first.x - row[numControlPoints - 1] * last.x;
    const residualY = sample.y - row[0] * first.y - row[numControlPoints - 1] * last.y;
    for (let j = 0; j < interior; j++) {
      for (let k = 0; k < interior; k++) a[j][k] += row[j + 1] * row[k + 1];
      bx[j] += row[j + 1] * residualX;
      by[j] += row[j + 1] * residualY;
    }
  });

  const xs = solveLinearSystem(a, bx);
  const ys = solveLinearSystem(a, by);
  // The fit is unconstrained, so an interior point's x can land slightly outside the
  // curve's own endpoint range — clamp it back in so the result still reads as a point
  // "along" the curve, not one that's drifted past where it starts/ends. Y is left
  // unclamped: a Bézier's interior control point legitimately overshoots the curve's
  // own peak/trough (that's how the curve reaches that height at all — see
  // convertCurvePoints' doc comment), so clamping it would just flatten the fit.
  const xLo = Math.min(first.x, last.x);
  const xHi = Math.max(first.x, last.x);
  return [first, ...xs.map((x, j) => ({ x: clamp(x, xLo, xHi), y: ys[j] })), last];
}

/**
 * Converts a curve's control points from one curve type to the other,
 * approximating the same visual shape instead of resetting to a default —
 * used when the user switches a chart's Spline/Bézier toggle.
 *
 * Bézier -> Spline is close to exact: a spline interpolates whatever points
 * it's given, so sampling the Bézier at N evenly-spaced parameter values and
 * using those samples directly as the new spline points reproduces its shape.
 *
 * Spline -> Bézier can't reuse points directly — a Bézier's interior control
 * points don't sit on the curve (only the first/last do), so matching the
 * spline's shape needs a least-squares curve fit against many samples of it,
 * not a 1:1 point reuse.
 *
 * Point count is preserved (same N in, N out) so the table/chart's point
 * list doesn't change size out from under the user.
 */
export function convertCurvePoints(
  points: ControlPoint[],
  from: CurveType,
  to: CurveType,
): ControlPoint[] {
  if (from === to || points.length < 2) return points;
  if (from === 'bezier') return sampleCurve(points, 'bezier', points.length);
  const samples = sampleCurve(points, 'spline', Math.max(points.length * 12, 40));
  return fitBezierControlPoints(samples, points.length);
}

/** One step of De Casteljau's algorithm: lerp every adjacent pair by `t`. */
function lerpOnce(pts: { cx: number; cy: number }[], t: number): { cx: number; cy: number }[] {
  const next: { cx: number; cy: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    next.push({
      cx: pts[i].cx + (pts[i + 1].cx - pts[i].cx) * t,
      cy: pts[i].cy + (pts[i + 1].cy - pts[i].cy) * t,
    });
  }
  return next;
}

/**
 * Real Bézier curve through a control polygon of N points, evaluated via
 * De Casteljau's algorithm — a single degree-(N-1) curve, NOT a per-segment
 * spline. Only the first and last points sit on the curve; every point in
 * between pulls it without ever being touched by it. Rendered as a sampled
 * polyline since SVG's `C`/`Q` path commands only cover degree 2-3 directly.
 */
export function bezierControlPolygonPath(
  points: ControlPoint[],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  samples = 48,
): string {
  if (points.length < 2) return '';
  const px = points.map((p) => dataToPx(p, xMin, xMax, yMin, yMax));
  let d = '';
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    let layer = px;
    while (layer.length > 1) layer = lerpOnce(layer, t);
    const { cx, cy } = layer[0];
    d += i === 0 ? `M ${cx.toFixed(1)},${cy.toFixed(1)}` : ` L ${cx.toFixed(1)},${cy.toFixed(1)}`;
  }
  return d;
}
