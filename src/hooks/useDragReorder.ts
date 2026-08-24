import { useRef, useState, type DragEvent } from 'react';

/**
 * HTML5 native drag-and-drop reordering for a list of rows/items, shared by
 * `LayupMappingTable`, `LayupBuilder` (table `<tr>` rows) and
 * `LoadGroupFatigueProfilesTab` (accordion item `<div>`s): tracks the dragged
 * item and the "insert before this index" preview slot, calls
 * `onReorder(from, to)` once a drop lands on a different slot, and only
 * starts a drag when it began on a dedicated grip handle (not anywhere in
 * the item) via `getHandleProps`. `T` is the draggable element type — defaults
 * to `HTMLTableRowElement` for table rows, pass `HTMLDivElement` etc. otherwise.
 */
export function useDragReorder<Id extends string, T extends HTMLElement = HTMLTableRowElement>(
  onReorder: (fromIdx: number, toIdx: number) => void
) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [insertBeforeIdx, setInsertBeforeIdx] = useState<number | null>(null);
  const dragFromHandleRef = useRef<Id | null>(null);

  function handleDragStart(idx: number, e: DragEvent<T>) {
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }

  function handleDragOver(idx: number, e: DragEvent<T>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const newInsert = e.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
    if (insertBeforeIdx !== newInsert) setInsertBeforeIdx(newInsert);
  }

  function handleDragLeave() {
    setInsertBeforeIdx(null);
  }

  function handleDrop(e: DragEvent<T>) {
    e.preventDefault();
    const fromIdx = Number(e.dataTransfer.getData('text/plain'));
    if (
      insertBeforeIdx !== null &&
      !Number.isNaN(fromIdx) &&
      insertBeforeIdx !== fromIdx &&
      insertBeforeIdx !== fromIdx + 1
    ) {
      const toIdx = insertBeforeIdx > fromIdx ? insertBeforeIdx - 1 : insertBeforeIdx;
      onReorder(fromIdx, toIdx);
    }
    setDraggingIdx(null);
    setInsertBeforeIdx(null);
  }

  function handleDragEnd() {
    dragFromHandleRef.current = null;
    setDraggingIdx(null);
    setInsertBeforeIdx(null);
  }

  /** Wire onto the grip element — only mousedown-on-handle authorizes the row's next drag. */
  function getHandleProps(id: Id) {
    return {
      onMouseDown: () => {
        dragFromHandleRef.current = id;
      },
      onMouseUp: () => {
        dragFromHandleRef.current = null;
      },
    };
  }

  /** Wire onto the draggable item (`<tr>`, `<div>`, ...). */
  function getRowDragProps(id: Id, idx: number) {
    return {
      draggable: true,
      onDragStart: (e: DragEvent<T>) => {
        if (dragFromHandleRef.current !== id) {
          e.preventDefault();
          return;
        }
        handleDragStart(idx, e);
      },
      onDragOver: (e: DragEvent<T>) => handleDragOver(idx, e),
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      onDragEnd: handleDragEnd,
    };
  }

  return { draggingIdx, insertBeforeIdx, getHandleProps, getRowDragProps };
}
