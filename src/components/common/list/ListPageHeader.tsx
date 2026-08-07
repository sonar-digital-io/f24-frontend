import type { ReactNode } from 'react';

interface ListPageHeaderProps {
  title: string;
  actions: ReactNode;
}

/** Title + trailing action buttons row shared by every list page (Material,
 *  Geometry, Layup, Composition, LoadGroup, Calculation). */
export function ListPageHeader({ title, actions }: ListPageHeaderProps) {
  return (
    <div className="flex h-9 items-center justify-between">
      <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">{title}</h2>
      {actions}
    </div>
  );
}
