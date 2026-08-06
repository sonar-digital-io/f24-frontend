import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { CalculationRow } from '@/components/calculation/CalculationRow';
import { Pagination } from '@/components/common/list/Pagination';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { ActiveFilterChip } from '@/components/common/list/ActiveFilterChip';
import { ColumnFilterButton } from '@/components/common/list/ColumnFilterButton';
import { ColumnFilterPanel } from '@/components/common/list/ColumnFilterPanel';
import { useColumnFilter } from '@/hooks/useColumnFilter';
import { matchesQuery, paginate, sortItems, toggleSort } from '@/lib/listTable';
import type { SortState, CalculationSortKey } from '@/types';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/utils';
import { type Calculation } from '@/data/calculations';
import { useProjectList } from '@/hooks/api/useProjects';
import type { Project } from '@/api/types/projects';

const PAGE_SIZE = 10;

function toUiCalculation(p: Project): Calculation {
  return {
    id: p.uuid,
    name: p.name,
    description: p.description ?? '',
    timestamp: formatDateTime(p.created_at),
    status: p.state === 'RUNNING' ? 'Running' : p.state === 'STOPPED' ? 'Stopped' : 'Draft',
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Calculation() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState<CalculationSortKey>>({ key: 'timestamp', direction: 'desc' });
  const [page, setPage] = useState(1);

  const { data: backendProjects, isLoading, isError } = useProjectList();
  const CALCULATIONS = useMemo(() => (backendProjects ?? []).map(toUiCalculation), [backendProjects]);

  const allStatuses = useMemo(() => [...new Set(CALCULATIONS.map((c) => c.status))].sort(), [CALCULATIONS]);
  const statusFilter = useColumnFilter(allStatuses, () => setPage(1));

  const filtered = useMemo(
    () =>
      CALCULATIONS.filter(
        (c) =>
          matchesQuery(query, [c.name, c.description]) &&
          (statusFilter.selected.size === 0 || statusFilter.selected.has(c.status))
      ),
    [CALCULATIONS, query, statusFilter.selected]
  );

  const sorted = useMemo(() => sortItems(filtered, sort, (c, key) => c[key]), [filtered, sort]);

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

  function handleSort(key: CalculationSortKey) {
    setSort((prev) => toggleSort(prev, key));
  }

  const COLUMNS: ListTableHeadColumn<CalculationSortKey>[] = [
    { label: 'Name', sortKey: 'name', className: 'w-[260px]' },
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
    { label: 'Created at', sortKey: 'timestamp', className: 'w-[200px]' },
    { label: 'Description' },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            {/* Header */}
            <div className="flex h-9 items-center justify-between">
              <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Calculations</h2>
              <button
                type="button"
                onClick={() => navigate('/calculation/new')}
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
              >
                New calculation
              </button>
            </div>

            {/* Search + filter chips */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="relative w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
                <Input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  placeholder="Search"
                  className="h-9 rounded-md border-[#e2e8f0] pl-9 text-[14px]"
                />
              </div>

              {statusFilter.selected.size > 0 && (
                <>
                  <span className="text-[13px] font-medium text-[#6b7280]">Filtered by</span>
                  <ActiveFilterChip label="Status" selected={statusFilter.selected} onClear={statusFilter.clear} />
                </>
              )}
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse">
                <ListTableHead
                  columns={COLUMNS}
                  sort={sort}
                  onSort={handleSort}
                  actionsWidthClassName="w-[148px]"
                />
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
                        Loading calculations…
                      </td>
                    </tr>
                  )}
                  {isError && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-[14px] text-[#dc2626]">
                        Failed to load calculations from the server.
                      </td>
                    </tr>
                  )}
                  {!isLoading &&
                    !isError &&
                    pageRows.map((item) => <CalculationRow key={item.id} item={item} />)}
                  {!isLoading && !isError && pageRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
                        {CALCULATIONS.length === 0
                          ? 'No calculations yet. Click "New calculation" to get started.'
                          : 'No calculations match your search.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </div>
        </div>
      </main>

      <Footer />

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
    </div>
  );
}
