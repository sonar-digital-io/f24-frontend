import { Pagination } from '@/components/common/list/Pagination';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { SearchInput } from '@/components/common/list/SearchInput';
import { SelectButton } from '@/components/common/list/SelectButton';
import { TableStatusRow } from '@/components/common/list/TableStatusRow';
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
    <div className="w-full">
      <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        {/* Search row */}
        <div className="border-b border-[#e5e7eb] px-6 py-3">
          <SearchInput value={search} onChange={onSearchChange} placeholder="Search load groups" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <ListTableHead columns={COLUMNS} sort={sort} onSort={onSort} actionsWidthClassName="w-[100px]" />
            <tbody>
              {isLoading && <TableStatusRow colSpan={5}>Loading load groups…</TableStatusRow>}
              {isError && (
                <TableStatusRow colSpan={5} variant="error">
                  Failed to load load groups from the server.
                </TableStatusRow>
              )}
              {!isLoading &&
                !isError &&
                pageRows.map((group) => {
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
              {!isLoading && !isError && pageRows.length === 0 && (
                <TableStatusRow colSpan={5}>No load groups match your search.</TableStatusRow>
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
