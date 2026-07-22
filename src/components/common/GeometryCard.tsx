import { BladeThumbnail } from '@/components/common/BladeThumbnail';
import { CardMenu } from '@/components/common/CardMenu';
import type { Geometry } from '@/data/geometries';

interface GeometryCardProps {
  geometry: Geometry;
  onClick: () => void;
  selected?: boolean;
  showMenu?: boolean;
}

/**
 * Geometry grid card used in:
 * - the Geometry list page (grid view)
 * - the CompositionNew "Geometry" sub-tab (picking a base geometry)
 *
 * When `selected` is true the card gets a primary blue ring — the picker
 * variant uses this to show the currently chosen geometry.
 */
export function GeometryCard({ geometry, onClick, selected, showMenu = true }: GeometryCardProps) {
  return (
    <div
      className={`flex flex-col rounded-[10px] border bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#f9fafb] ${
        selected ? 'border-[#006496] ring-2 ring-[#006496]/30' : 'border-[#e5e7eb]'
      }`}
    >
      <div className="flex items-center justify-between gap-1 px-[10px] pt-[10px]">
        <button
          type="button"
          onClick={onClick}
          aria-pressed={selected ?? undefined}
          className="min-w-0 flex-1 text-left"
        >
          <h3 className="truncate text-[14px] font-semibold leading-5 text-[#0a0a0a]">{geometry.name}</h3>
        </button>
        {showMenu && <CardMenu onEdit={onClick} />}
      </div>
      <button type="button" onClick={onClick} className="text-left">
        <div className="flex h-[160px] items-center justify-center px-[10px] py-[10px]">
          <div className="flex h-full w-full items-center justify-center rounded-md bg-[#f8fafc]">
            <BladeThumbnail />
          </div>
        </div>
        <div className="flex flex-col gap-[10px] px-[10px] pb-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] leading-4 text-[#0a0a0a]">{geometry.type}</span>
            <span className="text-[12px] leading-4 text-[#0a0a0a]">{geometry.nominalRadius} m</span>
          </div>
          <span className="text-[12px] leading-4 text-[#737373]">{geometry.lastUpdated}</span>
        </div>
      </button>
    </div>
  );
}
