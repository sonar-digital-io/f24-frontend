import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Pagination } from '@/components/common/list/Pagination';
import { SortableHeader } from '@/components/common/list/SortableHeader';
import { toggleSort } from '@/lib/listTable';
import type { SortState } from '@/types';
import { Input } from '@/components/ui/input';
import { LAYUPS } from '@/data/layups';

const PAGE_SIZE = 10;

type SortKey = 'name' | 'lastUpdated';

interface LayupPickerDialogProps {
  open: boolean;
  currentLayupId?: string | null;
  onSelect: (layupId: string) => void;
  onClose: () => void;
}

/**
 * Layup chooser dialog: full-table picker over the existing LAYUPS list.
 * Triggered from the Layup mapping table's per-row "Select" button — replaces
 * a plain dropdown when users need search/sort/pagination over the layup
 * catalog. Confirms selection by clicking "Select" on a row.
 *
 * Pattern matches NewGeometryModal: fixed overlay, click-outside + ESC close,
 * body scroll-lock.
 */
export function LayupPickerDialog({
  open,
  currentLayupId,
  onSelect,
  onClose,
}: LayupPickerDialogProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);

  // Body scroll lock + ESC close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Reset query/page when the dialog re-opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setPage(1);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LAYUPS;
    return LAYUPS.filter(
      (l) => l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
    );
  }, [query]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const aVal = a[sort.key].toLowerCase();
      const bVal = b[sort.key].toLowerCase();
      if (aVal === bVal) return 0;
      const cmp = aVal < bVal ? -1 : 1;
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key: SortKey) {
    setSort((prev) => toggleSort(prev, key));
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="layup-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100vh-4rem)] w-full max-w-[931px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h2
            id="layup-picker-title"
            className="text-[20px] font-bold leading-7 text-[#181c20]"
          >
            Layups
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
              placeholder="Search for a layup"
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
                <SortableHeader
                  label="Name"
                  sortKey="name"
                  currentSort={sort}
                  onClick={handleSort}
                  className="w-[240px]"
                />
                <th className="h-10 px-3 text-left">
                  <span className="text-[14px] font-medium leading-5 text-[#6b7280]">
                    Description
                  </span>
                </th>
                <SortableHeader
                  label="Last updated"
                  sortKey="lastUpdated"
                  currentSort={sort}
                  onClick={handleSort}
                  className="w-[160px] whitespace-nowrap"
                />
                <th className="h-10 w-[100px] px-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((l) => {
                const isCurrent = l.id === currentLayupId;
                return (
                  <tr
                    key={l.id}
                    className={`border-b border-[#e5e7eb] last:border-b-0 ${
                      isCurrent ? 'bg-[#eef9ff]' : 'hover:bg-[#f9fafb]'
                    }`}
                  >
                    <td className="px-3 py-4 text-[14px] font-medium leading-5 text-[#0a0a0a]">
                      {l.name}
                    </td>
                    <td className="px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
                      {l.description}
                    </td>
                    <td className="px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
                      {l.lastUpdated}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onSelect(l.id)}
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
                  <td colSpan={4} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
                    No layups match your search.
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
