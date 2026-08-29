import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { ListPageCard } from '@/components/common/list/ListPageCard';
import { ListTable } from '@/components/common/list/ListTable';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { ListTableBody } from '@/components/common/list/ListTableBody';
import { DateColumnFilter } from '@/components/common/list/DateColumnFilter';
import { DateRangeFilterChip } from '@/components/common/list/DateRangeFilterChip';
import { DeleteConfirmDialog } from '@/components/common/list/DeleteConfirmDialog';
import { LoadGroupListRow } from '@/components/load-group/LoadGroupListRow';
import {
  matchesDateRange,
  matchesQuery,
  paginate,
  sortItems,
  toggleSetMember,
} from '@/lib/listTable';
import { useDateFilterPopover } from '@/hooks/useDateFilterPopover';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { useSortState } from '@/hooks/useSortState';
import type { LoadGroupSortKey } from '@/types';
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

export function LoadGroup() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { sort, handleSort } = useSortState<LoadGroupSortKey>({
    key: 'lastUpdated',
    direction: 'desc',
  });
  const [page, setPage] = useState(1);
  const dateFilter = useDateFilterPopover(() => setPage(1));
  const { dateRange } = dateFilter;

  const { data: backendLoadGroups, isLoading, isError } = useLoadGroupList();
  const LOAD_GROUPS = useMemo(
    () => (backendLoadGroups ?? []).map(toUiLoadGroup),
    [backendLoadGroups],
  );

  const deleteMutation = useDeleteLoadGroup();
  const { pendingDelete, setPendingDelete, handleConfirmDelete } = useDeleteConfirm(deleteMutation);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => toggleSetMember(prev, id));
  }

  const filtered = useMemo(() => {
    return LOAD_GROUPS.filter((g) => {
      if (!matchesQuery(query, [g.name, g.description])) return false;
      if (!matchesDateRange(g.lastUpdated, dateRange)) return false;
      return true;
    });
  }, [LOAD_GROUPS, query, dateRange]);

  const sorted = useMemo(() => sortItems(filtered, sort, (g, key) => g[key]), [filtered, sort]);

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

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
              onChange: (v) => {
                setQuery(v);
                setPage(1);
              },
              placeholder: 'Search for load group',
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
              <ListTableHead
                columns={COLUMNS}
                sort={sort}
                onSort={handleSort}
                leadingWidthClassName="w-[52px]"
              />
              <ListTableBody
                colSpan={5}
                isLoading={isLoading}
                isError={isError}
                loadingLabel="Loading load groups…"
                errorLabel="Failed to load load groups from the server."
                rows={pageRows}
                renderRow={(item) => (
                  <LoadGroupListRow
                    key={item.id}
                    item={item}
                    expanded={expandedIds.has(item.id)}
                    onToggle={() => toggleExpand(item.id)}
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

      <DeleteConfirmDialog
        entityLabel="load group"
        pendingDelete={pendingDelete}
        isPending={deleteMutation.isPending}
        isError={deleteMutation.isError}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
