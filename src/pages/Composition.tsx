import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Download, Pencil, Trash2 } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { ListPageCard } from '@/components/common/list/ListPageCard';
import { ListTable } from '@/components/common/list/ListTable';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { ListTableBody } from '@/components/common/list/ListTableBody';
import { DateColumnFilter } from '@/components/common/list/DateColumnFilter';
import { DateRangeFilterChip } from '@/components/common/list/DateRangeFilterChip';
import { matchesDateRange, matchesQuery, paginate, sortItems } from '@/lib/listTable';
import type { CompositionSortKey } from '@/types';
import { RowIconButton } from '@/components/common/list/RowIconButton';
import { formatDateTime } from '@/lib/utils';
import { useDateFilterPopover } from '@/hooks/useDateFilterPopover';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { useSortState } from '@/hooks/useSortState';
import { type Composition as CompositionItem } from '@/data/compositions';
import { type BladeType } from '@/data/geometries';
import { DeleteConfirmDialog } from '@/components/common/list/DeleteConfirmDialog';
import { useCompositionList, useDeleteComposition } from '@/hooks/api/useComposition';
import type { Composition as BackendComposition } from '@/api/types/composition';

const PAGE_SIZE = 10;

function toUiComposition(c: BackendComposition): CompositionItem {
  return {
    id: String(c.id),
    name: c.name,
    description: c.description ?? '',
    nominalRadius: 0,
    type: '—' as BladeType,
    // Keep the raw ISO value so sorting stays chronological — an "M/D/YYYY"
    // display string (e.g. from formatDateTime) sorts lexicographically wrong
    // (month "10" sorts before "9"). Formatted for display below.
    lastUpdated: c.last_modified ?? '',
  };
}

export function Composition() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { sort, handleSort } = useSortState<CompositionSortKey>({ key: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);
  const dateFilter = useDateFilterPopover(() => setPage(1));
  const { dateRange } = dateFilter;

  const { data: backendCompositions, isLoading, isError } = useCompositionList();
  const COMPOSITIONS = useMemo(
    () => (backendCompositions ?? []).map(toUiComposition),
    [backendCompositions],
  );

  const deleteMutation = useDeleteComposition();
  const { pendingDelete, setPendingDelete, handleConfirmDelete } = useDeleteConfirm(deleteMutation);

  const filtered = useMemo(() => {
    return COMPOSITIONS.filter((c) => {
      if (!matchesQuery(query, [c.name, c.description])) return false;
      if (!matchesDateRange(c.lastUpdated, dateRange)) return false;
      return true;
    });
  }, [COMPOSITIONS, query, dateRange]);

  const sorted = useMemo(() => sortItems(filtered, sort, (c, key) => c[key]), [filtered, sort]);

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

  const COLUMNS: ListTableHeadColumn<CompositionSortKey>[] = [
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
            title="Compositions"
            headerActions={
              <div className="flex items-center gap-2">
                <Link
                  to="/composition/new"
                  className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
                >
                  New composition
                </Link>
              </div>
            }
            search={{
              value: query,
              onChange: (v) => {
                setQuery(v);
                setPage(1);
              },
              placeholder: 'Search for composition',
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
                loadingLabel="Loading compositions…"
                errorLabel="Failed to load compositions from the server."
                rows={pageRows}
                renderRow={(c) => (
                  <tr
                    key={c.id}
                    className="group border-b border-[#e5e7eb] bg-white hover:bg-[#f9fafb]"
                  >
                    <td className="px-3 py-4 text-[14px] font-medium leading-5 text-[#0a0a0a]">
                      {c.name}
                    </td>
                    <td className="px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
                      {c.description}
                    </td>
                    <td className="px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
                      {formatDateTime(c.lastUpdated)}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <RowIconButton
                          label="Edit composition"
                          icon={Pencil}
                          onClick={() => navigate(`/composition/${c.id}`)}
                        />
                        <RowIconButton
                          label="Export composition"
                          icon={Download}
                          onClick={() => {}}
                        />
                        <RowIconButton
                          label="Duplicate composition"
                          icon={Copy}
                          onClick={() => navigate(`/composition/new?duplicateFrom=${c.id}`)}
                        />
                        <RowIconButton
                          label="Delete composition"
                          icon={Trash2}
                          onClick={() => setPendingDelete({ id: c.id, name: c.name })}
                          variant="danger"
                        />
                      </div>
                    </td>
                  </tr>
                )}
                emptyLabel="No compositions match your search."
              />
            </ListTable>
          </ListPageCard>
        </div>
      </main>

      <Footer />

      <DeleteConfirmDialog
        entityLabel="composition"
        pendingDelete={pendingDelete}
        isPending={deleteMutation.isPending}
        isError={deleteMutation.isError}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
