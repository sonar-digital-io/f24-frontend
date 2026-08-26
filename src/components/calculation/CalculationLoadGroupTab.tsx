import type { ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { PickerListCard } from '@/components/calculation/PickerListCard';
import { CalculationLoadGroupRow } from '@/components/calculation/CalculationLoadGroupRow';
import type { SortState, CalcLoadGroupSortKey } from '@/types';

export interface LoadGroupListItem {
  id: number;
  name: string;
  description: string;
  user: string;
  lastUpdated: string;
}

interface CalculationLoadGroupTabProps {
  isLoading: boolean;
  isError: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortState<CalcLoadGroupSortKey>;
  onSort: (key: CalcLoadGroupSortKey) => void;
  pageRows: LoadGroupListItem[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  selectedGroupId: number | null;
  onSelectGroup: (id: number) => void;
  expandedGroupIds: Set<number>;
  onTogglePreview: (id: number) => void;
  expandedCaseIds: Set<number>;
  onToggleCasePreview: (id: number) => void;
}

const COLUMNS: ListTableHeadColumn<CalcLoadGroupSortKey>[] = [
  { label: 'Last updated', sortKey: 'last_modified', className: 'w-[160px]' },
  { label: 'Name', sortKey: 'name', className: 'w-[200px]' },
  { label: 'User', className: 'w-[220px]' },
  { label: 'Description' },
];

export function CalculationLoadGroupTab({
  isLoading,
  isError,
  search,
  onSearchChange,
  sort,
  onSort,
  pageRows,
  page,
  totalPages,
  onPageChange,
  selectedGroupId,
  onSelectGroup,
  expandedGroupIds,
  onTogglePreview,
  expandedCaseIds,
  onToggleCasePreview,
}: CalculationLoadGroupTabProps) {
  return (
    <PickerListCard
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search load groups"
      columns={COLUMNS}
      sort={sort}
      onSort={onSort}
      leadingWidthClassName="w-[52px]"
      actionsWidthClassName="w-[100px]"
      isLoading={isLoading}
      isError={isError}
      rowCount={pageRows.length}
      entityLabelPlural="load groups"
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
    >
      {pageRows.map((group) => (
        <CalculationLoadGroupRow
          key={group.id}
          group={group}
          isSelected={selectedGroupId === group.id}
          onSelectGroup={onSelectGroup}
          isExpanded={expandedGroupIds.has(group.id)}
          onTogglePreview={onTogglePreview}
          expandedCaseIds={expandedCaseIds}
          onToggleCasePreview={onToggleCasePreview}
        />
      ))}
    </PickerListCard>
  );
}
