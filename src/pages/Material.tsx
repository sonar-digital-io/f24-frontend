import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { MaterialRow } from '@/components/material/MaterialRow';
import { DeleteConfirmDialog } from '@/components/common/list/DeleteConfirmDialog';
import { ListPageCard } from '@/components/common/list/ListPageCard';
import { ListTable } from '@/components/common/list/ListTable';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { ListTableBody } from '@/components/common/list/ListTableBody';
import { ActiveFilterChip } from '@/components/common/list/ActiveFilterChip';
import { ColumnFilterButton } from '@/components/common/list/ColumnFilterButton';
import { ColumnFilterPanel } from '@/components/common/list/ColumnFilterPanel';
import { DateColumnFilter } from '@/components/common/list/DateColumnFilter';
import { DateRangeFilterChip } from '@/components/common/list/DateRangeFilterChip';
import { useColumnFilter } from '@/hooks/useColumnFilter';
import { useDateFilterPopover } from '@/hooks/useDateFilterPopover';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { useSortState } from '@/hooks/useSortState';
import {
  matchesDateRange,
  matchesQuery,
  paginate,
  sortItems,
  toggleSetMember,
} from '@/lib/listTable';
import { toUiMaterial } from '@/lib/materialListMapping';
import { getMechPropTypeParameter } from '@/lib/sysconfigMapping';
import { toTitleCase } from '@/lib/utils';
import type { MaterialSortKey } from '@/types';
import { lastUpdatedSortKey, type Material } from '@/data/materials';
import { useDeleteMaterial, useExportMaterial, useMaterialList } from '@/hooks/api/useMaterials';
import { useMaterialSysconfig } from '@/hooks/api/useSysconfig';

const PAGE_SIZE = 10;

export function Material() {
  const navigate = useNavigate();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const { sort, handleSort } = useSortState<MaterialSortKey>({
    key: 'lastUpdated',
    direction: 'desc',
  });
  const [page, setPage] = useState(1);
  const dateFilter = useDateFilterPopover(() => setPage(1));
  const { dateRange } = dateFilter;

  const { data: backendMaterials, isLoading, isError } = useMaterialList();
  // Parameterless (no ?material=) sysconfig fetch — just need mech_prop_type's id->name catalog.
  const { data: sysconfigData } = useMaterialSysconfig(NaN);
  const typeNameById = useMemo(() => {
    const options = sysconfigData ? getMechPropTypeParameter(sysconfigData)?.options : undefined;
    return new Map((options ?? []).map((o) => [o.id, toTitleCase(o.name)]));
  }, [sysconfigData]);
  const materials = useMemo(
    () =>
      (backendMaterials ?? []).map((m) => {
        const ui = toUiMaterial(m);
        return { ...ui, type: typeNameById.get(ui.type) ?? ui.type };
      }),
    [backendMaterials, typeNameById],
  );

  const deleteMutation = useDeleteMaterial();
  const { pendingDelete, setPendingDelete, handleConfirmDelete } = useDeleteConfirm(deleteMutation);
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

  const allTypes = useMemo(
    () => [...new Set(materials.map((m) => m.type).filter(Boolean))].sort(),
    [materials],
  );
  const typeFilter = useColumnFilter(allTypes, () => setPage(1));

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      if (!matchesQuery(query, [m.name, m.type, m.description])) return false;
      if (typeFilter.selected.size > 0 && !typeFilter.selected.has(m.type)) return false;
      if (!matchesDateRange(m.lastUpdated, dateRange)) return false;
      return true;
    });
  }, [materials, query, typeFilter.selected, dateRange]);

  // lastUpdated mixes vYYYY/MM (library) and YYYY-MM-DD (own) — normalize before comparing.
  const sorted = useMemo(
    () =>
      sortItems(filtered, sort, (m, key) =>
        key === 'lastUpdated' ? lastUpdatedSortKey(m.lastUpdated) : m[key],
      ),
    [filtered, sort],
  );

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => toggleSetMember(prev, id));
  }

  const COLUMNS: ListTableHeadColumn<MaterialSortKey>[] = [
    { label: 'Name', sortKey: 'name', className: 'w-[240px]' },
    { label: 'Description' },
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
            title="Materials"
            headerActions={
              <Link
                to="/material/new"
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
              >
                New material
              </Link>
            }
            search={{
              value: query,
              onChange: (v) => {
                setQuery(v);
                setPage(1);
              },
              placeholder: 'Search for materials',
            }}
            filters={
              <>
                {(typeFilter.selected.size > 0 || dateRange?.from || dateRange?.to) && (
                  <span className="text-[13px] font-medium text-[#6b7280]">Filtered by</span>
                )}
                <ActiveFilterChip
                  label="Type"
                  selected={typeFilter.selected}
                  onClear={typeFilter.clear}
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
            <ListTable fixedLayout minWidth={1100}>
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
                    typeNameById={typeNameById}
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
            </ListTable>
          </ListPageCard>
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

      <DeleteConfirmDialog
        entityLabel="material"
        pendingDelete={pendingDelete}
        isPending={deleteMutation.isPending}
        isError={deleteMutation.isError}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
