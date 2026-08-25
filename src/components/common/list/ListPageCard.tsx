import type { ReactNode } from 'react';
import { ListPageHeader } from '@/components/common/list/ListPageHeader';
import { ListSearchInput } from '@/components/common/list/ListSearchInput';
import { Pagination } from '@/components/common/list/Pagination';

interface ListPageCardProps {
  title: string;
  headerActions: ReactNode;
  search: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    widthClassName?: string;
  };
  /** Filter chips/buttons rendered inline after the search box. */
  filters?: ReactNode;
  /** Right-aligned control on the search row, e.g. Geometry's list/grid toggle. */
  trailing?: ReactNode;
  /** The table (or, for Geometry's grid view, the card grid) goes here. */
  children: ReactNode;
  pagination: {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
  };
}

/** Card shell shared by every list page (Material, Geometry, Composition,
 *  LoadGroup, Calculation): title + header actions, a search row with room
 *  for page-specific filters, the table/grid content, and pagination. */
export function ListPageCard({
  title,
  headerActions,
  search,
  filters,
  trailing,
  children,
  pagination,
}: ListPageCardProps) {
  return (
    <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <ListPageHeader title={title} actions={headerActions} />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <ListSearchInput
            value={search.value}
            onChange={search.onChange}
            placeholder={search.placeholder}
            widthClassName={search.widthClassName}
          />
          {filters}
        </div>
        {trailing}
      </div>

      {children}

      <div className="mt-4">
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={pagination.onChange} />
      </div>
    </div>
  );
}
