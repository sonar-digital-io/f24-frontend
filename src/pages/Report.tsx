import { useMemo, useState } from 'react';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
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
import { ReportRow } from '@/components/report/ReportRow';
import { useColumnFilter } from '@/hooks/useColumnFilter';
import { useDateFilterPopover } from '@/hooks/useDateFilterPopover';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { useSortState } from '@/hooks/useSortState';
import { matchesDateRange, matchesQuery, paginate, sortItems } from '@/lib/listTable';
import { downloadBlob } from '@/lib/utils';
import { useDeleteReport, useExportReport, useReportList } from '@/hooks/api/useReports';
import type { ReportListItem } from '@/api/types/reports';
import type { ReportSortKey } from '@/types';

const PAGE_SIZE = 10;

export function Report() {
  const [query, setQuery] = useState('');
  const { sort, handleSort } = useSortState<ReportSortKey>({ key: 'createdAt', direction: 'desc' });
  const [page, setPage] = useState(1);
  const dateFilter = useDateFilterPopover(() => setPage(1));
  const { dateRange } = dateFilter;

  const { data, isLoading, isError } = useReportList();
  const reports = useMemo(() => data ?? [], [data]);

  const deleteMutation = useDeleteReport();
  const { pendingDelete, setPendingDelete, handleConfirmDelete } = useDeleteConfirm(deleteMutation);
  const exportMutation = useExportReport();

  async function handleExport(item: ReportListItem) {
    try {
      const { blob, filename } = await exportMutation.mutateAsync(item.id);
      downloadBlob(blob, filename);
    } catch {
      // exportMutation's onError (via the global mutation cache) already surfaces a toast.
    }
  }

  const allResults = useMemo(() => [...new Set(reports.map((r) => r.result))].sort(), [reports]);
  const resultFilter = useColumnFilter(allResults, () => setPage(1));

  const filtered = useMemo(
    () =>
      reports.filter((r) => {
        if (!matchesQuery(query, [r.project, `#${r.id}`])) return false;
        if (resultFilter.selected.size > 0 && !resultFilter.selected.has(r.result)) return false;
        return matchesDateRange(r.created_at, dateRange);
      }),
    [reports, query, resultFilter.selected, dateRange],
  );

  const sorted = useMemo(
    () =>
      sortItems(filtered, sort, (r, key) =>
        key === 'id' ? r.id : key === 'project' ? (r.project ?? '') : r.created_at,
      ),
    [filtered, sort],
  );

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

  const COLUMNS: ListTableHeadColumn<ReportSortKey>[] = [
    { label: 'ID', sortKey: 'id', className: 'w-[100px]' },
    { label: 'Project', sortKey: 'project' },
    {
      label: 'Result',
      className: 'w-[180px]',
      action: (
        <ColumnFilterButton
          ariaLabel="Filter by result"
          active={resultFilter.selected.size > 0}
          onClick={resultFilter.openDropdown}
          buttonRef={resultFilter.btnRef}
        />
      ),
    },
    {
      label: 'Created',
      sortKey: 'createdAt',
      className: 'w-[200px]',
      action: <DateColumnFilter ariaLabel="Filter by created date" {...dateFilter} />,
    },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <ListPageCard
            title="Reports"
            search={{
              value: query,
              onChange: (v) => {
                setQuery(v);
                setPage(1);
              },
              placeholder: 'Search for report',
            }}
            filters={
              <>
                {(resultFilter.selected.size > 0 || dateRange?.from || dateRange?.to) && (
                  <span className="text-[13px] font-medium text-[#6b7280]">Filtered by</span>
                )}
                <ActiveFilterChip
                  label="Result"
                  selected={resultFilter.selected}
                  onClear={resultFilter.clear}
                />
                <DateRangeFilterChip
                  label="Created"
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
                actionsWidthClassName="w-[108px]"
              />
              <ListTableBody
                colSpan={5}
                isLoading={isLoading}
                isError={isError}
                loadingLabel="Loading reports…"
                errorLabel="Failed to load reports from the server."
                rows={pageRows}
                renderRow={(item) => (
                  <ReportRow
                    key={item.id}
                    item={item}
                    onExport={() => handleExport(item)}
                    onDelete={() =>
                      setPendingDelete({
                        id: String(item.id),
                        name: item.project ? `${item.project} #${item.id}` : `#${item.id}`,
                      })
                    }
                  />
                )}
                emptyLabel={
                  reports.length === 0 ? 'No reports yet.' : 'No reports match your search.'
                }
              />
            </ListTable>
          </ListPageCard>
        </div>
      </main>

      <Footer />

      <DeleteConfirmDialog
        entityLabel="report"
        pendingDelete={pendingDelete}
        isPending={deleteMutation.isPending}
        isError={deleteMutation.isError}
        error={deleteMutation.error}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ColumnFilterPanel
        open={resultFilter.open}
        pos={resultFilter.pos}
        dropRef={resultFilter.dropRef}
        query={resultFilter.query}
        onQueryChange={resultFilter.setQuery}
        options={resultFilter.visibleOptions}
        selected={resultFilter.selected}
        onToggle={resultFilter.toggle}
        onToggleAll={resultFilter.toggleSelectAll}
        widthClassName="w-[200px]"
      />
    </div>
  );
}
