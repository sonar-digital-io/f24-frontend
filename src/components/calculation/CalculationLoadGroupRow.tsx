import { Fragment } from 'react';
import { SelectButton } from '@/components/common/list/SelectButton';
import { ExpandToggleCell } from '@/components/common/list/ExpandToggleCell';
import { LoadCasesPreviewList } from '@/components/common/list/LoadCasesPreviewList';
import { useLoadCases } from '@/hooks/api/useLoadGroups';
import type { LoadGroupListItem } from '@/components/calculation/CalculationLoadGroupTab';

interface CalculationLoadGroupRowProps {
  group: LoadGroupListItem;
  isSelected: boolean;
  onSelectGroup: (id: number) => void;
  isExpanded: boolean;
  onTogglePreview: (id: number) => void;
  expandedCaseIds: Set<number>;
  onToggleCasePreview: (id: number) => void;
}

/** One Load group row in the picker table, with an expandable preview of its
 *  load cases (each of those, in turn, expandable to its own full value grid)
 *  so the contents can be checked before committing to a selection. */
export function CalculationLoadGroupRow({
  group,
  isSelected,
  onSelectGroup,
  isExpanded,
  onTogglePreview,
  expandedCaseIds,
  onToggleCasePreview,
}: CalculationLoadGroupRowProps) {
  // Only fetched once the row is actually expanded — previewing a group's
  // contents shouldn't fire a request for every row in the list up front.
  const loadCasesQuery = useLoadCases(group.id, isExpanded);

  return (
    <Fragment>
      <tr
        className={`border-b border-[#e5e7eb] transition-colors ${
          isSelected ? 'bg-[#eef9ff] shadow-[inset_2px_0_0_#006496]' : isExpanded ? 'bg-[#f9fafb]' : 'hover:bg-[#f9fafb]'
        }`}
      >
        <ExpandToggleCell
          expanded={isExpanded}
          onToggle={() => onTogglePreview(group.id)}
          controls={`load-group-preview-${group.id}`}
        />
        <td className="px-3 py-3 text-[#0a0a0a]">{group.lastUpdated}</td>
        <td className="px-3 py-3 font-medium text-[#0a0a0a]">{group.name}</td>
        <td className="px-3 py-3 text-[#6b7280]">{group.user}</td>
        <td className="px-3 py-3 text-[#6b7280]">{group.description}</td>
        <td className="px-3 py-3">
          <SelectButton selected={isSelected} onClick={() => onSelectGroup(group.id)} />
        </td>
      </tr>
      {isExpanded && (
        <tr id={`load-group-preview-${group.id}`} className="border-b border-[#e5e7eb]">
          <td colSpan={6} className={`p-0 ${isSelected ? 'bg-[#f5fbff] shadow-[inset_2px_0_0_#006496]' : 'bg-white'}`}>
            <div className="px-[52px] py-3">
              <LoadCasesPreviewList
                loadCases={loadCasesQuery.data?.load_cases ?? []}
                isLoading={loadCasesQuery.isLoading}
                isError={loadCasesQuery.isError}
                expandedCaseIds={expandedCaseIds}
                onToggleCase={onToggleCasePreview}
              />
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
