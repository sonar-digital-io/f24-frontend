import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, Download, Pencil, Trash2 } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { Pagination } from '@/components/common/list/Pagination';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { ListPageHeader } from '@/components/common/list/ListPageHeader';
import { ListSearchInput } from '@/components/common/list/ListSearchInput';
import { ListTableBody } from '@/components/common/list/ListTableBody';
import { matchesQuery, paginate, rowInteractionProps, sortItems, toggleSort } from '@/lib/listTable';
import type { SortState, ViewMode, GeometrySortKey } from '@/types';
import { ViewModeToggle } from '@/components/common/list/ViewModeToggle';
import { RowIconButton } from '@/components/common/list/RowIconButton';
import { formatDateTime } from '@/lib/utils';
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
    lastUpdated: formatDateTime(g.last_modified),
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
    try {
      await deleteMutation.mutateAsync(Number(pendingDelete.id));
      setPendingDelete(null);
    } catch {
      // deleteMutation.isError surfaces the failure in the dialog — stay open so the user can retry.
    }
  }

  // Navigate to inline creation flow when arriving with ?new=1 (from Home dashboard)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === '1') {
      navigate('/geometry/new', { replace: true });
    }
  }, [location.search, navigate]);

  const filtered = useMemo(
    () => GEOMETRIES.filter((g) => matchesQuery(query, [g.name, g.description])),
    [GEOMETRIES, query]
  );

  const sorted = useMemo(() => sortItems(filtered, sort, (g, key) => g[key]), [filtered, sort]);

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

  function handleSort(key: GeometrySortKey) {
    setSort((prev) => toggleSort(prev, key));
  }

  const COLUMNS: ListTableHeadColumn<GeometrySortKey>[] = [
    { label: 'Name', sortKey: 'name', className: 'w-[240px]' },
    { label: 'Description' },
    { label: 'Last updated', sortKey: 'lastUpdated', className: 'w-[160px] whitespace-nowrap' },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <ListPageHeader
              title="Geometries"
              actions={
                <button
                  type="button"
                  onClick={() => navigate('/geometry/new')}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
                >
                  New geometry
                </button>
              }
            />
            {/* Search + view toggle */}
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <ListSearchInput
                  value={query}
                  onChange={(v) => { setQuery(v); setPage(1); }}
                  placeholder="Search for geometry"
                  widthClassName="w-[384px]"
                />
              </div>

              <ViewModeToggle value={view} onChange={setView} />
            </div>

            {/* List view */}
            {view === 'list' && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse [&_tbody_tr:last-child]:border-b-0">
                  <ListTableHead columns={COLUMNS} sort={sort} onSort={handleSort} />
                  <ListTableBody
                    colSpan={4}
                    isLoading={isLoading}
                    isError={isError}
                    loadingLabel="Loading geometries…"
                    errorLabel="Failed to load geometries from the server."
                    rows={pageRows}
                    renderRow={(g) => (
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
                    )}
                    emptyLabel="No geometries match your search."
                  />
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete geometry"
        message={`Are you sure you want to delete "${pendingDelete?.name}"? This action cannot be undone.`}
        confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        confirmDisabled={deleteMutation.isPending}
        errorMessage={deleteMutation.isError ? 'Failed to delete. Please try again.' : undefined}
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
