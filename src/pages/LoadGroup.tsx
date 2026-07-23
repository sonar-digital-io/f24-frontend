import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Download, Pencil, Search, Trash2 } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { Footer } from '@/components/common/layout/Footer';
import { Pagination } from '@/components/common/list/Pagination';
import { SortableHeader } from '@/components/common/list/SortableHeader';
import { RowIconButton } from '@/components/common/list/RowIconButton';
import { paginate, rowInteractionProps, toggleSort } from '@/lib/listTable';
import type { SortState, LoadGroupSortKey } from '@/types';
import { Input } from '@/components/ui/input';
import { LOAD_GROUPS, type LoadGroup as LoadGroupItem } from '@/data/loadGroups';

const PAGE_SIZE = 10;

interface LoadGroupRowProps {
  item: LoadGroupItem;
  onEdit: () => void;
}

function LoadGroupRow({ item, onEdit }: LoadGroupRowProps) {
  return (
    <tr
      {...rowInteractionProps(onEdit)}
      className="group cursor-pointer border-b border-[#e5e7eb] bg-white transition-colors hover:bg-[#f9fafb]"
    >
      <td className="px-3 py-4 text-[14px] font-medium leading-5 text-[#0a0a0a]">{item.name}</td>
      <td className="px-3 py-4 text-[14px] leading-5 text-[#6b7280]">{item.description}</td>
      <td className="w-[160px] px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
        {item.lastUpdated}
      </td>
      <td className="px-3 py-4">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <RowIconButton label="Edit load group" icon={Pencil} onClick={onEdit} />
          <RowIconButton label="Export load group" icon={Download} onClick={() => {}} />
          <RowIconButton label="Duplicate load group" icon={Copy} onClick={() => {}} />
          <RowIconButton label="Delete load group" icon={Trash2} onClick={() => {}} variant="danger" />
        </div>
      </td>
    </tr>
  );
}

export function LoadGroup() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState<LoadGroupSortKey>>({ key: 'lastUpdated', direction: 'desc' });
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LOAD_GROUPS;
    return LOAD_GROUPS.filter(
      (g) => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
    );
  }, [query]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const aVal = a[sort.key].toLowerCase();
      const bVal = b[sort.key].toLowerCase();
      if (aVal === bVal) return 0;
      const cmp = aVal < bVal ? -1 : 1;
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sort]);

  const { totalPages, pageRows } = paginate(sorted, page, PAGE_SIZE);

  function handleSort(key: LoadGroupSortKey) {
    setSort((prev) => toggleSort(prev, key));
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            {/* Header */}
            <div className="flex h-9 items-center justify-between">
              <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Load groups</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[#e2e8f0] bg-white px-4 py-2 text-[14px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#f1f5f9]"
                >
                  Import
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/load-group/new')}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
                >
                  New load group
                </button>
              </div>
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
                  placeholder="Search"
                  className="h-9 rounded-md border-[#e2e8f0] pl-9 text-[14px]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <SortableHeader
                      label="Name"
                      sortKey="name"
                      currentSort={sort}
                      onClick={handleSort}
                      className="w-[260px]"
                    />
                    <th className="h-10 px-3 text-left">
                      <span className="text-[14px] font-medium leading-5 text-[#6b7280]">
                        Description
                      </span>
                    </th>
                    <SortableHeader
                      label="Last updated"
                      sortKey="lastUpdated"
                      currentSort={sort}
                      onClick={handleSort}
                      className="w-[160px]"
                    />
                    <th className="h-10 w-[208px] px-3 text-left" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((item) => (
                    <LoadGroupRow
                      key={item.id}
                      item={item}
                      onEdit={() => navigate(`/load-group/${item.id}`)}
                    />
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-8 text-center text-[14px] text-[#6b7280]"
                      >
                        No load groups match your search.
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
