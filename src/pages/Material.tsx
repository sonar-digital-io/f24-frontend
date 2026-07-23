import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Filter, Search, X } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { MaterialRow } from '@/components/material/MaterialRow';
import { MaterialDateFilterPopover } from '@/components/material/MaterialDateFilterPopover';
import { Pagination } from '@/components/common/list/Pagination';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { ActiveFilterChip } from '@/components/common/list/ActiveFilterChip';
import { ColumnFilterButton } from '@/components/common/list/ColumnFilterButton';
import { ColumnFilterPanel } from '@/components/common/list/ColumnFilterPanel';
import { useColumnFilter } from '@/hooks/useColumnFilter';
import { matchesQuery, paginate, sortItems, toggleSetMember, toggleSort } from '@/lib/listTable';
import type { SortState, MaterialSortKey } from '@/types';
import { Input } from '@/components/ui/input';
import { MATERIALS, lastUpdatedSortKey } from '@/data/materials';

const PAGE_SIZE = 10;

function formatDateLabel(d: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = d.getDate();
  const s = day === 1 || day === 21 || day === 31 ? 'st'
    : day === 2 || day === 22 ? 'nd'
    : day === 3 || day === 23 ? 'rd' : 'th';
  return `${months[d.getMonth()]} ${day}${s}, ${d.getFullYear()}`;
}


function parseLastUpdated(s: string): Date | null {
  const vMatch = s.match(/^v(\d{4})\/(\d{2})$/);
  if (vMatch) return new Date(`${vMatch[1]}-${vMatch[2]}-01T00:00:00`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00');
  return null;
}

export function Material() {
  const navigate = useNavigate();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPos, setFilterPos] = useState<{ top: number; left: number } | null>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [leftMonth, setLeftMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 1, 1);
  });
  const [rightMonth, setRightMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [sort, setSort] = useState<SortState<MaterialSortKey>>({ key: 'lastUpdated', direction: 'desc' });
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!filterOpen) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (filterBtnRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setFilterOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [filterOpen]);

  function goPrev() {
    setLeftMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    setRightMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }
  function goNext() {
    setLeftMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    setRightMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  function openFilter() {
    if (!filterOpen && filterBtnRef.current) {
      const r = filterBtnRef.current.getBoundingClientRect();
      const estimatedWidth = 648;
      const left = Math.max(8, r.right + window.scrollX - estimatedWidth);
      setFilterPos({ top: r.bottom + window.scrollY + 6, left });
    }
    setFilterOpen((o) => !o);
  }

  const allTypes = useMemo(() => [...new Set(MATERIALS.map((m) => m.type))].sort(), []);
  const typeFilter = useColumnFilter(allTypes, () => setPage(1));

  const filtered = useMemo(() => {
    return MATERIALS.filter((m) => {
      if (!matchesQuery(query, [m.name, m.type, m.description])) return false;
      if (typeFilter.selected.size > 0 && !typeFilter.selected.has(m.type)) return false;
      if (dateRange?.from || dateRange?.to) {
        const d = parseLastUpdated(m.lastUpdated);
        if (d) {
          if (dateRange.from && d < dateRange.from) return false;
          if (dateRange.to && d > new Date(dateRange.to.getTime() + 86399999)) return false;
        }
      }
      return true;
    });
  }, [query, typeFilter.selected, dateRange]);

  // lastUpdated mixes vYYYY/MM (library) and YYYY-MM-DD (own) — normalize before comparing.
  const sorted = useMemo(
    () =>
      sortItems(filtered, sort, (m, key) =>
        key === 'lastUpdated' ? lastUpdatedSortKey(m.lastUpdated) : m[key]
      ),
    [filtered, sort]
  );

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

  function handleSort(key: MaterialSortKey) {
    setSort((prev) => toggleSort(prev, key));
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => toggleSetMember(prev, id));
  }

  const COLUMNS: ListTableHeadColumn<MaterialSortKey>[] = [
    { label: 'Name', sortKey: 'name', className: 'w-[240px]' },
    {
      label: 'Type',
      sortKey: 'type',
      className: 'w-[240px]',
      action: (
        <ColumnFilterButton
          ariaLabel="Filter by type"
          active={typeFilter.selected.size > 0}
          onClick={typeFilter.openDropdown}
          buttonRef={typeFilter.btnRef}
        />
      ),
    },
    { label: 'Source', sortKey: 'source', className: 'w-[110px]' },
    { label: 'Description' },
    {
      label: 'Last updated',
      sortKey: 'lastUpdated',
      className: 'w-[160px]',
      action: (
        <button
          ref={filterBtnRef}
          type="button"
          aria-label="Filter by last updated"
          onClick={openFilter}
          className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#f1f5f9] ${
            dateRange?.from || dateRange?.to ? 'text-[#006496]' : 'text-[#9ca3af]'
          }`}
        >
          <Filter className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
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
              <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Materials</h2>
              <Link
                to="/material/new"
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
              >
                New material
              </Link>
            </div>

            {/* Search + date filter */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="relative w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
                <Input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  placeholder="Search for materials"
                  className="h-9 rounded-md border-[#e2e8f0] pl-9 text-[14px]"
                />
              </div>

              {(typeFilter.selected.size > 0 || dateRange?.from || dateRange?.to) && (
                <span className="text-[13px] font-medium text-[#6b7280]">Filtered by</span>
              )}

              <ActiveFilterChip label="Type" selected={typeFilter.selected} onClear={typeFilter.clear} />

              {(dateRange?.from || dateRange?.to) && (
                <div className="flex items-center gap-1 rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-3 py-1.5 text-[13px]">
                  <span className="text-[#9ca3af]">Last updated</span>
                  <span className="font-semibold text-[#0a0a0a]">
                    {dateRange?.from ? formatDateLabel(dateRange.from) : '…'}
                    {' – '}
                    {dateRange?.to ? formatDateLabel(dateRange.to) : '…'}
                  </span>
                  <button
                    type="button"
                    aria-label="Clear date filter"
                    onClick={() => { setDateRange(undefined); setPage(1); }}
                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[#9ca3af] hover:bg-[#e5e7eb] hover:text-[#0a0a0a]"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full table-fixed border-collapse" style={{ minWidth: 1100 }}>
                <ListTableHead
                  columns={COLUMNS}
                  sort={sort}
                  onSort={handleSort}
                  leadingWidthClassName="w-[52px]"
                />
                <tbody>
                  {pageRows.map((material) => (
                    <MaterialRow
                      key={material.id}
                      material={material}
                      expanded={expandedIds.has(material.id)}
                      onToggle={() => toggleExpand(material.id)}
                      onOpen={() => navigate(`/material/${material.id}`)}
                    />
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
                        No materials match your search.
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

      {filterOpen &&
        filterPos &&
        createPortal(
          <MaterialDateFilterPopover
            ref={popoverRef}
            top={filterPos.top}
            left={filterPos.left}
            leftMonth={leftMonth}
            rightMonth={rightMonth}
            dateRange={dateRange}
            onLeftMonthChange={setLeftMonth}
            onRightMonthChange={setRightMonth}
            onSelect={(range) => {
              setDateRange(range);
              setPage(1);
              if (range?.from && range?.to) setFilterOpen(false);
            }}
            onPrevMonth={goPrev}
            onNextMonth={goNext}
          />,
          document.body
        )}
    </div>
  );
}
