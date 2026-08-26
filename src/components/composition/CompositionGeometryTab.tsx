import { CheckCircle2, Search, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/utils';
import { useGeometryList, useFetchGeometryTopView } from '@/hooks/api/useGeometry';
import { useFetchCompositionIntersections, useUpdateCompositionGeometry } from '@/hooks/api/useComposition';
import type { Geometry as BackendGeometry } from '@/api/types/geometry';

export interface CompositionGeometryTabProps {
  compositionId: number;
  geomQuery: string;
  onGeomQueryChange: (v: string) => void;
  selectedGeometryId: string | null;
  onSelectGeometry: (id: string) => void;
  onAfterSelect: () => void;
}

export function CompositionGeometryTab({
  compositionId,
  geomQuery,
  onGeomQueryChange,
  selectedGeometryId,
  onSelectGeometry,
  onAfterSelect,
}: CompositionGeometryTabProps) {
  const { data: backendGeometries, isLoading, isError } = useGeometryList();
  const geometries = backendGeometries ?? [];
  const updateGeometryMutation = useUpdateCompositionGeometry(compositionId);
  const intersectionsMutation = useFetchCompositionIntersections();
  const topViewMutation = useFetchGeometryTopView();
  const selectPending = updateGeometryMutation.isPending || intersectionsMutation.isPending || topViewMutation.isPending;

  const filteredGeometries = geometries.filter(
    (g) =>
      !geomQuery.trim() ||
      g.name.toLowerCase().includes(geomQuery.trim().toLowerCase()) ||
      (g.description ?? '').toLowerCase().includes(geomQuery.trim().toLowerCase())
  );

  async function handleSelect(g: BackendGeometry) {
    onSelectGeometry(String(g.id));
    await updateGeometryMutation.mutateAsync({ geometry: g.id });
    await intersectionsMutation.mutateAsync(compositionId);
    await topViewMutation.mutateAsync(g.id);
    onAfterSelect();
  }

  return (
    <div className="pointer-events-auto max-h-[calc(100vh-145px)] overflow-y-auto rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur-sm">
      <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Geometries</h2>

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

      {(updateGeometryMutation.isError || intersectionsMutation.isError || topViewMutation.isError) && (
        <p className="mt-3 text-[13px] text-[#dc2626]">Failed to select geometry. Please try again.</p>
      )}

      <div className="mt-4 overflow-hidden rounded-md border border-[#e5e7eb]">
          <table className="w-full border-separate border-spacing-0 text-[14px]">
            <thead>
              <tr>
                <th className="h-10 w-[80px] border-b border-[#e5e7eb] px-3 text-left font-medium text-[#6b7280]">
                  Valid
                </th>
                <th className="h-10 w-[140px] border-b border-[#e5e7eb] px-3 text-left font-medium text-[#6b7280]">
                  Created at
                </th>
                <th className="h-10 w-[200px] border-b border-[#e5e7eb] px-3 text-left font-medium text-[#6b7280]">
                  Name
                </th>
                <th className="h-10 w-[140px] border-b border-[#e5e7eb] px-3 text-left font-medium text-[#6b7280]">
                  User
                </th>
                <th className="h-10 border-b border-[#e5e7eb] px-3 text-left font-medium text-[#6b7280]">
                  Description
                </th>
                <th className="h-10 w-[100px] border-b border-[#e5e7eb] px-3 text-left font-medium text-[#6b7280]" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[#6b7280]">
                    Loading geometries…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[#dc2626]">
                    Failed to load geometries from the server.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && filteredGeometries.map((g, idx) => {
                const isLast = idx === filteredGeometries.length - 1;
                const isSelected = selectedGeometryId === String(g.id);
                const cellBorder = isLast || isSelected ? '' : 'border-b border-[#e5e7eb]';
                return (
                  <tr
                    key={g.id}
                    className={isSelected ? 'bg-[#eef9ff] shadow-[inset_2px_0_0_#006496]' : 'hover:bg-[#f9fafb]'}
                  >
                    <td className={`px-3 py-3 ${cellBorder}`}>
                      {g.valid ? (
                        <CheckCircle2 className="h-4 w-4 text-[#16a34a]" strokeWidth={2} />
                      ) : (
                        <XCircle className="h-4 w-4 text-[#dc2626]" strokeWidth={2} />
                      )}
                    </td>
                    <td className={`px-3 py-3 text-[#0a0a0a] ${cellBorder}`}>
                      {formatDateTime(g.created_at)}
                    </td>
                    <td className={`px-3 py-3 font-medium text-[#0a0a0a] ${cellBorder}`}>{g.name}</td>
                    <td className={`px-3 py-3 text-[#0a0a0a] ${cellBorder}`}>{g.user}</td>
                    <td className={`px-3 py-3 text-[#0a0a0a] ${cellBorder}`}>{g.description}</td>
                    <td className={`px-3 py-3 text-right ${cellBorder}`}>
                      <button
                        type="button"
                        onClick={() => handleSelect(g)}
                        disabled={selectPending}
                        className={
                          isSelected
                            ? 'inline-flex h-8 items-center rounded-md border border-[#006496] bg-white px-3 text-[12px] font-medium text-[#006496] hover:bg-[#eef9ff] disabled:cursor-not-allowed disabled:opacity-40'
                            : 'inline-flex h-8 items-center rounded-md bg-[#006496] px-3 text-[12px] font-medium text-[#fafafa] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-40'
                        }
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && !isError && filteredGeometries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[#6b7280]">
                    No geometries match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
}
