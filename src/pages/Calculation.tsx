import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { CalculationRow } from '@/components/calculation/CalculationRow';
import { CalculationLogDialog } from '@/components/calculation/CalculationLogDialog';
import { ListPageCard } from '@/components/common/list/ListPageCard';
import { ListTable } from '@/components/common/list/ListTable';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { ListTableBody } from '@/components/common/list/ListTableBody';
import { ActiveFilterChip } from '@/components/common/list/ActiveFilterChip';
import { ColumnFilterButton } from '@/components/common/list/ColumnFilterButton';
import { ColumnFilterPanel } from '@/components/common/list/ColumnFilterPanel';
import { DateColumnFilter } from '@/components/common/list/DateColumnFilter';
import { DateRangeFilterChip } from '@/components/common/list/DateRangeFilterChip';
import { DeleteConfirmDialog } from '@/components/common/list/DeleteConfirmDialog';
import { useColumnFilter } from '@/hooks/useColumnFilter';
import { useDateFilterPopover } from '@/hooks/useDateFilterPopover';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { useSortState } from '@/hooks/useSortState';
import { matchesDateRange, matchesQuery, paginate, sortItems } from '@/lib/listTable';
import type { CalculationSortKey } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { type Calculation } from '@/data/calculations';
import {
  useDeleteProject,
  useProjectList,
  useUpdateProjectState,
  useExportProject,
} from '@/hooks/api/useProjects';
import type { Project } from '@/api/types/projects';

const PAGE_SIZE = 10;
const LIST_REFETCH_INTERVAL = 5000;

