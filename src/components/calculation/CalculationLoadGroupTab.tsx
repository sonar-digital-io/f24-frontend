import type { ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { PickerListCard } from '@/components/common/list/PickerListCard';
import { SelectButton } from '@/components/common/list/SelectButton';
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
}: CalculationLoadGroupTabProps) {
  return (
    <PickerListCard
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search load groups"
      columns={COLUMNS}
      sort={sort}
      onSort={onSort}
      actionsWidthClassName="w-[100px]"
      isLoading={isLoading}
      isError={isError}
      rowCount={pageRows.length}
      entityLabelPlural="load groups"
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
    >
      {pageRows.map((group) => {
        const isSelected = selectedGroupId === group.id;
        return (
          <tr
            key={group.id}
            className={`border-b border-[#e5e7eb] transition-colors last:border-b-0 ${
              isSelected ? 'bg-[#eef9ff] shadow-[inset_2px_0_0_#006496]' : 'hover:bg-[#f9fafb]'
            }`}
          >
            <td className="px-3 py-3 text-[#0a0a0a]">{group.lastUpdated}</td>
            <td className="px-3 py-3 font-medium text-[#0a0a0a]">{group.name}</td>
            <td className="px-3 py-3 text-[#6b7280]">{group.user}</td>
            <td className="px-3 py-3 text-[#6b7280]">{group.description}</td>
            <td className="px-3 py-3">
              <SelectButton selected={isSelected} onClick={() => onSelectGroup(group.id)} />
            </td>
          </tr>
        );
      })}
    </PickerListCard>
  );
}
