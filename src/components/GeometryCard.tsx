import { BladeThumbnail } from '@/components/BladeThumbnail';
import type { Geometry } from '@/data/geometries';

interface GeometryCardProps {
  geometry: Geometry;
  onClick: () => void;
  selected?: boolean;
}

/**
 * Geometry grid card used in:
 * - the Geometry list page (grid view)
 * - the CompositionNew "Geometry" sub-tab (picking a base geometry)
 *
 * When `selected` is true the card gets a primary blue ring — the picker
 * variant uses this to show the currently chosen geometry.
 */
export function GeometryCard({ geometry, onClick, selected }: GeometryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected ?? undefined}
      className={`flex flex-col gap-3 rounded-[14px] border bg-white p-4 text-left shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#f9fafb] ${
        selected ? 'border-[#006496] ring-2 ring-[#006496]/30' : 'border-[#e5e7eb]'
      }`}
    >
      <h3 className="text-[14px] font-semibold leading-5 text-[#0a0a0a]">{geometry.name}</h3>
      <div className="aspect-[2/1] w-full overflow-hidden rounded-md bg-[#f8fafc]">
        <BladeThumbnail />
      </div>
      <span className="text-[14px] leading-5 text-[#6b7280]">{geometry.lastUpdated}</span>
    </button>
  );
}
