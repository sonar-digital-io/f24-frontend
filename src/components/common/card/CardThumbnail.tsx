import type { ReactNode } from 'react';
import { BladeThumbnail } from '@/components/common/card/BladeThumbnail';

interface CardThumbnailProps {
  children?: ReactNode;
}

/** Grid-card thumbnail slot (blade preview on a light backdrop) used by GeometryCard. */
export function CardThumbnail({ children }: CardThumbnailProps) {
  return (
    <div className="flex h-[160px] items-center justify-center px-[10px] py-[10px]">
      <div className="flex h-full w-full items-center justify-center rounded-md bg-[#f8fafc]">
        {children ?? <BladeThumbnail />}
      </div>
    </div>
  );
}
