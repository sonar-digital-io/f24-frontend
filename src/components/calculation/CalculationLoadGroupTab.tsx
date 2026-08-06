import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/common/list/Pagination';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
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
          <div className="relative max-w-[340px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search load groups"
              className="h-9 rounded-md border-[#e2e8f0] pl-8 text-[14px]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <ListTableHead columns={COLUMNS} sort={sort} onSort={onSort} actionsWidthClassName="w-[100px]" />
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-[14px] text-[#6b7280]">
                    Loading load groups…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-[14px] text-[#dc2626]">
                    Failed to load load groups from the server.
                  </td>
                </tr>
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
                        <button
                          type="button"
                          onClick={() => onSelectGroup(group.id)}
                          className={`inline-flex h-8 items-center justify-center rounded-md px-3 text-[13px] font-medium transition-colors ${
                            isSelected
                              ? 'border border-[#006496] bg-[#eef9ff] text-[#006496]'
                              : 'bg-[#006496] text-[#fafafa] hover:bg-[#005580]'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              {!isLoading && !isError && pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[14px] text-[#6b7280]">
                    No load groups match your search.
                  </td>
                </tr>
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
