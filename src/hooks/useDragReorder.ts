import { useState, type DragEvent } from 'react';

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
  // Which row is currently authorized to be `draggable` — state (not a ref)
  // so the DOM attribute itself flips off between drags. A row that's
  // `draggable` all the time hijacks normal clicks/text-selection inside its
  // own inputs (the browser's native drag engine can grab the gesture before
  // React's click/focus logic sees it), so only the row whose handle was
  // actually pressed gets it, and only for the duration of that drag.
  const [armedId, setArmedId] = useState<Id | null>(null);

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
    setArmedId(null);
    setDraggingIdx(null);
    setInsertBeforeIdx(null);
  }

  /** Wire onto the grip element — only mousedown-on-handle authorizes the row's next drag. */
  function getHandleProps(id: Id) {
    return {
      onMouseDown: () => setArmedId(id),
      onMouseUp: () => setArmedId(null),
    };
  }

  /** Wire onto the draggable item (`<tr>`, `<div>`, ...). */
  function getRowDragProps(id: Id, idx: number) {
    return {
      draggable: armedId === id,
      onDragStart: (e: DragEvent<T>) => {
        if (armedId !== id) {
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
