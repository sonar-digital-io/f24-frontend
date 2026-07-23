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
import { matchesQuery, paginate, sortItems, toggleSetMember, toggleSort } from '@/lib/listTable';
import type { SortState, CalculationSortKey } from '@/types';
import { Input } from '@/components/ui/input';
import { CALCULATIONS, timestampValue } from '@/data/calculations';

const PAGE_SIZE = 10;

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Calculation() {
  const navigate = useNavigate();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState<CalculationSortKey>>({ key: 'timestamp', direction: 'desc' });
  const [page, setPage] = useState(1);

  const allStatuses = useMemo(() => [...new Set(CALCULATIONS.map((c) => c.status))].sort(), []);
  const statusFilter = useColumnFilter(allStatuses, () => setPage(1));

  function toggleExpand(id: string) {
    setExpandedIds((prev) => toggleSetMember(prev, id));
  }

  const filtered = useMemo(
    () =>
      CALCULATIONS.filter(
        (c) =>
          matchesQuery(query, [c.name, c.description]) &&
          (statusFilter.selected.size === 0 || statusFilter.selected.has(c.status))
      ),
    [query, statusFilter.selected]
  );

  // Timestamps are '2026-04-13 1:43 PM' strings — 12-hour times don't sort
  // lexically, so compare them as parsed values.
  const sorted = useMemo(
    () =>
      sortItems(filtered, sort, (c, key) => (key === 'timestamp' ? timestampValue(c.timestamp) : c[key])),
    [filtered, sort]
  );

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

  function handleSort(key: CalculationSortKey) {
    setSort((prev) => toggleSort(prev, key));
  }

  const COLUMNS: ListTableHeadColumn<CalculationSortKey>[] = [
    { label: 'Name', sortKey: 'name', className: 'w-[260px]' },
    { label: 'Description' },
    { label: 'Start time', sortKey: 'timestamp', className: 'w-[200px]' },
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
                  leadingWidthClassName="w-[52px]"
                  actionsWidthClassName="w-[148px]"
                />
                <tbody>
                  {pageRows.map((item) => (
                    <CalculationRow
                      key={item.id}
                      item={item}
                      expanded={expandedIds.has(item.id)}
                      onToggle={() => toggleExpand(item.id)}
                    />
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-[14px] text-[#6b7280]"
                      >
                        No calculations match your search.
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
