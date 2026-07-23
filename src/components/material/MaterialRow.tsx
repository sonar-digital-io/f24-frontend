import { Copy, Download, Pencil, Trash2 } from 'lucide-react';
import { rowInteractionProps } from '@/lib/listTable';
import { DetailRow } from '@/components/common/list/DetailRow';
import { RowIconButton } from '@/components/common/list/RowIconButton';
import { ExpandToggleCell } from '@/components/common/list/ExpandToggleCell';
import { type Material as MaterialItem, type MaterialDetails } from '@/data/materials';

function MaterialDetailGrid({ details }: { details: MaterialDetails }) {
  return (
    <div className="flex flex-col">
      <DetailRow labelWidthClassName="w-[110px]" label="Reinforcement" value={details.reinforcement} />
      <DetailRow labelWidthClassName="w-[110px]" label="Matrix" value={details.matrix} />
      <DetailRow labelWidthClassName="w-[110px]" label="Modulus (tensile)" value={details.modulusTensile} />
      <DetailRow labelWidthClassName="w-[110px]" label="Density" value={details.density} />
      <DetailRow
        labelWidthClassName="w-[110px]"
        label="TDS Ref.:"
        value={
          <a
            href="#"
            className="text-[14px] font-semibold leading-5 text-[#007dbb] underline-offset-2 hover:underline"
          >
            {details.tdsRef}
          </a>
        }
      />
    </div>
  );
}

export interface MaterialRowProps {
  material: MaterialItem;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

export function MaterialRow({ material, expanded, onToggle, onOpen }: MaterialRowProps) {
  const isOwn = material.source === 'own';

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
        <td className="w-[110px] px-3 py-4 align-top">
          {material.source === 'library' ? (
            <span className="inline-flex items-center rounded-full bg-[#dbeafe] px-2 py-0.5 text-[12px] font-medium leading-none text-[#1d4ed8]">
              Library
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-[#dcfce7] px-2 py-0.5 text-[12px] font-medium leading-none text-[#15803d]">
              Own
            </span>
          )}
        </td>
        <td className="px-3 py-4 align-top text-[14px] leading-5 text-[#0a0a0a]">
          {material.description}
        </td>
        <td className="w-[160px] px-3 py-4 align-top text-[14px] leading-5 text-[#0a0a0a]">
          {material.lastUpdated}
        </td>
        <td className="w-[208px] px-3 py-4 align-top">
          <div
            className={`flex items-center justify-end gap-1 transition-opacity ${
              expanded ? 'opacity-100' : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100'
            }`}
          >
            {isOwn && <RowIconButton label="Edit material" icon={Pencil} onClick={onOpen} />}
            <RowIconButton label="Export material" icon={Download} onClick={() => {}} />
            <RowIconButton label="Duplicate material" icon={Copy} onClick={() => {}} />
            {isOwn && (
              <RowIconButton label="Delete material" icon={Trash2} onClick={() => {}} variant="danger" />
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr
          id={`material-detail-${material.id}`}
          className="border-b border-[#e5e7eb] bg-white"
        >
          <td className="w-[52px]" />
          <td colSpan={6} className="px-3 pb-5 pt-1">
            <MaterialDetailGrid details={material.details} />
          </td>
        </tr>
      )}
    </>
  );
}
