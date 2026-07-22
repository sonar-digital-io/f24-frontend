import type { ControlPoint } from '@/components/common/BezierEditor';

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

/**
 * Constrains a control point's x drag to stay within its neighbors (with a
 * small margin), while locking the first/last point to the 0..1 domain ends.
 */
export function applyXConstraints(points: ControlPoint[], idx: number, nextX: number): number {
  if (idx === 0) return 0;
  if (idx === points.length - 1) return 1;
  const minX = points[idx - 1].x + 0.001;
  const maxX = points[idx + 1].x - 0.001;
  return Math.max(minX, Math.min(maxX, nextX));
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
