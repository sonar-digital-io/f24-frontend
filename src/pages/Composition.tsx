import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Download, Pencil, Trash2 } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { Pagination } from '@/components/common/list/Pagination';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { ListPageHeader } from '@/components/common/list/ListPageHeader';
import { ListSearchInput } from '@/components/common/list/ListSearchInput';
import { ListTableBody } from '@/components/common/list/ListTableBody';
import { matchesQuery, paginate, sortItems, toggleSort } from '@/lib/listTable';
import type { SortState, ViewMode, CompositionSortKey } from '@/types';
import { ActiveFilterChip } from '@/components/common/list/ActiveFilterChip';
import { ColumnFilterButton } from '@/components/common/list/ColumnFilterButton';
import { ColumnFilterPanel } from '@/components/common/list/ColumnFilterPanel';
import { ViewModeToggle } from '@/components/common/list/ViewModeToggle';
import { RowIconButton } from '@/components/common/list/RowIconButton';
import { useColumnFilter } from '@/hooks/useColumnFilter';
import { formatDateTime } from '@/lib/utils';
import { CompositionCard } from '@/components/composition/CompositionCard';
import { type Composition as CompositionItem } from '@/data/compositions';
import { type BladeType } from '@/data/geometries';
import { ConfirmDialog } from '@/components/common/dialog/ConfirmDialog';
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
    lastUpdated: formatDateTime(c.last_modified),
  };
}

export function Composition() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('list');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState<CompositionSortKey>>({ key: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);

  const { data: backendCompositions, isLoading, isError } = useCompositionList();
  const COMPOSITIONS = useMemo(() => (backendCompositions ?? []).map(toUiComposition), [backendCompositions]);

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const deleteMutation = useDeleteComposition();

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(Number(pendingDelete.id));
      setPendingDelete(null);
    } catch {
      // deleteMutation.isError surfaces the failure in the dialog — stay open so the user can retry.
    }
  }

  const allTypes = useMemo(() => [...new Set(COMPOSITIONS.map((c) => c.type))].sort(), [COMPOSITIONS]);
  const typeFilter = useColumnFilter(allTypes, () => setPage(1));

  const filtered = useMemo(
    () =>
      COMPOSITIONS.filter(
        (c) =>
          matchesQuery(query, [c.name, c.description]) &&
          (typeFilter.selected.size === 0 || typeFilter.selected.has(c.type))
      ),
    [COMPOSITIONS, query, typeFilter.selected]
  );

  const sorted = useMemo(
    () => sortItems(filtered, sort, (c, key) => (key === 'nominalRadius' ? c.nominalRadius : c[key])),
    [filtered, sort]
  );

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

  function handleSort(key: CompositionSortKey) {
    setSort((prev) => toggleSort(prev, key));
  }

  const COLUMNS: ListTableHeadColumn<CompositionSortKey>[] = [
    { label: 'Name', sortKey: 'name', className: 'w-[240px]' },
    { label: 'Description' },
    { label: 'Nominal radius', sortKey: 'nominalRadius', className: 'w-[140px]' },
    {
      label: 'Type',
      className: 'w-[180px]',
      action: (
        <ColumnFilterButton
          ariaLabel="Filter by type"
          active={typeFilter.selected.size > 0}
          onClick={typeFilter.openDropdown}
          buttonRef={typeFilter.btnRef}
        />
      ),
    },
    { label: 'Last updated', sortKey: 'lastUpdated', className: 'w-[160px] whitespace-nowrap' },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <ListPageHeader
              title="Compositions"
              actions={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center rounded-md border border-[#e2e8f0] bg-white px-4 py-2 text-[14px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#f1f5f9]"
                  >
                    Import
                  </button>
                  <Link
                    to="/composition/new"
                    className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
                  >
                    New composition
                  </Link>
                </div>
              }
            />

            {/* Search + view toggle */}
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <ListSearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} widthClassName="w-[384px]" />

                {typeFilter.selected.size > 0 && (
                  <>
                    <span className="text-[13px] font-medium text-[#6b7280]">Filtered by</span>
                    <ActiveFilterChip label="Type" selected={typeFilter.selected} onClear={typeFilter.clear} />
                  </>
                )}
              </div>

              <ViewModeToggle value={view} onChange={setView} />
            </div>

            {/* List view */}
            {view === 'list' && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse">
                  <ListTableHead columns={COLUMNS} sort={sort} onSort={handleSort} />
                  <ListTableBody
                    colSpan={6}
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
                          {c.nominalRadius} m
                        </td>
                        <td className="px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
                          {c.type}
                        </td>
                        <td className="px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
                          {c.lastUpdated}
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <RowIconButton
                              label="Edit composition"
                              icon={Pencil}
                              onClick={() => navigate(`/composition/${c.id}`)}
                            />
                            <RowIconButton label="Export composition" icon={Download} onClick={() => {}} />
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
                </table>
              </div>
            )}

            {/* Grid view */}
            {view === 'grid' && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {pageRows.map((c) => (
                  <CompositionCard
                    key={c.id}
                    composition={c}
                    onClick={() => navigate(`/composition/${c.id}`)}
                  />
                ))}
                {pageRows.length === 0 && (
                  <div className="col-span-full py-8 text-center text-[14px] text-[#6b7280]">
                    No compositions match your search.
                  </div>
                )}
              </div>
            )}

            {/* Pagination (only on list view) */}
            {view === 'list' && (
              <div className="mt-4">
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            )}
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete composition"
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
