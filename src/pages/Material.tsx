import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Filter, X } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { MaterialRow } from '@/components/material/MaterialRow';
import { MaterialDateFilterPopover } from '@/components/material/MaterialDateFilterPopover';
import { ConfirmDialog } from '@/components/common/dialog/ConfirmDialog';
import { Pagination } from '@/components/common/list/Pagination';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { ListPageHeader } from '@/components/common/list/ListPageHeader';
import { ListSearchInput } from '@/components/common/list/ListSearchInput';
import { ListTableBody } from '@/components/common/list/ListTableBody';
import { ActiveFilterChip } from '@/components/common/list/ActiveFilterChip';
import { ColumnFilterButton } from '@/components/common/list/ColumnFilterButton';
import { ColumnFilterPanel } from '@/components/common/list/ColumnFilterPanel';
import { useColumnFilter } from '@/hooks/useColumnFilter';
import { useDateFilterPopover } from '@/hooks/useDateFilterPopover';
import { matchesQuery, paginate, sortItems, toggleSetMember, toggleSort } from '@/lib/listTable';
import { toUiMaterial, formatDateLabel, parseLastUpdated } from '@/lib/materialListMapping';
import type { SortState, MaterialSortKey } from '@/types';
import { lastUpdatedSortKey, type Material } from '@/data/materials';
import { useDeleteMaterial, useExportMaterial, useMaterialList } from '@/hooks/api/useMaterials';

const PAGE_SIZE = 10;

export function Material() {
  const navigate = useNavigate();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState<MaterialSortKey>>({ key: 'lastUpdated', direction: 'desc' });
  const [page, setPage] = useState(1);
  const {
    dateRange,
    filterOpen,
    filterPos,
    filterBtnRef,
    popoverRef,
    leftMonth,
    rightMonth,
    setLeftMonth,
    setRightMonth,
    goPrev,
    goNext,
    openFilter,
    handleSelect: handleDateRangeSelect,
    clear: clearDateRange,
  } = useDateFilterPopover(() => setPage(1));

  const { data: backendMaterials, isLoading, isError } = useMaterialList();
  const materials = useMemo(() => (backendMaterials ?? []).map(toUiMaterial), [backendMaterials]);

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const deleteMutation = useDeleteMaterial();
  const exportMutation = useExportMaterial();

  function handleDuplicate(material: Material) {
    navigate(`/material/new?duplicateFrom=${material.id}`);
  }

  async function handleExport(material: Material) {
    try {
      const { blob, filename } = await exportMutation.mutateAsync(Number(material.id));
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

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(Number(pendingDelete.id));
      setPendingDelete(null);
    } catch {
      // deleteMutation.isError surfaces the failure in the dialog — stay open so the user can retry.
    }
  }

  const allTypes = useMemo(
    () => [...new Set(materials.map((m) => m.type).filter(Boolean))].sort(),
    [materials]
  );
  const typeFilter = useColumnFilter(allTypes, () => setPage(1));

  const filtered = useMemo(() => {
    return materials.filter((m) => {
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
  }, [materials, query, typeFilter.selected, dateRange]);

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
            <ListPageHeader
              title="Materials"
              actions={
                <Link
                  to="/material/new"
                  className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
                >
                  New material
                </Link>
              }
            />

            {/* Search + date filter */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ListSearchInput
                value={query}
                onChange={(v) => { setQuery(v); setPage(1); }}
                placeholder="Search for materials"
              />

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
                    onClick={clearDateRange}
                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[#9ca3af] hover:bg-[#e5e7eb] hover:text-[#0a0a0a]"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full table-fixed border-collapse [&_tbody_tr:last-child]:border-b-0" style={{ minWidth: 1100 }}>
                <ListTableHead
                  columns={COLUMNS}
                  sort={sort}
                  onSort={handleSort}
                  leadingWidthClassName="w-[52px]"
                />
                <ListTableBody
                  colSpan={6}
                  isLoading={isLoading}
                  isError={isError}
                  loadingLabel="Loading materials…"
                  errorLabel="Failed to load materials from the server."
                  rows={pageRows}
                  renderRow={(material) => (
                    <MaterialRow
                      key={material.id}
                      material={material}
                      expanded={expandedIds.has(material.id)}
                      onToggle={() => toggleExpand(material.id)}
                      onOpen={() => navigate(`/material/${material.id}`)}
                      onExport={() => handleExport(material)}
                      onDuplicate={() => handleDuplicate(material)}
                      onDelete={() => setPendingDelete({ id: material.id, name: material.name })}
                    />
                  )}
                  emptyLabel="No materials match your search."
                />
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
            onSelect={handleDateRangeSelect}
            onPrevMonth={goPrev}
            onNextMonth={goNext}
          />,
          document.body
        )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete material"
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
