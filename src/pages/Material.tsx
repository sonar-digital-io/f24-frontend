import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  FileText,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import { MainNav } from '@/components/MainNav';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/input';
import {
  MATERIALS,
  type Material as MaterialItem,
  type MaterialDetails,
} from '@/data/materials';

const PAGE_SIZE = 5;

interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  currentSort: SortState;
  onClick: (key: SortKey) => void;
}

type SortKey = 'name' | 'type' | 'lastUpdated';
type SortDirection = 'asc' | 'desc';
interface SortState {
  key: SortKey;
  direction: SortDirection;
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

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-center gap-4 py-[5px]">
      <span className="w-[110px] shrink-0 text-[14px] leading-5 text-[#6b7280]">{label}</span>
      <span className="text-[14px] font-semibold leading-5 text-[#0a0a0a]">{value}</span>
    </div>
  );
}

interface MaterialRowProps {
  material: MaterialItem;
  expanded: boolean;
  onToggle: () => void;
}

function MaterialRow({ material, expanded, onToggle }: MaterialRowProps) {
  return (
    <>
      <tr
        className={`border-b border-[#e5e7eb] transition-colors ${
          expanded ? 'bg-[#f9fafb]' : 'bg-white hover:bg-[#f9fafb]'
        }`}
      >
        <td className="w-[52px] px-3 py-4 align-top">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={`material-detail-${material.id}`}
            className="flex h-7 w-7 items-center justify-center rounded text-[#0a0a0a] hover:bg-[#e5e7eb]"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" strokeWidth={2} />
            ) : (
              <ChevronDown className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </td>
        <td className="w-[240px] px-3 py-4 align-top text-[14px] font-medium leading-5 text-[#0a0a0a]">
          {material.name}
        </td>
        <td className="w-[240px] px-3 py-4 align-top text-[14px] leading-5 text-[#0a0a0a]">
          {material.type}
        </td>
        <td className="px-3 py-4 align-top text-[14px] leading-5 text-[#0a0a0a]">
          {material.description}
        </td>
        <td className="w-[160px] px-3 py-4 align-top text-[14px] leading-5 text-[#0a0a0a]">
          {material.lastUpdated}
        </td>
        <td className="w-[208px] px-3 py-4 align-top">
          <div
            className={`flex items-center justify-end gap-1 ${
              expanded ? 'opacity-100' : 'opacity-0 hover:opacity-100'
            }`}
          >
            <button
              type="button"
              aria-label="Copy material"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
            >
              <FileText className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Duplicate material"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
            >
              <Copy className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr
          id={`material-detail-${material.id}`}
          className="border-b border-[#e5e7eb] bg-white"
        >
          <td className="w-[52px]" />
          <td colSpan={5} className="px-3 pb-5 pt-1">
            <MaterialDetailGrid details={material.details} />
          </td>
        </tr>
      )}
    </>
  );
}

function MaterialDetailGrid({ details }: { details: MaterialDetails }) {
  return (
    <div className="flex flex-col">
      <DetailRow label="Reinforcement" value={details.reinforcement} />
      <DetailRow label="Matrix" value={details.matrix} />
      <DetailRow label="Modulus (tensile)" value={details.modulusTensile} />
      <DetailRow label="Density" value={details.density} />
      <DetailRow
        label="TDS Ref.:"
        value={
          <a
            href="#"
            className="text-[14px] font-semibold leading-5 text-[#007dbb] underline-offset-2 hover:underline"
          >
            {details.tdsRef}
          </a>
        }
      />
    </div>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function Pagination({ page, totalPages, onChange }: PaginationProps) {
  // Show: prev — first few — ellipsis — last few — next
  // For small total: just numbers
  const pageNumbers = useMemo(() => {
    if (totalPages <= 4) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const visible: (number | 'ellipsis')[] = [1, 2, 3];
    if (totalPages > 4) visible.push('ellipsis');
    return visible;
  }, [totalPages]);

  return (
    <nav
      aria-label="Pagination"
      className="flex h-9 items-center justify-end gap-1"
    >
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

export function Material() {
  const [expandedId, setExpandedId] = useState<string | null>('envalior-tepex-101');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'lastUpdated', direction: 'desc' });
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MATERIALS;
    return MATERIALS.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
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

  function toggleExpand(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            {/* Header */}
            <div className="flex h-9 items-center justify-between">
              <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Materials</h2>
              <Link
                to="/material/new"
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
              >
                New material
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
                  placeholder="Search for materials"
                  className="h-9 rounded-md border-[#e2e8f0] pl-9 text-[14px]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <th className="h-10 w-[52px] px-3 text-left" />
                    <th className="h-10 w-[240px] px-3 text-left">
                      <SortableHeader
                        label="Name"
                        sortKey="name"
                        currentSort={sort}
                        onClick={handleSort}
                      />
                    </th>
                    <th className="h-10 w-[240px] px-3 text-left">
                      <SortableHeader
                        label="Type"
                        sortKey="type"
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
                    <th className="h-10 w-[208px] px-3 text-left" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((material) => (
                    <MaterialRow
                      key={material.id}
                      material={material}
                      expanded={expandedId === material.id}
                      onToggle={() => toggleExpand(material.id)}
                    />
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
                        No materials match your search.
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
