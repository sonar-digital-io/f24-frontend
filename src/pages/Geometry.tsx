import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, Download, Pencil, Search, Trash2 } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { Pagination } from '@/components/common/list/Pagination';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { matchesQuery, paginate, rowInteractionProps, sortItems, toggleSort } from '@/lib/listTable';
import type { SortState, ViewMode, GeometrySortKey } from '@/types';
import { ActiveFilterChip } from '@/components/common/list/ActiveFilterChip';
import { ColumnFilterButton } from '@/components/common/list/ColumnFilterButton';
import { ColumnFilterPanel } from '@/components/common/list/ColumnFilterPanel';
import { ViewModeToggle } from '@/components/common/list/ViewModeToggle';
import { RowIconButton } from '@/components/common/list/RowIconButton';
import { useColumnFilter } from '@/hooks/useColumnFilter';
import { Input } from '@/components/ui/input';
import { GeometryCard } from '@/components/common/card/GeometryCard';
import { type Geometry as GeometryItem, type BladeType } from '@/data/geometries';
import { ConfirmDialog } from '@/components/common/dialog/ConfirmDialog';
import { useDeleteGeometry, useGeometryList } from '@/hooks/api/useGeometry';
import type { Geometry as BackendGeometry } from '@/api/types/geometry';

const PAGE_SIZE = 10;

function toUiGeometry(g: BackendGeometry): GeometryItem {
  return {
    id: String(g.id),
    name: g.name,
    description: g.description ?? '',
    nominalRadius: 0,
    type: '—' as BladeType,
    lastUpdated: g.last_modified,
  };
}

export function Geometry() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<ViewMode>('list');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState<GeometrySortKey>>({ key: 'lastUpdated', direction: 'desc' });
  const [page, setPage] = useState(1);

  const { data: backendGeometries, isLoading, isError } = useGeometryList();
  const GEOMETRIES = useMemo(() => (backendGeometries ?? []).map(toUiGeometry), [backendGeometries]);

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const deleteMutation = useDeleteGeometry();

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    await deleteMutation.mutateAsync(Number(pendingDelete.id));
    setPendingDelete(null);
  }

  // Navigate to inline creation flow when arriving with ?new=1 (from Home dashboard)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === '1') {
      navigate('/geometry/new', { replace: true });
    }
  }, [location.search, navigate]);

  const allTypes = useMemo(() => [...new Set(GEOMETRIES.map((g) => g.type))].sort(), [GEOMETRIES]);
  const typeFilter = useColumnFilter(allTypes, () => setPage(1));

  const filtered = useMemo(
    () =>
      GEOMETRIES.filter(
        (g) =>
          matchesQuery(query, [g.name, g.description]) &&
          (typeFilter.selected.size === 0 || typeFilter.selected.has(g.type))
      ),
    [GEOMETRIES, query, typeFilter.selected]
  );

  const sorted = useMemo(
    () => sortItems(filtered, sort, (g, key) => (key === 'nominalRadius' ? g.nominalRadius : g[key])),
    [filtered, sort]
  );

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

  function handleSort(key: GeometrySortKey) {
    setSort((prev) => toggleSort(prev, key));
  }

  const COLUMNS: ListTableHeadColumn<GeometrySortKey>[] = [
    { label: 'Name', sortKey: 'name', className: 'w-[240px]' },
    { label: 'Description' },
    { label: 'Nominal radius', sortKey: 'nominalRadius', className: 'w-[160px] whitespace-nowrap' },
    {
      label: 'Type',
      className: 'w-[180px]',
      action: (
        <ColumnFilterButton
          ariaLabel="Filter by type"
          active={typeFilter.selected.size > 0}
          onClick={typeFilter.openDropdown}
          buttonRef={typeFilter.btnRef}
        />
      ),
    },
    { label: 'Last updated', sortKey: 'lastUpdated', className: 'w-[160px] whitespace-nowrap' },
  ];

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
                  <ListTableHead columns={COLUMNS} sort={sort} onSort={handleSort} />
                  <tbody>
                    {isLoading && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
                          Loading geometries…
                        </td>
                      </tr>
                    )}
                    {isError && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-[14px] text-[#dc2626]">
                          Failed to load geometries from the server.
                        </td>
                      </tr>
                    )}
                    {!isLoading && !isError && pageRows.map((g) => (
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
                            <RowIconButton
                              label="Duplicate geometry"
                              icon={Copy}
                              onClick={() => navigate(`/geometry/new?duplicateFrom=${g.id}`)}
                            />
                            <RowIconButton
                              label="Delete geometry"
                              icon={Trash2}
                              onClick={() => setPendingDelete({ id: g.id, name: g.name })}
                              variant="danger"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!isLoading && !isError && pageRows.length === 0 && (
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete geometry"
        message={`Are you sure you want to delete "${pendingDelete?.name}"? This action cannot be undone.`}
        confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        confirmDisabled={deleteMutation.isPending}
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
