import { useRef, useState } from 'react';
import type { ControlPoint } from '@/types';
import { clamp, pxToData } from '@/lib/bezierMath';

interface UseCurveEditorInteractionsOptions {
  points: ControlPoint[];
  onChange: (points: ControlPoint[]) => void;
  /** Fires once a drag actually completes (pointer up/cancel after a real move) —
   *  distinct from `onChange`, which fires continuously while dragging. */
  onCommit?: () => void;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xStep: number;
  yStep: number;
  rootX: number;
  showRootIndicator: boolean;
  minPoints: number;
  screenToViewBox: (clientX: number, clientY: number) => { x: number; y: number } | null;
  hasPannedRef: React.MutableRefObject<boolean>;
}

/**
 * Anchor drag/keyboard-nudge/insert/delete interaction logic — shared by
 * `CubicSplineEditor` and `BezierEditor`, whose point-manipulation UX is
 * identical; they differ only in how the curve itself is drawn from the
 * resulting points
 * — pure state + handlers, no JSX. Extracted so the component body stays
 * focused on rendering; every handler here closes over the same `points`/
 * `onChange` the component receives as props.
 */
export function useCurveEditorInteractions({
  points,
  onChange,
  onCommit,
  xMin,
  xMax,
  yMin,
  yMax,
  xStep,
  yStep,
  rootX,
  showRootIndicator,
  minPoints,
  screenToViewBox,
  hasPannedRef,
}: UseCurveEditorInteractionsOptions) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  // True while dragging point 0 past rootX — shows the "can't go past start
  // position" label instead of silently clamping without feedback.
  const [blockedAtRoot, setBlockedAtRoot] = useState(false);

  // Ghost curve: snapshot of control points at the moment a drag starts.
  // Rendered in green while dragging, cleared (via draggingIndex→null) on release.
  const preEditPointsRef = useRef<ControlPoint[] | null>(null);

  function handlePointerDown(idx: number, e: React.PointerEvent<SVGCircleElement>) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    // Snapshot before edit — shown as green ghost while dragging
    preEditPointsRef.current = points.map((p) => ({ ...p }));
    setDraggingIndex(idx);
  }

  // The first/last point's x is bounded by its neighbor (and, for point 0
  // when shown, the root-position marker); interior points are bounded by
  // both neighbors. Shared by pointer-drag and the keyboard-nudge fallback.
  function clampPointX(idx: number, x: number): number {
    const xEps = (xMax - xMin) * 0.001;
    if (idx === 0) {
      const neighborUpper = points.length > 1 ? points[1].x - xEps : xMax;
      const upper = showRootIndicator ? Math.min(neighborUpper, rootX) : neighborUpper;
      return clamp(x, xMin, upper);
    }
    if (idx === points.length - 1) {
      const lower = points.length > 1 ? points[idx - 1].x + xEps : xMin;
      return clamp(x, lower, xMax);
    }
    return clamp(x, points[idx - 1].x + xEps, points[idx + 1].x - xEps);
  }

  function handlePointerMove(idx: number, e: React.PointerEvent<SVGCircleElement>) {
    if (draggingIndex !== idx) return;
    const local = screenToViewBox(e.clientX, e.clientY);
    if (!local) return;
    let { x, y } = pxToData(local.x, local.y, xMin, xMax, yMin, yMax);
    y = clamp(y, yMin, yMax);
    // The first point represents the start position — draggable in x too,
    // bounded by the chart's xMin, the next point, and (when shown) rootX —
    // it can sit before the start position, but never past it.
    if (idx === 0 && showRootIndicator) setBlockedAtRoot(x > rootX);
    x = clampPointX(idx, x);
    onChange(points.map((p, i) => (i === idx ? { x, y } : p)));
  }

  // Keyboard alternative to dragging (arrow keys nudge by a tenth of a grid
  // step) and to double-click-to-delete (Delete/Backspace) — the anchor is
  // otherwise mouse/touch-only.
  function handleKeyDown(idx: number, e: React.KeyboardEvent<SVGCircleElement>) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (points.length <= minPoints) return;
      onChange(points.filter((_, i) => i !== idx));
      onCommit?.();
      return;
    }
    const point = points[idx];
    let x = point.x;
    let y = point.y;
    switch (e.key) {
      case 'ArrowLeft': x -= xStep * 0.1; break;
      case 'ArrowRight': x += xStep * 0.1; break;
      case 'ArrowUp': y += yStep * 0.1; break;
      case 'ArrowDown': y -= yStep * 0.1; break;
      default: return;
    }
    e.preventDefault();
    y = clamp(y, yMin, yMax);
    x = clampPointX(idx, x);
    onChange(points.map((p, i) => (i === idx ? { x, y } : p)));
    onCommit?.();
  }

  function handlePointerUp(idx: number, e: React.PointerEvent<SVGCircleElement>) {
    if (draggingIndex !== idx) return;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }
    // Setting draggingIndex → null causes the ghost to disappear on next render
    setDraggingIndex(null);
    setBlockedAtRoot(false);
    onCommit?.();
  }

  // Double-click any anchor (including endpoints) to remove it — blocked
  // once `minPoints` remain, per-caller since not every curve's floor is 2.
  function handlePointDoubleClick(idx: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (points.length <= minPoints) return;
    onChange(points.filter((_, i) => i !== idx));
    onCommit?.();
  }

  /** Click on background → insert a new anchor at that data position. */
  function handleBgClick(e: React.MouseEvent<SVGRectElement>) {
    if (hasPannedRef.current) return; // ignore drag-end clicks
    const local = screenToViewBox(e.clientX, e.clientY);
    if (!local) return;
    let { x, y } = pxToData(local.x, local.y, xMin, xMax, yMin, yMax);
    // Stay strictly between the two fixed endpoints (which may sit inside
    // the xMin..xMax range), so the point array stays x-sorted. With fewer
    // than 2 points there's no "between" yet — fall back to the chart's
    // own bounds instead (otherwise firstX === lastX and this always no-ops).
    const firstX = points.length >= 2 ? points[0].x : xMin;
    const lastX = points.length >= 2 ? points[points.length - 1].x : xMax;
    const margin = (xMax - xMin) * 0.02;
    if (lastX - firstX <= 2 * margin) return;
    x = clamp(x, firstX + margin, lastX - margin);
    y = clamp(y, yMin, yMax);
    // Skip if too close to an existing anchor
    if (points.some((p) => Math.abs(p.x - x) < (xMax - xMin) * 0.03)) return;
    // Insert in x-sorted order. With 0 or 1 existing points there's no
    // "middle" to find via neighbor comparison, so place explicitly instead.
    const idx =
      points.length === 0
        ? 0
        : points.length === 1
          ? (x < points[0].x ? 0 : 1)
          : (() => {
              const insertIdx = points.findIndex((p, i) => i > 0 && p.x >= x);
              return insertIdx === -1 ? points.length - 1 : insertIdx;
            })();
    onChange([...points.slice(0, idx), { x, y }, ...points.slice(idx)]);
    onCommit?.();
  }

  return {
    draggingIndex,
    blockedAtRoot,
    preEditPointsRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleKeyDown,
    handlePointDoubleClick,
    handleBgClick,
  };
}
