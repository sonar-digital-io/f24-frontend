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
