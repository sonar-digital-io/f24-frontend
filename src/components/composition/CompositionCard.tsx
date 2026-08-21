import { EntityCard } from '@/components/common/card/EntityCard';
import type { Composition } from '@/data/compositions';

interface CompositionCardProps {
  composition: Composition;
  onClick: () => void;
  selected?: boolean;
  showMenu?: boolean;
}

export function CompositionCard({ composition, onClick, selected, showMenu = true }: CompositionCardProps) {
  return (
    <EntityCard
      title={composition.name}
      onClick={onClick}
      selected={selected}
      showMenu={showMenu}
      geometryId={composition.geometryId}
      footer={
        <>
          <div className="group/desc relative">
            <p className="line-clamp-2 text-[12px] leading-4 text-[#737373]">
              {composition.description}
            </p>
            <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 w-[220px] rounded bg-[#0a0a0a] px-2 py-1.5 text-[11px] leading-[1.4] text-white opacity-0 shadow-sm transition-opacity group-hover/desc:opacity-100">
              {composition.description}
            </span>
          </div>
          <span className="text-[12px] leading-4 text-[#737373]">{composition.lastUpdated}</span>
        </>
      }
    />
  );
}
