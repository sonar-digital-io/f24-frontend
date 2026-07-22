import type { RefObject } from 'react';
import { ArrowDown, ArrowUpDown, ChevronUp, Filter, LayoutGrid, List as ListIcon } from 'lucide-react';
import { GeometryCard } from '@/components/common/GeometryCard';
import { BladeThumbnail } from '@/components/common/BladeThumbnail';
import { GEOMETRIES } from '@/data/geometries';
import { COMPOSITIONS } from '@/data/compositions';
import type { Geometry } from '@/data/geometries';
import type { Composition } from '@/data/compositions';
import type { CompositionSubTab, CompListSort, CompListSortKey } from '@/pages/CalculationNew';

interface CompListSortableHeaderProps {
  label: string;
  sortKey: CompListSortKey;
  currentSort: CompListSort;
  onClick: (key: CompListSortKey) => void;
}

function CompListSortableHeader({
  label, sortKey, currentSort, onClick,
}: CompListSortableHeaderProps) {
  const isActive = currentSort.key === sortKey;
  const Icon = !isActive ? ArrowUpDown : currentSort.dir === 'desc' ? ArrowDown : ChevronUp;
  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className="inline-flex items-center gap-1 whitespace-nowrap text-[14px] font-medium leading-5 text-[#6b7280] hover:text-[#0a0a0a]"
    >
      {label}
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

interface CalculationCompositionTabProps {
  analysisMethod: string;
  compositionSubTab: CompositionSubTab;
  onCompositionSubTabChange: (value: CompositionSubTab) => void;
  compositionViewMode: 'grid' | 'list';
  onCompositionViewModeChange: (value: 'grid' | 'list') => void;
  selectedGeometryId: string | null;
  onSelectGeometry: (id: string) => void;
  selectedCompositionId: string | null;
  onSelectComposition: (id: string) => void;
  compListSort: CompListSort;
  onCompListSort: (key: CompListSortKey) => void;
  compListItems: (Geometry | Composition)[];
  compTypeFilter: Set<string>;
  compTypeBtnRef: RefObject<HTMLButtonElement>;
  onOpenCompTypeFilter: () => void;
}

export function CalculationCompositionTab({
  analysisMethod,
  compositionSubTab,
  onCompositionSubTabChange,
  compositionViewMode,
  onCompositionViewModeChange,
  selectedGeometryId,
  onSelectGeometry,
  selectedCompositionId,
  onSelectComposition,
  compListSort,
  onCompListSort,
  compListItems,
  compTypeFilter,
  compTypeBtnRef,
  onOpenCompTypeFilter,
}: CalculationCompositionTabProps) {
  return (
    <div className="flex w-full flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      {/* Aero only: info text */}
      {analysisMethod === 'Aero only' && (
        <p className="text-[14px] leading-5 text-[#6b7280]">
          For an aero only analysis, you can choose either a composition or a geometry.
        </p>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        {analysisMethod === 'Aero only' ? (
          /* Geometries / Compositions pill toggle */
          <div className="flex h-9 items-center gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
            {(['geometries', 'compositions'] as const).map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => onCompositionSubTabChange(sub)}
                className={`h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 capitalize transition-all ${
                  compositionSubTab === sub
                    ? 'bg-white text-[#0a0a0a] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]'
                    : 'text-[#6b7280] hover:text-[#0a0a0a]'
                }`}
              >
                {sub.charAt(0).toUpperCase() + sub.slice(1)}
              </button>
            ))}
          </div>
        ) : (
          <h2 className="text-[16px] font-semibold text-[#0a0a0a]">Compositions</h2>
        )}

        {/* List / Grid toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onCompositionViewModeChange('list')}
            aria-pressed={compositionViewMode === 'list'}
            className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
              compositionViewMode === 'list'
                ? 'border-[#006496] bg-[#eef9ff] text-[#006496]'
                : 'border-[#e5e7eb] bg-white text-[#6b7280] hover:bg-[#f1f5f9]'
            }`}
          >
            <ListIcon className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => onCompositionViewModeChange('grid')}
            aria-pressed={compositionViewMode === 'grid'}
            className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
              compositionViewMode === 'grid'
                ? 'border-[#006496] bg-[#eef9ff] text-[#006496]'
                : 'border-[#e5e7eb] bg-white text-[#6b7280] hover:bg-[#f1f5f9]'
            }`}
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Grid view */}
      {compositionViewMode === 'grid' && analysisMethod === 'Aero only' && compositionSubTab === 'geometries' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {GEOMETRIES.map((geo) => (
            <GeometryCard
              key={geo.id}
              geometry={geo}
              selected={selectedGeometryId === geo.id}
              showMenu={false}
              onClick={() => onSelectGeometry(geo.id)}
            />
          ))}
        </div>
      )}

      {compositionViewMode === 'grid' && (analysisMethod !== 'Aero only' || compositionSubTab === 'compositions') && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {COMPOSITIONS.map((comp) => (
            <div
              key={comp.id}
              onClick={() => onSelectComposition(comp.id)}
              className={`flex cursor-pointer flex-col rounded-[10px] border bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#f9fafb] ${
                selectedCompositionId === comp.id
                  ? 'border-[#006496] ring-2 ring-[#006496]/30'
                  : 'border-[#e5e7eb]'
              }`}
            >
              <div className="px-[10px] pt-[10px]">
                <h3 className="truncate text-[14px] font-semibold leading-5 text-[#0a0a0a]">
                  {comp.name}
                </h3>
              </div>
              <div className="flex h-[160px] items-center justify-center px-[10px] py-[10px]">
                <div className="flex h-full w-full items-center justify-center rounded-md bg-[#f8fafc]">
                  <BladeThumbnail />
                </div>
              </div>
              <div className="flex flex-col gap-[10px] px-[10px] pb-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] leading-4 text-[#0a0a0a]">{comp.type}</span>
                  <span className="text-[12px] leading-4 text-[#0a0a0a]">{comp.nominalRadius} m</span>
                </div>
                <div className="group/desc relative">
                  <p className="line-clamp-2 text-[12px] leading-4 text-[#737373]">
                    {comp.description}
                  </p>
                  <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 w-[220px] rounded bg-[#0a0a0a] px-2 py-1.5 text-[11px] leading-[1.4] text-white opacity-0 shadow-sm transition-opacity group-hover/desc:opacity-100">
                    {comp.description}
                  </span>
                </div>
                <span className="text-[12px] leading-4 text-[#737373]">{comp.lastUpdated}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {compositionViewMode === 'list' && (
        <div className="overflow-x-auto overflow-y-hidden rounded-md border border-[#e5e7eb]">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                <th className="h-10 w-[200px] px-3 text-left">
                  <CompListSortableHeader label="Name" sortKey="name" currentSort={compListSort} onClick={onCompListSort} />
                </th>
                <th className="h-10 px-3 text-left">
                  <span className="text-[14px] font-medium leading-5 text-[#6b7280]">Description</span>
                </th>
                <th className="h-10 w-[200px] px-3 text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-[14px] font-medium leading-5 text-[#6b7280]">Type</span>
                    <button
                      ref={compTypeBtnRef}
                      type="button"
                      onClick={onOpenCompTypeFilter}
                      className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#e5e7eb] ${compTypeFilter.size > 0 ? 'text-[#006496]' : 'text-[#6b7280]'}`}
                    >
                      <Filter className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </th>
                <th className="h-10 w-[140px] px-3 text-left">
                  <CompListSortableHeader label="Nominal radius" sortKey="nominalRadius" currentSort={compListSort} onClick={onCompListSort} />
                </th>
                <th className="h-10 w-[140px] px-3 text-left">
                  <CompListSortableHeader label="Last updated" sortKey="lastUpdated" currentSort={compListSort} onClick={onCompListSort} />
                </th>
              </tr>
            </thead>
            <tbody>
              {compListItems.map((item) => {
                const showingGeometries = analysisMethod === 'Aero only' && compositionSubTab === 'geometries';
                const isSelected = showingGeometries
                  ? selectedGeometryId === item.id
                  : selectedCompositionId === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => {
                      if (showingGeometries) {
                        onSelectGeometry(item.id);
                      } else {
                        onSelectComposition(item.id);
                      }
                    }}
                    className={`cursor-pointer border-b border-[#e5e7eb] transition-colors last:border-b-0 ${
                      isSelected ? 'bg-[#eef9ff] shadow-[inset_2px_0_0_#006496]' : 'hover:bg-[#f9fafb]'
                    }`}
                  >
                    <td className="px-3 py-3 font-medium text-[#0a0a0a]">{item.name}</td>
                    <td className="px-3 py-3 text-[#6b7280]">{item.description}</td>
                    <td className="px-3 py-3 text-[#0a0a0a]">{item.type}</td>
                    <td className="px-3 py-3 text-[#0a0a0a]">{item.nominalRadius} m</td>
                    <td className="px-3 py-3 text-[#0a0a0a]">{item.lastUpdated}</td>
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
