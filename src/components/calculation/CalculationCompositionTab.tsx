import type { ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { PickerListCard } from '@/components/common/list/PickerListCard';
import { SelectButton } from '@/components/common/list/SelectButton';
import type { SortState, CalcCompositionSortKey } from '@/types';

export interface CompositionListItem {
  id: number;
  name: string;
  description: string;
  type: string;
  targetWeight: string;
  user: string;
  lastUpdated: string;
}

interface CalculationCompositionTabProps {
  isLoading: boolean;
  isError: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortState<CalcCompositionSortKey>;
  onSort: (key: CalcCompositionSortKey) => void;
  pageRows: CompositionListItem[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  selectedCompositionId: number | null;
  onSelectComposition: (id: number) => void;
}

const COLUMNS: ListTableHeadColumn<CalcCompositionSortKey>[] = [
  { label: 'Name', sortKey: 'name', className: 'w-[200px]' },
  { label: 'Description' },
  { label: 'Type', className: 'w-[120px]' },
  { label: 'Target weight', className: 'w-[130px]' },
  { label: 'User', className: 'w-[200px]' },
  { label: 'Last updated', sortKey: 'last_modified', className: 'w-[160px]' },
];

export function CalculationCompositionTab({
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
  selectedCompositionId,
  onSelectComposition,
}: CalculationCompositionTabProps) {
  return (
    <PickerListCard
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search compositions"
      columns={COLUMNS}
      sort={sort}
      onSort={onSort}
      actionsWidthClassName="w-[100px]"
      isLoading={isLoading}
      isError={isError}
      rowCount={pageRows.length}
      entityLabelPlural="compositions"
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
    >
      {pageRows.map((item) => {
        const isSelected = selectedCompositionId === item.id;
        return (
          <tr
            key={item.id}
            className={`border-b border-[#e5e7eb] transition-colors last:border-b-0 ${
              isSelected ? 'bg-[#eef9ff] shadow-[inset_2px_0_0_#006496]' : 'hover:bg-[#f9fafb]'
            }`}
          >
            <td className="px-3 py-3 font-medium text-[#0a0a0a]">{item.name}</td>
            <td className="px-3 py-3 text-[#6b7280]">{item.description}</td>
            <td className="px-3 py-3 text-[#0a0a0a]">{item.type}</td>
            <td className="px-3 py-3 text-[#0a0a0a]">{item.targetWeight}</td>
            <td className="px-3 py-3 text-[#6b7280]">{item.user}</td>
            <td className="px-3 py-3 text-[#0a0a0a]">{item.lastUpdated}</td>
            <td className="px-3 py-3">
              <SelectButton selected={isSelected} onClick={() => onSelectComposition(item.id)} />
            </td>
          </tr>
        );
      })}
    </PickerListCard>
  );
}
