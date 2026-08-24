import type { ReactNode } from 'react';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { Pagination } from '@/components/common/list/Pagination';
import { SearchInput } from '@/components/common/list/SearchInput';
import { TableStatusRow } from '@/components/common/list/TableStatusRow';
import type { SortState } from '@/types';

interface PickerListCardProps<K extends string> {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  columns: ListTableHeadColumn<K>[];
  sort: SortState<K>;
  onSort: (key: K) => void;
  actionsWidthClassName?: string;
  isLoading: boolean;
  isError: boolean;
  /** Number of rows in the current page — drives the "no matches" empty state. */
  rowCount: number;
  /** Plural noun used in the loading/error/empty messages, e.g. "compositions". */
  entityLabelPlural: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** The `<tr>` rows for the current page. */
  children: ReactNode;
}

/**
 * Search box + sortable table + pagination shell shared by the selectable
 * picker tabs (`CalculationCompositionTab`, `CalculationLoadGroupTab`): each
 * caller only supplies its own columns and row markup.
 */
export function PickerListCard<K extends string>({
  search,
  onSearchChange,
  searchPlaceholder,
  columns,
  sort,
  onSort,
  actionsWidthClassName,
  isLoading,
  isError,
  rowCount,
  entityLabelPlural,
  page,
  totalPages,
  onPageChange,
  children,
}: PickerListCardProps<K>) {
  const colSpan = columns.length + 1;
  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        {/* Search row */}
        <div className="border-b border-[#e5e7eb] px-6 py-3">
          <SearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <ListTableHead columns={columns} sort={sort} onSort={onSort} actionsWidthClassName={actionsWidthClassName} />
            <tbody>
              {isLoading && <TableStatusRow colSpan={colSpan}>Loading {entityLabelPlural}…</TableStatusRow>}
              {isError && (
                <TableStatusRow colSpan={colSpan} variant="error">
                  Failed to load {entityLabelPlural} from the server.
                </TableStatusRow>
              )}
              {!isLoading && !isError && children}
              {!isLoading && !isError && rowCount === 0 && (
                <TableStatusRow colSpan={colSpan}>No {entityLabelPlural} match your search.</TableStatusRow>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
      </div>
    </div>
  );
}