function toUiCalculation(p: Project): Calculation {
  return {
    id: p.uuid,
    name: p.name,
    description: p.description ?? '',
    timestamp: formatDateTime(p.created_at),
    // Keep the raw ISO value so sorting/filtering stays chronological — formatted at render.
    lastUpdated: p.last_modified ?? '',
    status: p.state === 'RUN' ? 'Running' : p.state === 'STOP' ? 'Stopped' : 'Draft',
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Calculation() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { sort, handleSort } = useSortState<CalculationSortKey>({
    key: 'lastUpdated',
    direction: 'desc',
  });
  const [page, setPage] = useState(1);
  const dateFilter = useDateFilterPopover(() => setPage(1));
  const { dateRange } = dateFilter;

  const { data: backendProjects, isLoading, isError } = useProjectList({
    refetchInterval: LIST_REFETCH_INTERVAL,
  });
  const CALCULATIONS = useMemo(
    () => (backendProjects ?? []).map(toUiCalculation),
    [backendProjects],
  );

  // Project/calculation ids are UUID strings, unlike the other list pages'
  // numeric backend ids — pass the id straight through instead of Number()-ing it.
  const deleteMutation = useDeleteProject();
  const { pendingDelete, setPendingDelete, handleConfirmDelete } = useDeleteConfirm<string>(
    deleteMutation,
    (id) => id,
  );

  const updateStateMutation = useUpdateProjectState();
  const exportMutation = useExportProject();
  const [logDialogProject, setLogDialogProject] = useState<{
    id: string;
    name: string;
    isRunning: boolean;
  } | null>(null);

  async function handleExport(item: Calculation) {
    try {
      const { blob, filename } = await exportMutation.mutateAsync(item.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // exportMutation's onError (via the global mutation cache) already surfaces a toast.
    }
  }

  const allStatuses = useMemo(
    () => [...new Set(CALCULATIONS.map((c) => c.status))].sort(),
    [CALCULATIONS],
  );
  const statusFilter = useColumnFilter(allStatuses, () => setPage(1));

  const filtered = useMemo(() => {
    return CALCULATIONS.filter((c) => {
      if (!matchesQuery(query, [c.name, c.description])) return false;
      if (statusFilter.selected.size > 0 && !statusFilter.selected.has(c.status)) return false;
      if (!matchesDateRange(c.lastUpdated, dateRange)) return false;
      return true;
    });
  }, [CALCULATIONS, query, statusFilter.selected, dateRange]);

  const sorted = useMemo(() => sortItems(filtered, sort, (c, key) => c[key]), [filtered, sort]);

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

  const COLUMNS: ListTableHeadColumn<CalculationSortKey>[] = [
    { label: 'Name', sortKey: 'name', className: 'w-[260px]' },
    { label: 'Description' },
    {
      label: 'Status',
      className: 'w-[180px]',
      action: (
        <ColumnFilterButton
          ariaLabel="Filter by status"
          active={statusFilter.selected.size > 0}
          onClick={statusFilter.openDropdown}
          buttonRef={statusFilter.btnRef}
        />
      ),
    },
    {
      label: 'Last updated',
      sortKey: 'lastUpdated',
      className: 'w-[200px]',
      action: <DateColumnFilter ariaLabel="Filter by last updated" {...dateFilter} />,
    },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <ListPageCard
            title="Calculations"
            headerActions={
              <button
                type="button"
                onClick={() => navigate('/calculation/new')}
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
              >
                New calculation
              </button>
            }
            search={{
              value: query,
              onChange: (v) => {
                setQuery(v);
                setPage(1);
              },
              placeholder: 'Search for calculation',
            }}
            filters={
              <>
                {(statusFilter.selected.size > 0 || dateRange?.from || dateRange?.to) && (
                  <span className="text-[13px] font-medium text-[#6b7280]">Filtered by</span>
                )}
                <ActiveFilterChip
                  label="Status"
                  selected={statusFilter.selected}
                  onClear={statusFilter.clear}
                />
                <DateRangeFilterChip
                  label="Last updated"
                  dateRange={dateRange}
                  onClear={dateFilter.clear}
                />
              </>
            }
            pagination={{ page, totalPages, onChange: setPage }}
          >
            <ListTable>
              <ListTableHead
                columns={COLUMNS}
                sort={sort}
                onSort={handleSort}
                actionsWidthClassName="w-[148px]"
              />
              <ListTableBody
                colSpan={5}
                isLoading={isLoading}
                isError={isError}
                loadingLabel="Loading calculations…"
                errorLabel="Failed to load calculations from the server."
                rows={pageRows}
                renderRow={(item) => (
                  <CalculationRow
                    key={item.id}
                    item={item}
                    onDelete={() => setPendingDelete({ id: item.id, name: item.name })}
                    onStart={() => updateStateMutation.mutate({ projectId: item.id, state: 'RUN' })}
                    onStop={() => updateStateMutation.mutate({ projectId: item.id, state: 'STOP' })}
                    onExport={() => handleExport(item)}
                    onShowLog={() =>
                      setLogDialogProject({
                        id: item.id,
                        name: item.name,
                        isRunning: item.status === 'Running',
                      })
                    }
                  />
                )}
                emptyLabel={
                  CALCULATIONS.length === 0
                    ? 'No calculations yet. Click "New calculation" to get started.'
                    : 'No calculations match your search.'
                }
              />
            </ListTable>
          </ListPageCard>
        </div>
      </main>

      <Footer />

      <DeleteConfirmDialog
        entityLabel="calculation"
        pendingDelete={pendingDelete}
        isPending={deleteMutation.isPending}
        isError={deleteMutation.isError}
        error={deleteMutation.error}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ColumnFilterPanel
        open={statusFilter.open}
        pos={statusFilter.pos}
        dropRef={statusFilter.dropRef}
        query={statusFilter.query}
        onQueryChange={statusFilter.setQuery}
        options={statusFilter.visibleOptions}
        selected={statusFilter.selected}
        onToggle={statusFilter.toggle}
        onToggleAll={statusFilter.toggleSelectAll}
        widthClassName="w-[200px]"
      />

      {logDialogProject && (
        <CalculationLogDialog
          projectId={logDialogProject.id}
          projectName={logDialogProject.name}
          isRunning={logDialogProject.isRunning}
          onClose={() => setLogDialogProject(null)}
        />
      )}
    </div>
  );
}
