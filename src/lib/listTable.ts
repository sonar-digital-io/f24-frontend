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

/** True when `query` is empty, or found (case-insensitively) in any of `fields`. */
export function matchesQuery(query: string, fields: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f.toLowerCase().includes(q));
}

/**
 * Sorts a copy of `items` by `sort`, using `getValue` to pull the comparable
 * value for the active column — numbers compare numerically, everything else
 * compares as a case-insensitive string. Shared by every list page's sorting
 * (each page's `getValue` handles its own special-cased columns, e.g.
 * Material's mixed-format `lastUpdated` or Calculation's parsed timestamps).
 */
export function sortItems<T, K extends string>(
  items: T[],
  sort: SortState<K>,
  getValue: (item: T, key: K) => string | number
): T[] {
  const dir = sort.direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const aVal = getValue(a, sort.key);
    const bVal = getValue(b, sort.key);
    if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    return (aStr < bStr ? -1 : aStr > bStr ? 1 : 0) * dir;
  });
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
