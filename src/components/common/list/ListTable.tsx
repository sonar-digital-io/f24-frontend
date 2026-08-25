import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ListTableProps {
  children: ReactNode;
  /** Fixed column widths instead of content-driven sizing — Material's wider table needs this. */
  fixedLayout?: boolean;
  /** Forces horizontal scroll below this width instead of letting columns shrink — Material only. */
  minWidth?: number;
}

/** `overflow-x-auto` + `<table>` shell shared by every list page (Composition,
 *  Geometry, Material, Calculation, LoadGroup) — pages only supply the
 *  `<thead>`/`<tbody>` (typically `ListTableHead`/`ListTableBody`) as children. */
export function ListTable({ children, fixedLayout, minWidth }: ListTableProps) {
  return (
    <div className="mt-4 overflow-x-auto rounded-md border border-[#e5e7eb]">
      <table
        className={cn(
          'w-full border-collapse [&_tbody_tr:last-child]:border-b-0',
          fixedLayout && 'table-fixed'
        )}
        style={minWidth ? { minWidth } : undefined}
      >
        {children}
      </table>
    </div>
  );
}
