import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { Pagination } from '@/components/common/list/Pagination';
import { SortableHeader } from '@/components/common/list/SortableHeader';
import { toggleSort } from '@/lib/listTable';
import type { SortState } from '@/types';
import { Input } from '@/components/ui/input';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

const PAGE_SIZE = 10;

export interface TablePickerColumn<T> {
  key: string;
  label: string;
  /** Column header width, e.g. "w-[220px]" */
  widthClassName?: string;
  /** Present only on sortable columns — string used for comparison. */
  sortValue?: (item: T) => string;
  render: (item: T) => ReactNode;
}

interface TablePickerDialogProps<T> {
  open: boolean;
  titleId: string;
  title: string;
  items: T[];
  getId: (item: T) => string;
  currentId?: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  searchPlaceholder: string;
  searchPredicate: (item: T, query: string) => boolean;
  columns: TablePickerColumn<T>[];
  emptyMessage: string;
}

/**
 * Full-table "pick one" dialog: search + sortable table + pagination.
 * Shared by LayupPickerDialog and MaterialPickerDialog — same shell, different
 * data source and columns.
 */
export function TablePickerDialog<T>({
  open,
  titleId,
  title,
  items,
  getId,
  currentId,
  onSelect,
  onClose,
  searchPlaceholder,
  searchPredicate,
  columns,
  emptyMessage,
}: TablePickerDialogProps<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState<string>>({
    key: columns.find((c) => c.sortValue)?.key ?? columns[0].key,
    direction: 'asc',
  });
  const [page, setPage] = useState(1);

  useBodyScrollLock(open);
  useEscapeKey(onClose, open);

  // Reset query/page when the dialog re-opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setPage(1);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => searchPredicate(item, q));
  }, [items, query, searchPredicate]);

  const sortColumn = columns.find((c) => c.key === sort.key);

  const sorted = useMemo(() => {
    if (!sortColumn?.sortValue) return filtered;
    const getValue = sortColumn.sortValue;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const aVal = getValue(a).toLowerCase();
      const bVal = getValue(b).toLowerCase();
      if (aVal === bVal) return 0;
      const cmp = aVal < bVal ? -1 : 1;
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortColumn, sort.direction]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key: string) {
    setSort((prev) => toggleSort(prev, key));
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100vh-4rem)] w-full max-w-[931px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-[20px] font-bold leading-7 text-[#181c20]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Search */}
        <div className="max-w-[384px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              autoFocus
              className="h-9 rounded-md border-[#e2e8f0] pl-9 text-[14px]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full table-fixed border-collapse">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-[#e5e7eb]">
                {columns.map((col) =>
                  col.sortValue ? (
                    <SortableHeader
                      key={col.key}
                      label={col.label}
                      sortKey={col.key}
                      currentSort={sort}
                      onClick={handleSort}
                      className={col.widthClassName}
                    />
                  ) : (
                    <th key={col.key} className={`h-10 px-3 text-left ${col.widthClassName ?? ''}`}>
                      <span className="text-[14px] font-medium leading-5 text-[#6b7280]">
                        {col.label}
                      </span>
                    </th>
                  )
                )}
                <th className="h-10 w-[100px] px-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((item) => {
                const id = getId(item);
                const isCurrent = id === currentId;
                return (
                  <tr
                    key={id}
                    className={`border-b border-[#e5e7eb] last:border-b-0 ${
                      isCurrent ? 'bg-[#eef9ff]' : 'hover:bg-[#f9fafb]'
                    }`}
                  >
                    {columns.map((col, i) => (
                      <td
                        key={col.key}
                        className={`px-3 py-4 text-[14px] leading-5 text-[#0a0a0a] ${
                          i === 0 ? 'font-medium' : ''
                        }`}
                      >
                        {col.render(item)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onSelect(id)}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-3 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580]"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-3 py-8 text-center text-[14px] text-[#6b7280]"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
