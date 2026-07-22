import { ChevronDown, ChevronUp, Copy, Download, Pencil, Trash2 } from 'lucide-react';
import { rowInteractionProps } from '@/lib/listTable';
import { type Material as MaterialItem, type MaterialDetails } from '@/data/materials';

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group/tip relative">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[11px] leading-none text-white opacity-0 shadow-sm transition-opacity group-hover/tip:opacity-100">
        {label}
      </span>
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-center gap-4 py-[5px]">
      <span className="w-[110px] shrink-0 text-[14px] leading-5 text-[#6b7280]">{label}</span>
      <span className="text-[14px] font-semibold leading-5 text-[#0a0a0a]">{value}</span>
    </div>
  );
}

function MaterialDetailGrid({ details }: { details: MaterialDetails }) {
  return (
    <div className="flex flex-col">
      <DetailRow label="Reinforcement" value={details.reinforcement} />
      <DetailRow label="Matrix" value={details.matrix} />
      <DetailRow label="Modulus (tensile)" value={details.modulusTensile} />
      <DetailRow label="Density" value={details.density} />
      <DetailRow
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
        <td className="w-[52px] px-3 py-4 align-top">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-expanded={expanded}
            aria-controls={`material-detail-${material.id}`}
            className="flex h-7 w-7 items-center justify-center rounded text-[#0a0a0a] hover:bg-[#e5e7eb]"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" strokeWidth={2} />
            ) : (
              <ChevronDown className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </td>
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
            {isOwn && (
              <Tip label="Edit">
                <button
                  type="button"
                  aria-label="Edit material"
                  onClick={(e) => { e.stopPropagation(); onOpen(); }}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
                >
                  <Pencil className="h-4 w-4" strokeWidth={2} />
                </button>
              </Tip>
            )}
            <Tip label="Export">
              <button
                type="button"
                aria-label="Export material"
                onClick={(e) => e.stopPropagation()}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
              >
                <Download className="h-4 w-4" strokeWidth={2} />
              </button>
            </Tip>
            <Tip label="Duplicate">
              <button
                type="button"
                aria-label="Duplicate material"
                onClick={(e) => e.stopPropagation()}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
              >
                <Copy className="h-4 w-4" strokeWidth={2} />
              </button>
            </Tip>
            {isOwn && (
              <Tip label="Delete">
                <button
                  type="button"
                  aria-label="Delete material"
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#fee2e2] hover:text-[#dc2626]"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              </Tip>
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
