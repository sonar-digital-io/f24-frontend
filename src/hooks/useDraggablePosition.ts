import { useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

interface Position {
  x: number;
  y: number;
}

/**
 * Mouse-drag-to-reposition state for floating popovers/dialogs
 * (`ProfileDetailPopover`, `LayupMappingBezierDialog`). Returns the current
 * position, its setter (for programmatic repositioning, e.g. on open/expand),
 * and a `startDrag` mousedown handler to wire up on the draggable header.
 */
export function useDraggablePosition(initial: Position | (() => Position)) {
  const [pos, setPos] = useState<Position>(initial);
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  function startDrag(e: ReactMouseEvent) {
    e.preventDefault();
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    function onMove(ev: MouseEvent) {
      if (!dragging.current) return;
      setPos({
        x: dragStart.current.px + ev.clientX - dragStart.current.mx,
        y: dragStart.current.py + ev.clientY - dragStart.current.my,
      });
    }
    function onUp() {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  return { pos, setPos, startDrag };
}
