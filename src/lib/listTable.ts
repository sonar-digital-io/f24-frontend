import type { KeyboardEvent } from 'react';
import type { SortState } from '@/types';

/**
 * Shared building blocks for the list pages (Material, Geometry, Layup,
 * Composition, LoadGroup, Calculation) and the picker dialogs — one source of
 * truth for sort-state toggling and clickable-row a11y.
 */

/** Standard toggle: clicking the active column flips direction, a new column starts asc. */
export function toggleSort<K extends string>(prev: SortState<K>, key: K): SortState<K> {
  return prev.key === key
    ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
    : { key, direction: 'asc' };
}

/** Toggles `value`'s membership in a Set, returning a new Set (immutable update for React state). */
export function toggleSetMember<T>(prev: Set<T>, value: T): Set<T> {
  const next = new Set(prev);
  next.has(value) ? next.delete(value) : next.add(value);
  return next;
}

/** Slices `sorted` into the current page, and the page count it took to get there. */
export function paginate<T>(sorted: T[], page: number, pageSize: number): { totalPages: number; pageRows: T[] } {
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);
  return { totalPages, pageRows };
}

/** Spread onto a clickable <tr> so keyboard users can open rows too. */
export function rowInteractionProps(onOpen: () => void) {
  return {
    tabIndex: 0,
    onClick: onOpen,
    onKeyDown: (e: KeyboardEvent) => {
      // Only when the row itself is focused — otherwise Enter/Space bubbling up
      // from a nested control (e.g. an expand chevron) would navigate instead of
      // activating that control.
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen();
      }
    },
  };
}
