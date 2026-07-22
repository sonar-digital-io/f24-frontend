import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Check, Filter, Minus, Search, X } from 'lucide-react';
import { MainNav } from '@/components/common/MainNav';
import { Footer } from '@/components/common/Footer';
import { CalculationRow } from '@/components/calculation/CalculationRow';
import {
  Pagination,
  SortableHeader,
  toggleSort,
} from '@/components/common/ListTable';
import type { SortState, CalculationSortKey } from '@/types';
import { Input } from '@/components/ui/input';
import { CALCULATIONS, timestampValue } from '@/data/calculations';

const PAGE_SIZE = 10;

// ─── Filter checkbox ──────────────────────────────────────────────────────────

function FilterCheckbox({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <div
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded ${
        checked || indeterminate ? 'bg-[#171717]' : 'border border-[#d1d5db] bg-white'
      }`}
    >
      {indeterminate ? (
        <Minus className="h-3 w-3 text-white" strokeWidth={3} />
      ) : checked ? (
        <Check className="h-3 w-3 text-white" strokeWidth={3} />
      ) : null}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Calculation() {
  const navigate = useNavigate();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState<CalculationSortKey>>({ key: 'timestamp', direction: 'desc' });
  const [page, setPage] = useState(1);

  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusPos, setStatusPos] = useState<{ top: number; left: number } | null>(null);
  const [statusQuery, setStatusQuery] = useState('');
  const statusBtnRef = useRef<HTMLButtonElement>(null);
  const statusDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusOpen) { setStatusQuery(''); return; }
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (statusBtnRef.current?.contains(t) || statusDropRef.current?.contains(t)) return;
      setStatusOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [statusOpen]);

  function openStatusFilter() {
    if (!statusOpen && statusBtnRef.current) {
      const r = statusBtnRef.current.getBoundingClientRect();
      setStatusPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX });
    }
    setStatusOpen((o) => !o);
  }

  function toggleStatus(s: string) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
    setPage(1);
  }

  const allStatuses = useMemo(
    () => [...new Set(CALCULATIONS.map((c) => c.status))].sort(),
    []
  );

  const visibleStatuses = useMemo(() => {
    const q = statusQuery.trim().toLowerCase();
    return q ? allStatuses.filter((s) => s.toLowerCase().includes(q)) : allStatuses;
  }, [allStatuses, statusQuery]);

  function toggleSelectAll() {
    const allVisible = visibleStatuses.every((s) => statusFilter.has(s));
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (allVisible) {
        visibleStatuses.forEach((s) => next.delete(s));
      } else {
        visibleStatuses.forEach((s) => next.add(s));
      }
      return next;
    });
    setPage(1);
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CALCULATIONS.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q))
        return false;
      if (statusFilter.size > 0 && !statusFilter.has(c.status)) return false;
      return true;
    });
  }, [query, statusFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      // Timestamps are '2026-04-13 1:43 PM' strings — 12-hour times don't sort
      // lexically, so compare them as parsed values.
      const cmp =
        sort.key === 'timestamp'
          ? timestampValue(a.timestamp) - timestampValue(b.timestamp)
          : a.name.toLowerCase() < b.name.toLowerCase()
            ? -1
            : a.name.toLowerCase() > b.name.toLowerCase()
              ? 1
              : 0;
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key: CalculationSortKey) {
    setSort((prev) => toggleSort(prev, key));
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            {/* Header */}
            <div className="flex h-9 items-center justify-between">
              <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Calculations</h2>
              <button
                type="button"
                onClick={() => navigate('/calculation/new')}
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
              >
                New calculation
              </button>
            </div>

            {/* Search + filter chips */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="relative w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
                <Input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  placeholder="Search"
                  className="h-9 rounded-md border-[#e2e8f0] pl-9 text-[14px]"
                />
              </div>

              {statusFilter.size > 0 && (
                <span className="text-[13px] font-medium text-[#6b7280]">Filtered by</span>
              )}

              {statusFilter.size > 0 && (() => {
                const sortedList = [...statusFilter].sort();
                const label = sortedList[0] + (statusFilter.size > 1 ? ` +${statusFilter.size - 1}` : '');
                return (
                  <div className="flex items-center gap-1 rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-3 py-1.5 text-[13px]">
                    <span className="text-[#9ca3af]">Status</span>
                    <span className="font-semibold text-[#0a0a0a]">{label}</span>
                    <button
                      type="button"
                      aria-label="Clear status filter"
                      onClick={() => { setStatusFilter(new Set()); setPage(1); }}
                      className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[#9ca3af] hover:bg-[#e5e7eb] hover:text-[#0a0a0a]"
                    >
                      <X className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <th className="h-10 w-[52px] px-3 text-left" />
                    <SortableHeader
                      label="Name"
                      sortKey="name"
                      currentSort={sort}
                      onClick={handleSort}
                      className="w-[260px]"
                    />
                    <th className="h-10 px-3 text-left">
                      <span className="text-[14px] font-medium leading-5 text-[#6b7280]">
                        Description
                      </span>
                    </th>
                    <SortableHeader
                      label="Start time"
                      sortKey="timestamp"
                      currentSort={sort}
                      onClick={handleSort}
                      className="w-[200px]"
                    />
                    <th className="h-10 w-[180px] px-3 text-left">
                      <div className="flex items-center gap-1">
                        <span className="text-[14px] font-medium leading-5 text-[#6b7280]">
                          Status
                        </span>
                        <button
                          ref={statusBtnRef}
                          type="button"
                          aria-label="Filter by status"
                          onClick={openStatusFilter}
                          className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#f1f5f9] ${
                            statusFilter.size > 0 ? 'text-[#006496]' : 'text-[#9ca3af]'
                          }`}
                        >
                          <Filter className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </th>
                    <th className="h-10 w-[148px] px-3 text-left" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((item) => (
                    <CalculationRow
                      key={item.id}
                      item={item}
                      expanded={expandedIds.has(item.id)}
                      onToggle={() => toggleExpand(item.id)}
                    />
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-[14px] text-[#6b7280]"
                      >
                        No calculations match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {statusOpen &&
        statusPos &&
        createPortal(
          <div
            ref={statusDropRef}
            style={{ top: statusPos.top, left: statusPos.left }}
            className="absolute z-[200] w-[200px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]"
          >
            <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-[#9ca3af]" />
              <input
                autoFocus
                value={statusQuery}
                onChange={(e) => setStatusQuery(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent text-[14px] text-[#0a0a0a] outline-none placeholder:text-[#9ca3af]"
              />
            </div>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-[#f9fafb]"
            >
              <FilterCheckbox
                checked={visibleStatuses.length > 0 && visibleStatuses.every((s) => statusFilter.has(s))}
                indeterminate={
                  visibleStatuses.some((s) => statusFilter.has(s)) &&
                  !visibleStatuses.every((s) => statusFilter.has(s))
                }
              />
              <span className="text-[14px] font-medium text-[#0a0a0a]">Select all</span>
            </button>
            <div className="border-b border-[#e5e7eb]" />
            <div className="overflow-y-auto" style={{ maxHeight: 7 * 40 }}>
              {visibleStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-[#f9fafb]"
                >
                  <FilterCheckbox checked={statusFilter.has(s)} />
                  <span className="truncate text-[14px] text-[#0a0a0a]">{s}</span>
                </button>
              ))}
              {visibleStatuses.length === 0 && (
                <p className="px-3 py-4 text-center text-[13px] text-[#9ca3af]">No results</p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
