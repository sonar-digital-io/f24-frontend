import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Filter, Search, X } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { MaterialRow } from '@/components/material/MaterialRow';
import { MaterialDateFilterPopover } from '@/components/material/MaterialDateFilterPopover';
import { Pagination } from '@/components/common/list/Pagination';
import { SortableHeader } from '@/components/common/list/SortableHeader';
import { toggleSort } from '@/lib/listTable';
import type { SortState, MaterialSortKey } from '@/types';
import { FilterCheckbox } from '@/components/common/list/FilterCheckbox';
import { Input } from '@/components/ui/input';
import { MATERIALS, lastUpdatedSortKey } from '@/data/materials';

function formatDateLabel(d: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = d.getDate();
  const s = day === 1 || day === 21 || day === 31 ? 'st'
    : day === 2 || day === 22 ? 'nd'
    : day === 3 || day === 23 ? 'rd' : 'th';
  return `${months[d.getMonth()]} ${day}${s}, ${d.getFullYear()}`;
}

const PAGE_SIZE = 10;

function parseLastUpdated(s: string): Date | null {
  const vMatch = s.match(/^v(\d{4})\/(\d{2})$/);
  if (vMatch) return new Date(`${vMatch[1]}-${vMatch[2]}-01T00:00:00`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00');
  return null;
}

export function Material() {
  const navigate = useNavigate();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [typeOpen, setTypeOpen] = useState(false);
  const [typePos, setTypePos] = useState<{ top: number; left: number } | null>(null);
  const [typeQuery, setTypeQuery] = useState('');
  const typeBtnRef = useRef<HTMLButtonElement>(null);
  const typeDropRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPos, setFilterPos] = useState<{ top: number; left: number } | null>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [leftMonth, setLeftMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 1, 1);
  });
  const [rightMonth, setRightMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [sort, setSort] = useState<SortState<MaterialSortKey>>({ key: 'lastUpdated', direction: 'desc' });
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!filterOpen) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (filterBtnRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setFilterOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [filterOpen]);

  useEffect(() => {
    if (!typeOpen) { setTypeQuery(''); return; }
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (typeBtnRef.current?.contains(t) || typeDropRef.current?.contains(t)) return;
      setTypeOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [typeOpen]);

  function openTypeFilter() {
    if (!typeOpen && typeBtnRef.current) {
      const r = typeBtnRef.current.getBoundingClientRect();
      setTypePos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX });
    }
    setTypeOpen((o) => !o);
  }

  function toggleType(type: string) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
    setPage(1);
  }

  function toggleSelectAll() {
    const allVisible = visibleTypes.every((t) => typeFilter.has(t));
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (allVisible) {
        visibleTypes.forEach((t) => next.delete(t));
      } else {
        visibleTypes.forEach((t) => next.add(t));
      }
      return next;
    });
    setPage(1);
  }

  function goPrev() {
    setLeftMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    setRightMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }
  function goNext() {
    setLeftMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    setRightMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  function openFilter() {
    if (!filterOpen && filterBtnRef.current) {
      const r = filterBtnRef.current.getBoundingClientRect();
      const estimatedWidth = 648;
      const left = Math.max(8, r.right + window.scrollX - estimatedWidth);
      setFilterPos({ top: r.bottom + window.scrollY + 6, left });
    }
    setFilterOpen((o) => !o);
  }

  const allTypes = useMemo(
    () => [...new Set(MATERIALS.map((m) => m.type))].sort(),
    []
  );

  const visibleTypes = useMemo(() => {
    const q = typeQuery.trim().toLowerCase();
    return q ? allTypes.filter((t) => t.toLowerCase().includes(q)) : allTypes;
  }, [allTypes, typeQuery]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MATERIALS.filter((m) => {
      if (
        q &&
        !m.name.toLowerCase().includes(q) &&
        !m.type.toLowerCase().includes(q) &&
        !m.description.toLowerCase().includes(q)
      )
        return false;
      if (typeFilter.size > 0 && !typeFilter.has(m.type)) return false;
      if (dateRange?.from || dateRange?.to) {
        const d = parseLastUpdated(m.lastUpdated);
        if (d) {
          if (dateRange.from && d < dateRange.from) return false;
          if (dateRange.to && d > new Date(dateRange.to.getTime() + 86399999)) return false;
        }
      }
      return true;
    });
  }, [query, typeFilter, dateRange]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      // lastUpdated mixes vYYYY/MM (library) and YYYY-MM-DD (own) — normalize before comparing.
      const aVal =
        sort.key === 'lastUpdated'
          ? lastUpdatedSortKey(a.lastUpdated)
          : a[sort.key].toLowerCase();
      const bVal =
        sort.key === 'lastUpdated'
          ? lastUpdatedSortKey(b.lastUpdated)
          : b[sort.key].toLowerCase();
      if (aVal === bVal) return 0;
      const cmp = aVal < bVal ? -1 : 1;
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key: MaterialSortKey) {
    setSort((prev) => toggleSort(prev, key));
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            {/* Header */}
            <div className="flex h-9 items-center justify-between">
              <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Materials</h2>
              <Link
                to="/material/new"
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
              >
                New material
              </Link>
            </div>

            {/* Search + date filter */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="relative w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
                <Input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  placeholder="Search for materials"
                  className="h-9 rounded-md border-[#e2e8f0] pl-9 text-[14px]"
                />
              </div>

              {(typeFilter.size > 0 || dateRange?.from || dateRange?.to) && (
                <span className="text-[13px] font-medium text-[#6b7280]">Filtered by</span>
              )}

              {typeFilter.size > 0 && (() => {
                const sortedTypes = [...typeFilter].sort();
                const label = sortedTypes[0] + (typeFilter.size > 1 ? ` +${typeFilter.size - 1}` : '');
                return (
                  <div className="flex items-center gap-1 rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-3 py-1.5 text-[13px]">
                    <span className="text-[#9ca3af]">Type</span>
                    <span className="font-semibold text-[#0a0a0a]">{label}</span>
                    <button
                      type="button"
                      aria-label="Clear type filter"
                      onClick={() => { setTypeFilter(new Set()); setPage(1); }}
                      className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[#9ca3af] hover:bg-[#e5e7eb] hover:text-[#0a0a0a]"
                    >
                      <X className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })()}

              {(dateRange?.from || dateRange?.to) && (
                <div className="flex items-center gap-1 rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-3 py-1.5 text-[13px]">
                  <span className="text-[#9ca3af]">Last updated</span>
                  <span className="font-semibold text-[#0a0a0a]">
                    {dateRange?.from ? formatDateLabel(dateRange.from) : '…'}
                    {' – '}
                    {dateRange?.to ? formatDateLabel(dateRange.to) : '…'}
                  </span>
                  <button
                    type="button"
                    aria-label="Clear date filter"
                    onClick={() => { setDateRange(undefined); setPage(1); }}
                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[#9ca3af] hover:bg-[#e5e7eb] hover:text-[#0a0a0a]"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full table-fixed border-collapse" style={{ minWidth: 1100 }}>
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <th className="h-10 w-[52px] px-3 text-left" />
                    <SortableHeader
                      label="Name"
                      sortKey="name"
                      currentSort={sort}
                      onClick={handleSort}
                      className="w-[240px]"
                    />
                    <SortableHeader
                      label="Type"
                      sortKey="type"
                      currentSort={sort}
                      onClick={handleSort}
                      className="w-[240px]"
                      action={
                        <button
                          ref={typeBtnRef}
                          type="button"
                          aria-label="Filter by type"
                          onClick={openTypeFilter}
                          className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#f1f5f9] ${
                            typeFilter.size > 0 ? 'text-[#006496]' : 'text-[#9ca3af]'
                          }`}
                        >
                          <Filter className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      }
                    />
                    <SortableHeader
                      label="Source"
                      sortKey="source"
                      currentSort={sort}
                      onClick={handleSort}
                      className="w-[110px]"
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
                      className="w-[160px]"
                      action={
                        <button
                          ref={filterBtnRef}
                          type="button"
                          aria-label="Filter by last updated"
                          onClick={openFilter}
                          className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#f1f5f9] ${
                            dateRange?.from || dateRange?.to
                              ? 'text-[#006496]'
                              : 'text-[#9ca3af]'
                          }`}
                        >
                          <Filter className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      }
                    />
                    <th className="h-10 w-[208px] px-3 text-left" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((material) => (
                    <MaterialRow
                      key={material.id}
                      material={material}
                      expanded={expandedIds.has(material.id)}
                      onToggle={() => toggleExpand(material.id)}
                      onOpen={() => navigate(`/material/${material.id}`)}
                    />
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
                        No materials match your search.
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

      {typeOpen &&
        typePos &&
        createPortal(
          <div
            ref={typeDropRef}
            style={{ top: typePos.top, left: typePos.left }}
            className="absolute z-[200] w-[234px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]"
          >
            {/* Search */}
            <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-[#9ca3af]" />
              <input
                autoFocus
                value={typeQuery}
                onChange={(e) => setTypeQuery(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent text-[14px] text-[#0a0a0a] outline-none placeholder:text-[#9ca3af]"
              />
            </div>

            {/* Select all */}
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-[#f9fafb]"
            >
              <FilterCheckbox
                checked={visibleTypes.length > 0 && visibleTypes.every((t) => typeFilter.has(t))}
                indeterminate={
                  visibleTypes.some((t) => typeFilter.has(t)) &&
                  !visibleTypes.every((t) => typeFilter.has(t))
                }
              />
              <span className="text-[14px] font-medium text-[#0a0a0a]">Select all</span>
            </button>
            <div className="border-b border-[#e5e7eb]" />

            {/* Type options */}
            <div className="overflow-y-auto" style={{ maxHeight: 7 * 40 }}>
              {visibleTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-[#f9fafb]"
                >
                  <FilterCheckbox checked={typeFilter.has(type)} />
                  <span className="truncate text-[14px] text-[#0a0a0a]">{type}</span>
                </button>
              ))}
              {visibleTypes.length === 0 && (
                <p className="px-3 py-4 text-center text-[13px] text-[#9ca3af]">No results</p>
              )}
            </div>
          </div>,
          document.body
        )}

      {filterOpen &&
        filterPos &&
        createPortal(
          <MaterialDateFilterPopover
            ref={popoverRef}
            top={filterPos.top}
            left={filterPos.left}
            leftMonth={leftMonth}
            rightMonth={rightMonth}
            dateRange={dateRange}
            onLeftMonthChange={setLeftMonth}
            onRightMonthChange={setRightMonth}
            onSelect={(range) => {
              setDateRange(range);
              setPage(1);
              if (range?.from && range?.to) setFilterOpen(false);
            }}
            onPrevMonth={goPrev}
            onNextMonth={goNext}
          />,
          document.body
        )}
    </div>
  );
}
