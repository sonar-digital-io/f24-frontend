import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, Download, Pencil, Trash2 } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { ListPageCard } from '@/components/common/list/ListPageCard';
import { ListTable } from '@/components/common/list/ListTable';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { ListTableBody } from '@/components/common/list/ListTableBody';
import { DateColumnFilter } from '@/components/common/list/DateColumnFilter';
import { DateRangeFilterChip } from '@/components/common/list/DateRangeFilterChip';
import {
  matchesDateRange,
  matchesQuery,
  paginate,
  rowInteractionProps,
  sortItems,
} from '@/lib/listTable';
import type { GeometrySortKey } from '@/types';
import { RowIconButton } from '@/components/common/list/RowIconButton';
import { formatDateTime } from '@/lib/utils';
import { useDateFilterPopover } from '@/hooks/useDateFilterPopover';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { useSortState } from '@/hooks/useSortState';
import { type Geometry as GeometryItem, type BladeType } from '@/data/geometries';
import { DeleteConfirmDialog } from '@/components/common/list/DeleteConfirmDialog';
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
    // Keep the raw ISO value so sorting stays chronological — an "M/D/YYYY"
    // display string (e.g. from formatDateTime) sorts lexicographically wrong
    // (month "10" sorts before "9"). Formatted for display below.
    lastUpdated: g.last_modified ?? '',
  };
}

export function Geometry() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const { sort, handleSort } = useSortState<GeometrySortKey>({ key: 'lastUpdated', direction: 'desc' });
  const [page, setPage] = useState(1);
  const dateFilter = useDateFilterPopover(() => setPage(1));
  const { dateRange } = dateFilter;

  const { data: backendGeometries, isLoading, isError } = useGeometryList();
  const GEOMETRIES = useMemo(
    () => (backendGeometries ?? []).map(toUiGeometry),
    [backendGeometries],
  );

  const deleteMutation = useDeleteGeometry();
  const { pendingDelete, setPendingDelete, handleConfirmDelete } = useDeleteConfirm(deleteMutation);

  // Navigate to inline creation flow when arriving with ?new=1 (from Home dashboard)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === '1') {
      navigate('/geometry/new', { replace: true });
    }
  }, [location.search, navigate]);

  const filtered = useMemo(() => {
    return GEOMETRIES.filter((g) => {
      if (!matchesQuery(query, [g.name, g.description])) return false;
      if (!matchesDateRange(g.lastUpdated, dateRange)) return false;
      return true;
    });
  }, [GEOMETRIES, query, dateRange]);

  const sorted = useMemo(() => sortItems(filtered, sort, (g, key) => g[key]), [filtered, sort]);

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

  const COLUMNS: ListTableHeadColumn<GeometrySortKey>[] = [
    { label: 'Name', sortKey: 'name', className: 'w-[240px]' },
    { label: 'Description' },
    {
      label: 'Last updated',
      sortKey: 'lastUpdated',
      className: 'w-[160px] whitespace-nowrap',
      action: <DateColumnFilter ariaLabel="Filter by last updated" {...dateFilter} />,
    },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <ListPageCard
            title="Geometries"
            headerActions={
              <button
                type="button"
                onClick={() => navigate('/geometry/new')}
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
              >
                New geometry
              </button>
            }
            search={{
              value: query,
              onChange: (v) => {
                setQuery(v);
                setPage(1);
              },
              placeholder: 'Search for geometry',
            }}
            filters={
              dateRange?.from || dateRange?.to ? (
                <DateRangeFilterChip
                  label="Last updated"
                  dateRange={dateRange}
                  onClear={dateFilter.clear}
                />
              ) : undefined
            }
            pagination={{ page, totalPages, onChange: setPage }}
          >
            <ListTable>
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
                      {formatDateTime(g.lastUpdated)}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <RowIconButton
                          label="Edit geometry"
                          icon={Pencil}
                          onClick={() => navigate(`/geometry/${g.id}`)}
                        />
                        <RowIconButton
                          label="Export geometry"
                          icon={Download}
                          onClick={() => {}}
                        />
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
            </ListTable>
          </ListPageCard>
        </div>
      </main>

      <Footer />

      <DeleteConfirmDialog
        entityLabel="geometry"
        pendingDelete={pendingDelete}
        isPending={deleteMutation.isPending}
        isError={deleteMutation.isError}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
