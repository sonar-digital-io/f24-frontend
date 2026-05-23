import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import { MainNav } from '@/components/MainNav';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { BladeThumbnail } from '@/components/BladeThumbnail';
import { NewGeometryModal, NewGeometryPayload } from '@/components/NewGeometryModal';
import { GEOMETRIES, type Geometry as GeometryItem } from '@/data/geometries';

const PAGE_SIZE = 10;
type ViewMode = 'list' | 'grid';
type SortKey = 'name' | 'lastUpdated';
type SortDirection = 'asc' | 'desc';
interface SortState {
  key: SortKey;
  direction: SortDirection;
}

interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  currentSort: SortState;
  onClick: (key: SortKey) => void;
}

function SortableHeader({ label, sortKey, currentSort, onClick }: SortableHeaderProps) {
  const isActive = currentSort.key === sortKey;
  const Icon = !isActive ? ArrowUpDown : currentSort.direction === 'desc' ? ArrowDown : ChevronUp;
  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className="inline-flex items-center gap-1 text-[14px] font-medium leading-5 text-[#6b7280] hover:text-[#0a0a0a]"
    >
      {label}
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const pageNumbers = useMemo(() => {
    if (totalPages <= 4) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const visible: (number | 'ellipsis')[] = [1, 2, 3];
    if (totalPages > 4) visible.push('ellipsis');
    return visible;
  }, [totalPages]);

  return (
    <nav aria-label="Pagination" className="flex h-9 items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-[14px] font-medium text-[#0a0a0a] hover:bg-[#f1f5f9] disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Previous
      </button>
      {pageNumbers.map((p, idx) =>
        p === 'ellipsis' ? (
          <span
            key={`ellipsis-${idx}`}
            className="flex h-9 w-9 items-center justify-center text-[#6b7280]"
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`flex h-9 w-9 items-center justify-center rounded-md text-[14px] font-medium ${
              p === page
                ? 'border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]'
                : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-[14px] font-medium text-[#0a0a0a] hover:bg-[#f1f5f9] disabled:opacity-50"
      >
        Next
        <ChevronRight className="h-4 w-4" strokeWidth={2} />
      </button>
    </nav>
  );
}

function GeometryCard({ geometry, onClick }: { geometry: GeometryItem; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white p-4 text-left shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#f9fafb]"
    >
      <h3 className="text-[14px] font-semibold leading-5 text-[#0a0a0a]">{geometry.name}</h3>
      <div className="aspect-[2/1] w-full overflow-hidden rounded-md bg-[#f8fafc]">
        <BladeThumbnail />
      </div>
      <span className="text-[14px] leading-5 text-[#6b7280]">{geometry.lastUpdated}</span>
    </button>
  );
}

export function Geometry() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<ViewMode>('list');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'lastUpdated', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  // Open modal automatically when arriving with ?new=1 (from Home dashboard)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === '1') {
      setModalOpen(true);
      // Clean the query param so subsequent navigations don't reopen the modal
      navigate('/geometry', { replace: true });
    }
  }, [location.search, navigate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GEOMETRIES;
    return GEOMETRIES.filter(
      (g) =>
        g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
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

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  }

  function handleCreate(payload: NewGeometryPayload) {
    // For now: fabricate an id from the name, close modal, navigate to edit screen.
    // Real impl: POST to API, get id back, navigate.
    const id = payload.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setModalOpen(false);
    navigate(`/geometry/${id || 'new'}`);
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            {/* Header */}
            <div className="flex h-9 items-center justify-between">
              <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Geometries</h2>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
              >
                New geometry
              </button>
            </div>

            {/* Search + view toggle */}
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="relative w-full max-w-[384px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder={view === 'list' ? 'Search for geometry' : 'Placeholder'}
                  className="h-9 rounded-md border-[#e2e8f0] pl-9 text-[14px]"
                />
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 rounded-md border border-[#e5e7eb] bg-white p-1 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  aria-label="List view"
                  aria-pressed={view === 'list'}
                  className={`flex h-7 w-7 items-center justify-center rounded ${
                    view === 'list' ? 'bg-[#eef9ff] text-[#171717]' : 'text-[#6b7280] hover:bg-[#f1f5f9]'
                  }`}
                >
                  <ListIcon className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  aria-label="Grid view"
                  aria-pressed={view === 'grid'}
                  className={`flex h-7 w-7 items-center justify-center rounded ${
                    view === 'grid' ? 'bg-[#eef9ff] text-[#171717]' : 'text-[#6b7280] hover:bg-[#f1f5f9]'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* List view */}
            {view === 'list' && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#e5e7eb]">
                      <th className="h-10 w-[240px] px-3 text-left">
                        <SortableHeader
                          label="Name"
                          sortKey="name"
                          currentSort={sort}
                          onClick={handleSort}
                        />
                      </th>
                      <th className="h-10 px-3 text-left">
                        <span className="text-[14px] font-medium leading-5 text-[#6b7280]">
                          Description
                        </span>
                      </th>
                      <th className="h-10 w-[160px] px-3 text-left">
                        <SortableHeader
                          label="Last updated"
                          sortKey="lastUpdated"
                          currentSort={sort}
                          onClick={handleSort}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((g) => (
                      <tr
                        key={g.id}
                        onClick={() => navigate(`/geometry/${g.id}`)}
                        className="cursor-pointer border-b border-[#e5e7eb] bg-white hover:bg-[#f9fafb]"
                      >
                        <td className="px-3 py-4 text-[14px] font-medium leading-5 text-[#0a0a0a]">
                          {g.name}
                        </td>
                        <td className="px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
                          {g.description}
                        </td>
                        <td className="px-3 py-4 text-[14px] leading-5 text-[#0a0a0a]">
                          {g.lastUpdated}
                        </td>
                      </tr>
                    ))}
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
                          No geometries match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grid view */}
            {view === 'grid' && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {pageRows.map((g) => (
                  <GeometryCard
                    key={g.id}
                    geometry={g}
                    onClick={() => navigate(`/geometry/${g.id}`)}
                  />
                ))}
                {pageRows.length === 0 && (
                  <div className="col-span-full py-8 text-center text-[14px] text-[#6b7280]">
                    No geometries match your search.
                  </div>
                )}
              </div>
            )}

            {/* Pagination (only on list view per Figma) */}
            {view === 'list' && (
              <div className="mt-4">
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <NewGeometryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
