import { useState, type PointerEvent } from 'react';

/**
 * Which-handle-is-being-dragged state machine shared by the SVG profile
 * charts (`TransversalProfileBoundaryPopover`, `SparProfileChart`): pointer
 * capture on drag start, cleared (best-effort) on drag end/cancel.
 */
export function usePointerDrag<T extends string>() {
  const [dragging, setDragging] = useState<T | null>(null);

  function startDrag(which: T, e: PointerEvent<Element>) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(which);
  }

  function endDrag(e: PointerEvent) {
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setDragging(null);
  }

  return { dragging, startDrag, endDrag };
}
