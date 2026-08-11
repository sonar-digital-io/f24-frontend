import type { ReactNode } from 'react';
import { SortableHeader } from '@/components/common/list/SortableHeader';
import type { SortState } from '@/types';

export interface ListTableHeadColumn<K extends string> {
  label: string;
  /** Present → rendered as a sortable column button; absent → plain label cell. */
  sortKey?: K;
  /** Column width etc. */
  className?: string;
  /** Extra control next to the label, e.g. a column filter button. */
  action?: ReactNode;
}

interface ListTableHeadProps<K extends string> {
  columns: ListTableHeadColumn<K>[];
  sort: SortState<K>;
  onSort: (key: K) => void;
  /** Leading empty <th> width — for an accordion expand-toggle column (Calculation, Material). */
  leadingWidthClassName?: string;
  /** Trailing empty <th> width — for the row-actions column. */
  actionsWidthClassName?: string;
}

/**
 * `<thead>` for the list pages (Composition, Geometry, Material, Calculation,
 * Layup, LoadGroup): same row shape everywhere — an optional leading
 * expand-toggle column, a run of sortable/plain columns (some with a filter
 * button action), and a trailing empty actions column. Each page only
 * supplies its own column set and widths.
 */
export function ListTableHead<K extends string>({
  columns,
  sort,
  onSort,
  leadingWidthClassName,
  actionsWidthClassName = 'w-[208px]',
}: ListTableHeadProps<K>) {
  return (
    <thead>
      <tr className="border-b border-[#e5e7eb]">
        {leadingWidthClassName && <th className={`h-10 ${leadingWidthClassName} px-3 text-left`} />}
        {columns.map((col) =>
          col.sortKey ? (
            <SortableHeader
              key={col.label}
              label={col.label}
              sortKey={col.sortKey}
              currentSort={sort}
              onClick={onSort}
              className={col.className}
              action={col.action}
            />
          ) : (
            <th key={col.label} className={`h-10 px-3 text-left ${col.className ?? ''}`}>
              {col.action ? (
                <div className="flex items-center gap-1">
                  <span className="text-[14px] font-medium leading-5 text-[#6b7280]">{col.label}</span>
                  {col.action}
                </div>
              ) : (
                <span className="text-[14px] font-medium leading-5 text-[#6b7280]">{col.label}</span>
              )}
            </th>
          )
        )}
        <th className={`h-10 ${actionsWidthClassName} px-3 text-left`} />
      </tr>
    </thead>
  );
}
