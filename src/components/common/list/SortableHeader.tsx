import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SortState } from '@/types';

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
