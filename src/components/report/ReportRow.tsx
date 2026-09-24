import { Download, Trash2 } from 'lucide-react';
import { RowIconButton } from '@/components/common/list/RowIconButton';
import { formatDateTime } from '@/lib/utils';
import type { ReportListItem, ReportResult } from '@/api/types/reports';

const RESULT_STYLES: Record<ReportResult, string> = {
  Success: 'bg-[#dcfce7] text-[#166534]',
  Pending: 'bg-[#dbeafe] text-[#1e40af]',
  Error: 'bg-[#fee2e2] text-[#991b1b]',
  Timeout: 'bg-[#fef9c3] text-[#854d0e]',
};

interface ReportRowProps {
  item: ReportListItem;
  onExport: () => void;
  onDelete: () => void;
}

export function ReportRow({ item, onExport, onDelete }: ReportRowProps) {
  return (
    <tr className="group border-b border-[#e5e7eb] bg-white transition-colors hover:bg-[#f9fafb]">
      <td className="w-[100px] px-3 py-4 align-top text-[14px] leading-5 text-[#6b7280]">
        #{item.id}
      </td>
      <td className="px-3 py-4 align-top text-[14px] font-medium leading-5 text-[#0a0a0a]">
        {item.project ?? <span className="font-normal italic text-[#6b7280]">Deleted project</span>}
      </td>
      <td className="w-[180px] px-3 py-4 align-top">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${RESULT_STYLES[item.result]}`}
        >
          {item.result}
        </span>
      </td>
      <td className="w-[200px] px-3 py-4 align-top text-[14px] leading-5 text-[#6b7280]">
        {formatDateTime(item.created_at)}
      </td>
      <td className="px-3 py-4 align-top">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <RowIconButton
            label="Export"
            icon={Download}
            onClick={onExport}
            disabled={item.result !== 'Success'}
          />
          <RowIconButton label="Delete" icon={Trash2} onClick={onDelete} variant="danger" />
        </div>
      </td>
    </tr>
  );
}
