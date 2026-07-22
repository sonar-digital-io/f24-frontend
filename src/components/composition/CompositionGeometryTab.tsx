import { LayoutGrid, List as ListIcon, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GeometryCard } from '@/components/common/card/GeometryCard';
import { GEOMETRIES } from '@/data/geometries';

export interface CompositionGeometryTabProps {
  geomQuery: string;
  onGeomQueryChange: (v: string) => void;
  geomView: 'list' | 'grid';
  onGeomViewChange: (v: 'list' | 'grid') => void;
  selectedGeometryId: string | null;
  onSelectGeometry: (id: string) => void;
}

export function CompositionGeometryTab({
  geomQuery,
  onGeomQueryChange,
  geomView,
  onGeomViewChange,
  selectedGeometryId,
  onSelectGeometry,
}: CompositionGeometryTabProps) {
  const filteredGeometries = GEOMETRIES.filter(
    (g) =>
      !geomQuery.trim() ||
      g.name.toLowerCase().includes(geomQuery.trim().toLowerCase()) ||
      g.description.toLowerCase().includes(geomQuery.trim().toLowerCase())
  );

  return (
    <div className="pointer-events-auto max-h-[calc(100vh-145px)] overflow-y-auto rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Geometries</h2>
        <div className="flex items-center gap-1 rounded-md border border-[#e5e7eb] bg-white p-1 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
          <button
            type="button"
            onClick={() => onGeomViewChange('list')}
            aria-label="List view"
            aria-pressed={geomView === 'list'}
            className={`flex h-7 w-7 items-center justify-center rounded ${
              geomView === 'list'
                ? 'bg-[#eef9ff] text-[#171717]'
                : 'text-[#6b7280] hover:bg-[#f1f5f9]'
            }`}
          >
            <ListIcon className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => onGeomViewChange('grid')}
            aria-label="Grid view"
            aria-pressed={geomView === 'grid'}
            className={`flex h-7 w-7 items-center justify-center rounded ${
              geomView === 'grid'
                ? 'bg-[#eef9ff] text-[#171717]'
                : 'text-[#6b7280] hover:bg-[#f1f5f9]'
            }`}
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="mt-4 max-w-[384px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
          <Input
            value={geomQuery}
            onChange={(e) => onGeomQueryChange(e.target.value)}
            placeholder="Placeholder"
            className="h-9 rounded-md border-[#e2e8f0] pl-9 text-[14px]"
          />
        </div>
      </div>

      {geomView === 'grid' ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {filteredGeometries.map((g) => (
            <GeometryCard
              key={g.id}
              geometry={g}
              onClick={() => onSelectGeometry(g.id)}
              selected={selectedGeometryId === g.id}
              showMenu={false}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-md border border-[#e5e7eb]">
          <table className="w-full border-separate border-spacing-0 text-[14px]">
            <thead>
              <tr>
                <th className="h-10 w-[240px] border-b border-[#e5e7eb] px-3 text-left font-medium text-[#6b7280]">
                  Name
                </th>
                <th className="h-10 border-b border-[#e5e7eb] px-3 text-left font-medium text-[#6b7280]">
                  Description
                </th>
                <th className="h-10 w-[160px] border-b border-[#e5e7eb] px-3 text-left font-medium text-[#6b7280]">
                  Last updated
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredGeometries.map((g, idx) => {
                const isLast = idx === filteredGeometries.length - 1;
                const isSelected = selectedGeometryId === g.id;
                const cellBorder = isLast || isSelected ? '' : 'border-b border-[#e5e7eb]';
                return (
                  <tr
                    key={g.id}
                    onClick={() => onSelectGeometry(g.id)}
                    className={`cursor-pointer ${
                      isSelected
                        ? 'bg-[#eef9ff] shadow-[inset_2px_0_0_#006496]'
                        : 'hover:bg-[#f9fafb]'
                    }`}
                  >
                    <td className={`px-3 py-3 font-medium text-[#0a0a0a] ${cellBorder}`}>{g.name}</td>
                    <td className={`px-3 py-3 text-[#0a0a0a] ${cellBorder}`}>{g.description}</td>
                    <td className={`px-3 py-3 text-[#0a0a0a] ${cellBorder}`}>{g.lastUpdated}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
