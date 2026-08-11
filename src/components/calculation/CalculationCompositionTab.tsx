import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { Pagination } from '@/components/common/list/Pagination';
import { SearchInput } from '@/components/common/list/SearchInput';
import { SelectButton } from '@/components/common/list/SelectButton';
import { TableStatusRow } from '@/components/common/list/TableStatusRow';
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
    <div className="w-full">
      <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        {/* Search row */}
        <div className="border-b border-[#e5e7eb] px-6 py-3">
          <SearchInput value={search} onChange={onSearchChange} placeholder="Search compositions" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <ListTableHead columns={COLUMNS} sort={sort} onSort={onSort} actionsWidthClassName="w-[100px]" />
            <tbody>
              {isLoading && <TableStatusRow colSpan={7}>Loading compositions…</TableStatusRow>}
              {isError && (
                <TableStatusRow colSpan={7} variant="error">
                  Failed to load compositions from the server.
                </TableStatusRow>
              )}
              {!isLoading &&
                !isError &&
                pageRows.map((item) => {
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
              {!isLoading && !isError && pageRows.length === 0 && (
                <TableStatusRow colSpan={7}>No compositions match your search.</TableStatusRow>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
      </div>
    </div>
  );
}
