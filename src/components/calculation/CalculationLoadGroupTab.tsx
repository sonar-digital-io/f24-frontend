import { Fragment, type RefObject } from 'react';
import { ArrowDown, ArrowUpDown, ChevronDown, ChevronUp, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/common/ListTable';
import type { FatigueLoadGroup } from '@/data/calculationFatigueLoadGroups';
import type { LGSort, LGSortKey } from '@/types';

interface LGSortableHeaderProps {
  label: string;
  sortKey: LGSortKey;
  currentSort: LGSort;
  onClick: (key: LGSortKey) => void;
}

function LGSortableHeader({ label, sortKey, currentSort, onClick }: LGSortableHeaderProps) {
  const isActive = currentSort.key === sortKey;
  const Icon = !isActive ? ArrowUpDown : currentSort.dir === 'desc' ? ArrowDown : ChevronUp;
  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className="inline-flex items-center gap-1 text-[14px] font-medium leading-5 text-[#6b7280] hover:text-[#0a0a0a]"
    >
      {label}
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

interface CalculationLoadGroupTabProps {
  lgSearch: string;
  onSearchChange: (value: string) => void;
  lgSort: LGSort;
  onSort: (key: LGSortKey) => void;
  lgCreatedByFilter: Set<string>;
  lgCreatedByBtnRef: RefObject<HTMLButtonElement>;
  onOpenCreatedByFilter: () => void;
  lgExpandedIds: Set<string>;
  onToggleExpanded: (id: string) => void;
  selectedGroupId: string | null;
  onSelectGroup: (id: string) => void;
  lgPageRows: FatigueLoadGroup[];
  lgPage: number;
  lgTotalPages: number;
  onPageChange: (page: number) => void;
}

export function CalculationLoadGroupTab({
  lgSearch,
  onSearchChange,
  lgSort,
  onSort,
  lgCreatedByFilter,
  lgCreatedByBtnRef,
  onOpenCreatedByFilter,
  lgExpandedIds,
  onToggleExpanded,
  selectedGroupId,
  onSelectGroup,
  lgPageRows,
  lgPage,
  lgTotalPages,
  onPageChange,
}: CalculationLoadGroupTabProps) {
  return (
    <div className="w-full">
      {/* Table card */}
      <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        {/* Search row */}
        <div className="border-b border-[#e5e7eb] px-6 py-3">
          <div className="relative max-w-[340px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
            <Input
              value={lgSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search load groups"
              className="h-9 rounded-md border-[#e2e8f0] pl-8 text-[14px]"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                <th className="h-10 w-[52px]" />
                <th className="h-10 w-[200px] px-3 text-left">
                  <LGSortableHeader label="Name" sortKey="name" currentSort={lgSort} onClick={onSort} />
                </th>
                <th className="h-10 px-3 text-left">
                  <span className="text-[14px] font-medium leading-5 text-[#6b7280]">Description</span>
                </th>
                <th className="h-10 w-[160px] px-3 text-left">
                  <LGSortableHeader label="Last updated" sortKey="lastUpdated" currentSort={lgSort} onClick={onSort} />
                </th>
                <th className="h-10 w-[180px] px-3 text-left">
                  <div className="flex items-center gap-1">
                    <LGSortableHeader label="Created by" sortKey="createdBy" currentSort={lgSort} onClick={onSort} />
                    <button
                      ref={lgCreatedByBtnRef}
                      type="button"
                      onClick={onOpenCreatedByFilter}
                      className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#f1f5f9] ${lgCreatedByFilter.size > 0 ? 'text-[#006496]' : 'text-[#6b7280]'}`}
                    >
                      <Filter className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {lgPageRows.map((group) => {
                const isExpanded = lgExpandedIds.has(group.id);
                const isSelected = selectedGroupId === group.id;
                return (
                  <Fragment key={group.id}>
                    <tr
                      onClick={() => onSelectGroup(group.id)}
                      className={`cursor-pointer border-b border-[#e5e7eb] transition-colors ${
                        isSelected
                          ? 'bg-[#eef9ff] shadow-[inset_2px_0_0_#006496]'
                          : isExpanded
                          ? 'bg-[#f9fafb]'
                          : 'hover:bg-[#f9fafb]'
                      }`}
                    >
                      <td className="w-[52px] px-3 py-4 align-top">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onToggleExpanded(group.id); }}
                          aria-expanded={isExpanded}
                          className="flex h-7 w-7 items-center justify-center rounded text-[#0a0a0a] hover:bg-[#e5e7eb]"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" strokeWidth={2} />
                          ) : (
                            <ChevronDown className="h-4 w-4" strokeWidth={2} />
                          )}
                        </button>
                      </td>
                      <td className="w-[200px] px-3 py-4 align-top text-[14px] font-medium leading-5 text-[#0a0a0a]">
                        {group.name}
                      </td>
                      <td className="px-3 py-4 align-top text-[14px] leading-5 text-[#6b7280]">
                        {group.description}
                      </td>
                      <td className="w-[160px] px-3 py-4 align-top text-[14px] leading-5 text-[#0a0a0a]">
                        {group.lastUpdated}
                      </td>
                      <td className="w-[180px] px-3 py-4 align-top text-[14px] leading-5 text-[#6b7280]">
                        {group.createdBy}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${group.id}-expanded`} className="border-b border-[#e5e7eb]">
                        <td colSpan={5} className={`p-0 ${isSelected ? 'bg-[#f5fbff] shadow-[inset_2px_0_0_#006496]' : 'bg-white'}`}>
                          {[...group.profiles].sort().map((p) => (
                            <div key={p} className="px-[68px] py-2.5">
                              <span className="text-[14px] text-[#0a0a0a]">{p}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {lgPageRows.length === 0 && (
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

      {/* Pagination */}
      <div className="mt-4">
        <Pagination page={lgPage} totalPages={lgTotalPages} onChange={onPageChange} />
      </div>
    </div>
  );
}
