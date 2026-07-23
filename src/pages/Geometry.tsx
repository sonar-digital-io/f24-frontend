import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, Download, Pencil, Search, Trash2 } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { Pagination } from '@/components/common/list/Pagination';
import { SortableHeader } from '@/components/common/list/SortableHeader';
import { paginate, rowInteractionProps, toggleSort } from '@/lib/listTable';
import type { SortState, ViewMode, GeometrySortKey } from '@/types';
import { ActiveFilterChip } from '@/components/common/list/ActiveFilterChip';
import { ColumnFilterButton } from '@/components/common/list/ColumnFilterButton';
import { ColumnFilterPanel } from '@/components/common/list/ColumnFilterPanel';
import { ViewModeToggle } from '@/components/common/list/ViewModeToggle';
import { RowIconButton } from '@/components/common/list/RowIconButton';
import { useColumnFilter } from '@/hooks/useColumnFilter';
import { Input } from '@/components/ui/input';
import { GeometryCard } from '@/components/common/card/GeometryCard';
import { GEOMETRIES } from '@/data/geometries';

const PAGE_SIZE = 10;

export function Geometry() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<ViewMode>('list');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState<GeometrySortKey>>({ key: 'lastUpdated', direction: 'desc' });
  const [page, setPage] = useState(1);

  // Navigate to inline creation flow when arriving with ?new=1 (from Home dashboard)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === '1') {
      navigate('/geometry/new', { replace: true });
    }
  }, [location.search, navigate]);

  const allTypes = useMemo(() => [...new Set(GEOMETRIES.map((g) => g.type))].sort(), []);
  const typeFilter = useColumnFilter(allTypes, () => setPage(1));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GEOMETRIES.filter((g) => {
      if (q && !g.name.toLowerCase().includes(q) && !g.description.toLowerCase().includes(q))
        return false;
      if (typeFilter.selected.size > 0 && !typeFilter.selected.has(g.type)) return false;
      return true;
    });
  }, [query, typeFilter.selected]);

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

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

  function handleSort(key: GeometrySortKey) {
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
                    placeholder="Search for geometry"
                    className="h-9 rounded-md border-[#e2e8f0] pl-9 text-[14px]"
                  />
                </div>

                {typeFilter.selected.size > 0 && (
                  <>
                    <span className="text-[13px] font-medium text-[#6b7280]">Filtered by</span>
                    <ActiveFilterChip label="Type" selected={typeFilter.selected} onClear={typeFilter.clear} />
                  </>
                )}
              </div>

              <ViewModeToggle value={view} onChange={setView} />
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
                          <ColumnFilterButton
                            ariaLabel="Filter by type"
                            active={typeFilter.selected.size > 0}
                            onClick={typeFilter.openDropdown}
                            buttonRef={typeFilter.btnRef}
                          />
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
                            <RowIconButton
                              label="Edit geometry"
                              icon={Pencil}
                              onClick={() => navigate(`/geometry/${g.id}`)}
                            />
                            <RowIconButton label="Export geometry" icon={Download} onClick={() => {}} />
                            <RowIconButton label="Duplicate geometry" icon={Copy} onClick={() => {}} />
                            <RowIconButton
                              label="Delete geometry"
                              icon={Trash2}
                              onClick={() => {}}
                              variant="danger"
                            />
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

      <ColumnFilterPanel
        open={typeFilter.open}
        pos={typeFilter.pos}
        dropRef={typeFilter.dropRef}
        query={typeFilter.query}
        onQueryChange={typeFilter.setQuery}
        options={typeFilter.visibleOptions}
        selected={typeFilter.selected}
        onToggle={typeFilter.toggle}
        onToggleAll={typeFilter.toggleSelectAll}
      />
    </div>
  );
}
