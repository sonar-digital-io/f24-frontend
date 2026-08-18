import { useState } from 'react';
import { Copy, Download, Pencil, Trash2 } from 'lucide-react';
import { rowInteractionProps } from '@/lib/listTable';
import { formatDateTime } from '@/lib/utils';
import { RowIconButton } from '@/components/common/list/RowIconButton';
import { ExpandToggleCell } from '@/components/common/list/ExpandToggleCell';
import { MaterialPropertyList } from '@/components/material/MaterialPropertyList';
import { useMaterialDetail } from '@/hooks/api/useMaterials';
import { type Material as MaterialItem } from '@/data/materials';
import type { KeyValuePair } from '@/api/types/common';

function nonEmpty(list?: KeyValuePair[]): KeyValuePair[] {
  return (list ?? []).filter((kv) => kv.value != null && String(kv.value).trim() !== '');
}

interface MaterialDetailPanelProps {
  materialId: number;
  mechanicalOpen: boolean;
  onToggleMechanical: () => void;
  fatigueOpen: boolean;
  onToggleFatigue: () => void;
}

// Only ever rendered inside `{expanded && (...)}` below, so it only exists while
// expanded is true — no need to thread that through as a query enabled/disabled flag.
function MaterialDetailPanel({
  materialId,
  mechanicalOpen,
  onToggleMechanical,
  fatigueOpen,
  onToggleFatigue,
}: MaterialDetailPanelProps) {
  const { data, isLoading, isError } = useMaterialDetail(materialId);

  if (isLoading) return <p className="px-1 py-2 text-[14px] text-[#6b7280]">Loading properties…</p>;
  if (isError) {
    return <p className="px-1 py-2 text-[14px] text-[#dc2626]">Failed to load material properties.</p>;
  }
  return (
    <MaterialPropertyList
      mechanicalProperties={nonEmpty(data?.mechanical_properties)}
      fatigueProperties={nonEmpty(data?.fatigue_properties)}
      mechanicalOpen={mechanicalOpen}
      onToggleMechanical={onToggleMechanical}
      fatigueOpen={fatigueOpen}
      onToggleFatigue={onToggleFatigue}
    />
  );
}

export interface MaterialRowProps {
  material: MaterialItem;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onExport: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function MaterialRow({
  material,
  expanded,
  onToggle,
  onOpen,
  onExport,
  onDuplicate,
  onDelete,
}: MaterialRowProps) {
  const [mechanicalOpen, setMechanicalOpen] = useState(true);
  const [fatigueOpen, setFatigueOpen] = useState(true);

  return (
    <>
      <tr
        {...rowInteractionProps(onToggle)}
        className={`group cursor-pointer border-b border-[#e5e7eb] transition-colors ${
          expanded ? 'bg-[#f9fafb]' : 'bg-white hover:bg-[#f9fafb]'
        }`}
      >
        <ExpandToggleCell expanded={expanded} onToggle={onToggle} controls={`material-detail-${material.id}`} />
        <td className="w-[240px] px-3 py-4 align-top text-[14px] font-medium leading-5 text-[#0a0a0a]">
          {material.name}
        </td>
        <td className="w-[240px] px-3 py-4 align-top text-[14px] leading-5 text-[#0a0a0a]">
          {material.type}
        </td>
        <td className="px-3 py-4 align-top text-[14px] leading-5 text-[#0a0a0a]">
          {material.description}
        </td>
        <td className="w-[160px] px-3 py-4 align-top text-[14px] leading-5 text-[#0a0a0a]">
          {formatDateTime(material.lastUpdated)}
        </td>
        <td className="w-[208px] px-3 py-4 align-top">
          <div
            className={`flex items-center justify-end gap-1 transition-opacity ${
              expanded ? 'opacity-100' : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100'
            }`}
          >
            <RowIconButton label="Edit material" icon={Pencil} onClick={onOpen} />
            <RowIconButton label="Export material" icon={Download} onClick={onExport} />
            <RowIconButton label="Duplicate material" icon={Copy} onClick={onDuplicate} />
            <RowIconButton label="Delete material" icon={Trash2} onClick={onDelete} variant="danger" />
          </div>
        </td>
      </tr>
      {expanded && (
        <tr id={`material-detail-${material.id}`} className="border-b border-[#e5e7eb] bg-white">
          <td className="w-[52px]" />
          <td colSpan={5} className="px-3 pb-5 pt-1">
            <MaterialDetailPanel
              materialId={Number(material.id)}
              mechanicalOpen={mechanicalOpen}
              onToggleMechanical={() => setMechanicalOpen((o) => !o)}
              fatigueOpen={fatigueOpen}
              onToggleFatigue={() => setFatigueOpen((o) => !o)}
            />
          </td>
        </tr>
      )}
    </>
  );
}
