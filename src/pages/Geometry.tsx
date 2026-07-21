import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Check,
  Copy,
  Download,
  Filter,
  LayoutGrid,
  List as ListIcon,
  Minus,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { MainNav } from '@/components/MainNav';
import { Footer } from '@/components/Footer';
import {
  Pagination,
  SortableHeader,
  rowInteractionProps,
  toggleSort,
  type SortState,
} from '@/components/ListTable';
import { Input } from '@/components/ui/input';
import { GeometryCard } from '@/components/GeometryCard';
import { GEOMETRIES } from '@/data/geometries';

const PAGE_SIZE = 10;
type ViewMode = 'list' | 'grid';
type SortKey = 'name' | 'nominalRadius' | 'lastUpdated';

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

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group/tip relative">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[11px] leading-none text-white opacity-0 shadow-sm transition-opacity group-hover/tip:opacity-100">
        {label}
      </span>
    </div>
  );
}

export function Geometry() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<ViewMode>('list');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'lastUpdated', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [typeOpen, setTypeOpen] = useState(false);
  const [typePos, setTypePos] = useState<{ top: number; left: number } | null>(null);
  const [typeQuery, setTypeQuery] = useState('');
  const typeBtnRef = useRef<HTMLButtonElement>(null);
  const typeDropRef = useRef<HTMLDivElement>(null);

  // Navigate to inline creation flow when arriving with ?new=1 (from Home dashboard)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === '1') {
      navigate('/geometry/new', { replace: true });
    }
  }, [location.search, navigate]);

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

  const allTypes = useMemo(
    () => [...new Set(GEOMETRIES.map((g) => g.type))].sort(),
    []
  );

  const visibleTypes = useMemo(() => {
    const q = typeQuery.trim().toLowerCase();
    return q ? allTypes.filter((t) => t.toLowerCase().includes(q)) : allTypes;
  }, [allTypes, typeQuery]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GEOMETRIES.filter((g) => {
      if (q && !g.name.toLowerCase().includes(q) && !g.description.toLowerCase().includes(q))
        return false;
      if (typeFilter.size > 0 && !typeFilter.has(g.type)) return false;
      return true;
    });
  }, [query, typeFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp: number;
      if (sort.key === 'nominalRadius') {
        cmp = a.nominalRadius - b.nominalRadius;
      } else {
        const aVal = a[sort.key].toLowerCase();
        const bVal = b[sort.key].toLowerCase();
        cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key: SortKey) {
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
              <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Geometries</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[#e2e8f0] bg-white px-4 py-2 text-[14px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#f1f5f9]"
                >
                  Import
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/geometry/new')}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
                >
                  New geometry
                </button>
              </div>
            </div>

            {/* Search + view toggle */}
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-[384px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
                  <Input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder={view === 'list' ? 'Search for geometry' : 'Placeholder'}
                    className="h-9 rounded-md border-[#e2e8f0] pl-9 text-[14px]"
                  />
                </div>

                {typeFilter.size > 0 && (
                  <>
                    <span className="text-[13px] font-medium text-[#6b7280]">Filtered by</span>
                    {(() => {
                      const sorted = [...typeFilter].sort();
                      const label = sorted[0] + (typeFilter.size > 1 ? ` +${typeFilter.size - 1}` : '');
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
                  </>
                )}
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 rounded-md border border-[#e5e7eb] bg-white p-1 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  aria-label="List view"
                  aria-pressed={view === 'list'}
                  className={`flex h-7 w-7 items-center justify-center rounded ${
                    view === 'list' ? 'bg-[#eef9ff] text-[#171717]' : 'text-[#6b7280] hover:bg-[#f1f5f9]'
                  }`}
                >
                  <ListIcon className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  aria-label="Grid view"
                  aria-pressed={view === 'grid'}
                  className={`flex h-7 w-7 items-center justify-center rounded ${
                    view === 'grid' ? 'bg-[#eef9ff] text-[#171717]' : 'text-[#6b7280] hover:bg-[#f1f5f9]'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* List view */}
            {view === 'list' && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
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
                        label="Nominal radius"
                        sortKey="nominalRadius"
                        currentSort={sort}
                        onClick={handleSort}
                        className="w-[160px] whitespace-nowrap"
                      />
                      <th className="h-10 w-[180px] px-3 text-left">
                        <div className="flex items-center gap-1">
                          <span className="text-[14px] font-medium leading-5 text-[#6b7280]">
                            Type
                          </span>
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
                        </div>
                      </th>
                      <SortableHeader
                        label="Last updated"
                        sortKey="lastUpdated"
                        currentSort={sort}
                        onClick={handleSort}
                        className="w-[160px] whitespace-nowrap"
                      />
                      <th className="h-10 w-[208px] px-3 text-left" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((g) => (
                      <tr
                        key={g.id}
                        {...rowInteractionProps(() => navigate(`/geometry/${g.id}`))}
                        className="group cursor-pointer border-b border-[#e5e7eb] bg-white hover:bg-[#f9fafb]"
                      >
                        <td className="px-3 py-4 text-[14px] font-medium leading-5 text-[#0a0a0a]">
                          {g.name}
                        </td>
                        <td className="px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
                          {g.description}
                        </td>
                        <td className="px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
                          {g.nominalRadius} m
                        </td>
                        <td className="px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
                          {g.type}
                        </td>
                        <td className="px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
                          {g.lastUpdated}
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Tip label="Edit">
                              <button
                                type="button"
                                aria-label="Edit geometry"
                                onClick={(e) => { e.stopPropagation(); navigate(`/geometry/${g.id}`); }}
                                className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
                              >
                                <Pencil className="h-4 w-4" strokeWidth={2} />
                              </button>
                            </Tip>
                            <Tip label="Export">
                              <button
                                type="button"
                                aria-label="Export geometry"
                                onClick={(e) => e.stopPropagation()}
                                className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
                              >
                                <Download className="h-4 w-4" strokeWidth={2} />
                              </button>
                            </Tip>
                            <Tip label="Duplicate">
                              <button
                                type="button"
                                aria-label="Duplicate geometry"
                                onClick={(e) => e.stopPropagation()}
                                className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
                              >
                                <Copy className="h-4 w-4" strokeWidth={2} />
                              </button>
                            </Tip>
                            <Tip label="Delete">
                              <button
                                type="button"
                                aria-label="Delete geometry"
                                onClick={(e) => e.stopPropagation()}
                                className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#fee2e2] hover:text-[#dc2626]"
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={2} />
                              </button>
                            </Tip>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
                          No geometries match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grid view */}
            {view === 'grid' && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {pageRows.map((g) => (
                  <GeometryCard
                    key={g.id}
                    geometry={g}
                    onClick={() => navigate(`/geometry/${g.id}`)}
                  />
                ))}
                {pageRows.length === 0 && (
                  <div className="col-span-full py-8 text-center text-[14px] text-[#6b7280]">
                    No geometries match your search.
                  </div>
                )}
              </div>
            )}

            {/* Pagination — grid view paginates the same rows, so it needs the control too */}
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
    </div>
  );
}
