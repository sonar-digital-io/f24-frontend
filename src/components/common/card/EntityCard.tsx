import type { ReactNode } from 'react';
import { CardThumbnail } from '@/components/common/card/CardThumbnail';
import { CardMenu } from '@/components/common/card/CardMenu';
import { GeometryProfileThumbnail } from '@/components/common/card/GeometryProfileThumbnail';

interface EntityCardProps {
  title: string;
  onClick: () => void;
  selected?: boolean;
  showMenu?: boolean;
  /** Linked geometry id, if any — drives the profile-preview thumbnail. */
  geometryId?: number;
  /** Label shown on the thumbnail's hover overlay pill (e.g. "Open", "Select"). */
  hoverActionLabel?: string;
  footer: ReactNode;
}

/**
 * Shared grid card shell for Geometry and Composition list/picker views —
 * name + menu header, geometry profile-preview thumbnail, and a footer slot
 * for entity-specific metadata (description, last-updated, etc).
 */
export function EntityCard({
  title,
  onClick,
  selected,
  showMenu = true,
  geometryId,
  hoverActionLabel = 'Open',
  footer,
}: EntityCardProps) {
  return (
    <div
      className={`group relative flex flex-col rounded-[10px] border bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#f9fafb] ${
        selected ? 'border-[#006496] ring-2 ring-[#006496]/30' : 'border-[#e5e7eb]'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[10px] bg-[#0a0a0a]/10 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
          {hoverActionLabel}
        </span>
      </div>
      <div className="flex items-center justify-between gap-1 px-[10px] pt-[10px]">
        <button
          type="button"
          onClick={onClick}
          aria-pressed={selected ?? undefined}
          className="min-w-0 flex-1 text-left"
        >
          <h3 className="truncate text-[14px] font-semibold leading-5 text-[#0a0a0a]">{title}</h3>
        </button>
        {showMenu && <CardMenu onEdit={onClick} />}
      </div>
      <button type="button" onClick={onClick} className="text-left">
        <CardThumbnail>
          <GeometryProfileThumbnail geometryId={geometryId} />
        </CardThumbnail>
        <div className="flex flex-col gap-[10px] px-[10px] pb-[10px]">{footer}</div>
      </button>
    </div>
  );
}
