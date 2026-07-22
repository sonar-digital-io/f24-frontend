import type { KeyboardEvent, ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SortState } from '@/types';

/**
 * Shared building blocks for the list pages (Material, Geometry, Layup,
 * Composition, LoadGroup, Calculation) and the picker dialogs. One source of
 * truth for pagination windowing, sortable headers and clickable-row a11y.
 */

// ─── Sorting ──────────────────────────────────────────────────────────────────

/** Standard toggle: clicking the active column flips direction, a new column starts asc. */
export function toggleSort<K extends string>(prev: SortState<K>, key: K): SortState<K> {
  return prev.key === key
    ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
    : { key, direction: 'asc' };
}

interface SortableHeaderProps<K extends string> {
  label: string;
  sortKey: K;
  currentSort: SortState<K>;
  onClick: (key: K) => void;
  /** Extra th classes (column width etc.). */
  className?: string;
  /** Optional control rendered inside the th next to the sort button (e.g. a filter toggle). */
  action?: ReactNode;
}

export function SortableHeader<K extends string>({
  label,
  sortKey,
  currentSort,
  onClick,
  className,
  action,
}: SortableHeaderProps<K>) {
  const isActive = currentSort.key === sortKey;
  const Icon = !isActive ? ArrowUpDown : currentSort.direction === 'desc' ? ArrowDown : ArrowUp;
  const sortButton = (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className="inline-flex items-center gap-1 text-[14px] font-medium leading-5 text-[#6b7280] hover:text-[#0a0a0a]"
    >
      {label}
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
  return (
    <th
      aria-sort={
        isActive ? (currentSort.direction === 'asc' ? 'ascending' : 'descending') : undefined
      }
      className={cn('h-10 px-3 text-left', className)}
    >
      {action ? (
        <div className="flex items-center gap-1">
          {sortButton}
          {action}
        </div>
      ) : (
        sortButton
      )}
    </th>
  );
}

// ─── Clickable rows ───────────────────────────────────────────────────────────

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

// ─── Pagination ───────────────────────────────────────────────────────────────

/** First page, a window around the current page, and the last page —
 *  with ellipses where pages are skipped. */
function pageWindow(page: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  return (
    <nav aria-label="Pagination" className="flex h-9 items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-[14px] font-medium text-[#0a0a0a] hover:bg-[#f1f5f9] disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Previous
      </button>
      {pageWindow(page, totalPages).map((p, idx) =>
        p === 'ellipsis' ? (
          <span
            key={`ellipsis-${idx}`}
            className="flex h-9 w-9 items-center justify-center text-[#6b7280]"
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`flex h-9 w-9 items-center justify-center rounded-md text-[14px] font-medium ${
              p === page
                ? 'border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]'
                : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-[14px] font-medium text-[#0a0a0a] hover:bg-[#f1f5f9] disabled:opacity-50"
      >
        Next
        <ChevronRight className="h-4 w-4" strokeWidth={2} />
      </button>
    </nav>
  );
}
