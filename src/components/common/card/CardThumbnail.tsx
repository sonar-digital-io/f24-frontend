import { BladeThumbnail } from '@/components/common/card/BladeThumbnail';

/** Grid-card thumbnail slot (blade preview on a light backdrop) shared by GeometryCard/CompositionCard. */
export function CardThumbnail() {
  return (
    <div className="flex h-[160px] items-center justify-center px-[10px] py-[10px]">
      <div className="flex h-full w-full items-center justify-center rounded-md bg-[#f8fafc]">
        <BladeThumbnail />
      </div>
    </div>
  );
}
