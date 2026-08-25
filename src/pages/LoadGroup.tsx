import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Download, Pencil, Trash2 } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { ListPageCard } from '@/components/common/list/ListPageCard';
import { ListTable } from '@/components/common/list/ListTable';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { ListTableBody } from '@/components/common/list/ListTableBody';
import { RowIconButton } from '@/components/common/list/RowIconButton';
import { DateColumnFilter } from '@/components/common/list/DateColumnFilter';
import { DateRangeFilterChip } from '@/components/common/list/DateRangeFilterChip';
import { ConfirmDialog } from '@/components/common/dialog/ConfirmDialog';
import { matchesQuery, paginate, rowInteractionProps, sortItems, toggleSort } from '@/lib/listTable';
import { formatDateTime, parseLastUpdated } from '@/lib/utils';
import { useDateFilterPopover } from '@/hooks/useDateFilterPopover';
import type { SortState, LoadGroupSortKey } from '@/types';
import { type LoadGroup as LoadGroupItem } from '@/data/loadGroups';
import { useDeleteLoadGroup, useLoadGroupList } from '@/hooks/api/useLoadGroups';
import type { LoadGroup as BackendLoadGroup } from '@/api/types/loadGroups';

const PAGE_SIZE = 10;

function toUiLoadGroup(g: BackendLoadGroup): LoadGroupItem {
  return {
    id: String(g.id),
    name: g.name,
    description: g.description ?? '',
    // Keep the raw ISO value so sorting stays chronological — an "M/D/YYYY"
    // display string (e.g. from formatDateTime) sorts lexicographically wrong
    // (month "10" sorts before "9"). Formatted for display in LoadGroupRow.
    lastUpdated: g.last_modified ?? '',
    profiles: [],
  };
}

interface LoadGroupRowProps {
  item: LoadGroupItem;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function LoadGroupRow({ item, onEdit, onDuplicate, onDelete }: LoadGroupRowProps) {
  return (
    <tr
      {...rowInteractionProps(onEdit)}
      className="group cursor-pointer border-b border-[#e5e7eb] bg-white transition-colors hover:bg-[#f9fafb]"
    >
      <td className="px-3 py-4 text-[14px] font-medium leading-5 text-[#0a0a0a]">{item.name}</td>
      <td className="px-3 py-4 text-[14px] leading-5 text-[#6b7280]">{item.description}</td>
      <td className="w-[160px] px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
        {formatDateTime(item.lastUpdated)}
      </td>
      <td className="px-3 py-4">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <RowIconButton label="Edit load group" icon={Pencil} onClick={onEdit} />
          <RowIconButton label="Export load group" icon={Download} onClick={() => {}} />
          <RowIconButton label="Duplicate load group" icon={Copy} onClick={onDuplicate} />
          <RowIconButton label="Delete load group" icon={Trash2} onClick={onDelete} variant="danger" />
        </div>
      </td>
    </tr>
  );
}

export function LoadGroup() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState<LoadGroupSortKey>>({ key: 'lastUpdated', direction: 'desc' });
  const [page, setPage] = useState(1);
  const dateFilter = useDateFilterPopover(() => setPage(1));
  const { dateRange } = dateFilter;

  const { data: backendLoadGroups, isLoading, isError } = useLoadGroupList();
  const LOAD_GROUPS = useMemo(() => (backendLoadGroups ?? []).map(toUiLoadGroup), [backendLoadGroups]);

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const deleteMutation = useDeleteLoadGroup();

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(Number(pendingDelete.id));
      setPendingDelete(null);
    } catch {
      // deleteMutation.isError surfaces the failure in the dialog — stay open so the user can retry.
    }
  }

  const filtered = useMemo(() => {
    return LOAD_GROUPS.filter((g) => {
      if (!matchesQuery(query, [g.name, g.description])) return false;
      if (dateRange?.from || dateRange?.to) {
        const d = parseLastUpdated(g.lastUpdated);
        if (d) {
          if (dateRange.from && d < dateRange.from) return false;
          if (dateRange.to && d > new Date(dateRange.to.getTime() + 86399999)) return false;
        }
      }
      return true;
    });
  }, [LOAD_GROUPS, query, dateRange]);

  const sorted = useMemo(() => sortItems(filtered, sort, (g, key) => g[key]), [filtered, sort]);

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

  function handleSort(key: LoadGroupSortKey) {
    setSort((prev) => toggleSort(prev, key));
  }

  const COLUMNS: ListTableHeadColumn<LoadGroupSortKey>[] = [
    { label: 'Name', sortKey: 'name', className: 'w-[260px]' },
    { label: 'Description' },
    {
      label: 'Last updated',
      sortKey: 'lastUpdated',
      className: 'w-[160px]',
      action: <DateColumnFilter ariaLabel="Filter by last updated" {...dateFilter} />,
    },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <ListPageCard
            title="Load groups"
            headerActions={
              <button
                type="button"
                onClick={() => navigate('/load-group/new')}
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
              >
                New load group
              </button>
            }
            search={{
              value: query,
              onChange: (v) => { setQuery(v); setPage(1); },
              placeholder: 'Search for load group',
            }}
            filters={
              dateRange?.from || dateRange?.to ? (
                <DateRangeFilterChip label="Last updated" dateRange={dateRange} onClear={dateFilter.clear} />
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
                loadingLabel="Loading load groups…"
                errorLabel="Failed to load load groups from the server."
                rows={pageRows}
                renderRow={(item) => (
                  <LoadGroupRow
                    key={item.id}
                    item={item}
                    onEdit={() => navigate(`/load-group/${item.id}`)}
                    onDuplicate={() => navigate(`/load-group/new?duplicateFrom=${item.id}`)}
                    onDelete={() => setPendingDelete({ id: item.id, name: item.name })}
                  />
                )}
                emptyLabel="No load groups match your search."
              />
            </ListTable>
          </ListPageCard>
        </div>
      </main>

      <Footer />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete load group"
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
