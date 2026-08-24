import { EntityCard } from '@/components/common/card/EntityCard';
import { formatDateTime } from '@/lib/utils';
import type { Geometry } from '@/data/geometries';

interface GeometryCardProps {
  geometry: Geometry;
  onClick: () => void;
  selected?: boolean;
  showMenu?: boolean;
  hoverActionLabel?: string;
}

/**
 * Geometry grid card used in:
 * - the Geometry list page (grid view)
 * - the CompositionNew "Geometry" sub-tab (picking a base geometry)
 *
 * When `selected` is true the card gets a primary blue ring — the picker
 * variant uses this to show the currently chosen geometry.
 */
export function GeometryCard({ geometry, onClick, selected, showMenu = true, hoverActionLabel }: GeometryCardProps) {
  return (
    <EntityCard
      title={geometry.name}
      onClick={onClick}
      selected={selected}
      showMenu={showMenu}
      geometryId={Number(geometry.id)}
      hoverActionLabel={hoverActionLabel}
      footer={<span className="text-[12px] leading-4 text-[#737373]">{formatDateTime(geometry.lastUpdated)}</span>}
    />
  );
}
