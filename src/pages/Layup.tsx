import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Download, Pencil, Search, Trash2 } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { Pagination } from '@/components/common/list/Pagination';
import { ListTableHead, type ListTableHeadColumn } from '@/components/common/list/ListTableHead';
import { RowIconButton } from '@/components/common/list/RowIconButton';
import { matchesQuery, paginate, rowInteractionProps, sortItems, toggleSort } from '@/lib/listTable';
import type { SortState, LayupSortKey } from '@/types';
import { Input } from '@/components/ui/input';
import { LAYUPS } from '@/data/layups';

const PAGE_SIZE = 10;

export function Layup() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState<LayupSortKey>>({ key: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => LAYUPS.filter((l) => matchesQuery(query, [l.name, l.description])),
    [query]
  );

  const sorted = useMemo(() => sortItems(filtered, sort, (l, key) => l[key]), [filtered, sort]);

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

  function handleSort(key: LayupSortKey) {
    setSort((prev) => toggleSort(prev, key));
  }

  const COLUMNS: ListTableHeadColumn<LayupSortKey>[] = [
    { label: 'Name', sortKey: 'name', className: 'w-[240px]' },
    { label: 'Description' },
    { label: 'Last updated', sortKey: 'lastUpdated', className: 'w-[200px]' },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            {/* Header */}
            <div className="flex h-9 items-center justify-between">
              <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Layups</h2>
              <Link
                to="/layup/new"
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
              >
                New layup
              </Link>
            </div>

            {/* Search */}
            <div className="mt-4 max-w-[384px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search for a layup"
                  className="h-9 rounded-md border-[#e2e8f0] pl-9 text-[14px]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <ListTableHead columns={COLUMNS} sort={sort} onSort={handleSort} />
                <tbody>
                  {pageRows.map((l) => (
                    <tr
                      key={l.id}
                      {...rowInteractionProps(() => navigate(`/layup/${l.id}`))}
                      className="group cursor-pointer border-b border-[#e5e7eb] bg-white hover:bg-[#f9fafb]"
                    >
                      <td className="px-3 py-4 text-[14px] font-medium leading-5 text-[#0a0a0a]">
                        {l.name}
                      </td>
                      <td className="px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
                        {l.description}
                      </td>
                      <td className="px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
                        {l.lastUpdated}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <RowIconButton
                            label="Edit layup"
                            icon={Pencil}
                            onClick={() => navigate(`/layup/${l.id}`)}
                          />
                          <RowIconButton label="Export layup" icon={Download} onClick={() => {}} />
                          <RowIconButton label="Duplicate layup" icon={Copy} onClick={() => {}} />
                          <RowIconButton label="Delete layup" icon={Trash2} onClick={() => {}} variant="danger" />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
                        No layups match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
