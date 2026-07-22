import { BladeThumbnail } from '@/components/common/card/BladeThumbnail';
import { CardMenu } from '@/components/common/card/CardMenu';
import type { Composition } from '@/data/compositions';

interface CompositionCardProps {
  composition: Composition;
  onClick: () => void;
}

export function CompositionCard({ composition, onClick }: CompositionCardProps) {
  return (
    <div className="flex flex-col rounded-[10px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#f9fafb]">
      <div className="flex items-center justify-between gap-1 px-[10px] pt-[10px]">
        <button type="button" onClick={onClick} className="min-w-0 flex-1 text-left">
          <h3 className="truncate text-[14px] font-semibold leading-5 text-[#0a0a0a]">{composition.name}</h3>
        </button>
        <CardMenu onEdit={onClick} />
      </div>
      <button type="button" onClick={onClick} className="text-left">
        <div className="flex h-[160px] items-center justify-center px-[10px] py-[10px]">
          <div className="flex h-full w-full items-center justify-center rounded-md bg-[#f8fafc]">
            <BladeThumbnail />
          </div>
        </div>
        <div className="flex flex-col gap-[10px] px-[10px] pb-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] leading-4 text-[#0a0a0a]">{composition.type}</span>
            <span className="text-[12px] leading-4 text-[#0a0a0a]">{composition.nominalRadius} m</span>
          </div>
          <div className="group/desc relative">
            <p className="line-clamp-2 text-[12px] leading-4 text-[#737373]">
              {composition.description}
            </p>
            <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 w-[220px] rounded bg-[#0a0a0a] px-2 py-1.5 text-[11px] leading-[1.4] text-white opacity-0 shadow-sm transition-opacity group-hover/desc:opacity-100">
              {composition.description}
            </span>
          </div>
          <span className="text-[12px] leading-4 text-[#737373]">{composition.lastUpdated}</span>
        </div>
      </button>
    </div>
  );
}
