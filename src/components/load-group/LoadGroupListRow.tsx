import { useState } from 'react';
import { Copy, Download, Pencil, Trash2 } from 'lucide-react';
import { rowInteractionProps, toggleSetMember } from '@/lib/listTable';
import { formatDateTime } from '@/lib/utils';
import { RowIconButton } from '@/components/common/list/RowIconButton';
import { ExpandToggleCell } from '@/components/common/list/ExpandToggleCell';
import { LoadCasesPreviewList } from '@/components/common/list/LoadCasesPreviewList';
import { useLoadCases } from '@/hooks/api/useLoadGroups';
import { type LoadGroup as LoadGroupItem } from '@/data/loadGroups';

interface LoadGroupListRowProps {
  item: LoadGroupItem;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/** Load group list row — expands into a preview of its load cases (each of
 *  those, in turn, expandable to its own full value grid), so the contents
 *  can be checked without opening the edit page. */
export function LoadGroupListRow({ item, expanded, onToggle, onEdit, onDuplicate, onDelete }: LoadGroupListRowProps) {
  const [expandedCaseIds, setExpandedCaseIds] = useState<Set<number>>(new Set());
  function toggleCase(id: number) {
    setExpandedCaseIds((prev) => toggleSetMember(prev, id));
  }

  // Only fetched once the row is actually expanded.
  const loadCasesQuery = useLoadCases(Number(item.id), expanded);

  return (
    <>
      <tr
        {...rowInteractionProps(onToggle)}
        className={`group cursor-pointer border-b border-[#e5e7eb] transition-colors ${
          expanded ? 'bg-[#f9fafb]' : 'bg-white hover:bg-[#f9fafb]'
        }`}
      >
        <ExpandToggleCell expanded={expanded} onToggle={onToggle} controls={`load-group-detail-${item.id}`} />
        <td className="px-3 py-4 align-top text-[14px] font-medium leading-5 text-[#0a0a0a]">{item.name}</td>
        <td className="px-3 py-4 align-top text-[14px] leading-5 text-[#6b7280]">{item.description}</td>
        <td className="w-[160px] px-3 py-4 align-top text-[14px] leading-5 text-[#0a0a0a]">
          {formatDateTime(item.lastUpdated)}
        </td>
        <td className="px-3 py-4 align-top">
          <div
            className={`flex items-center justify-end gap-1 transition-opacity ${
              expanded ? 'opacity-100' : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100'
            }`}
          >
            <RowIconButton label="Edit load group" icon={Pencil} onClick={onEdit} />
            <RowIconButton label="Export load group" icon={Download} onClick={() => {}} />
            <RowIconButton label="Duplicate load group" icon={Copy} onClick={onDuplicate} />
            <RowIconButton label="Delete load group" icon={Trash2} onClick={onDelete} variant="danger" />
          </div>
        </td>
      </tr>
      {expanded && (
        <tr id={`load-group-detail-${item.id}`} className="border-b border-[#e5e7eb] bg-white">
          <td className="w-[52px]" />
          <td colSpan={4} className="px-3 pb-5 pt-1">
            <LoadCasesPreviewList
              loadCases={loadCasesQuery.data?.load_cases ?? []}
              isLoading={loadCasesQuery.isLoading}
              isError={loadCasesQuery.isError}
              expandedCaseIds={expandedCaseIds}
              onToggleCase={toggleCase}
            />
          </td>
        </tr>
      )}
    </>
  );
}
