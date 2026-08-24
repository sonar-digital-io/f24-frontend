import { useState } from 'react';
import { OccViewer } from '@/components/common/viewer/OccViewer';
import { Checkbox } from '@/components/ui/checkbox';
import { useCompositionPreview } from '@/hooks/api/useComposition';
import { useGeometryDetail } from '@/hooks/api/useGeometry';

export interface CompositionPreviewTabProps {
  compositionId: number;
  geometryId: number;
}

export function CompositionPreviewTab({ compositionId, geometryId }: CompositionPreviewTabProps) {
  const [showBlade, setShowBlade] = useState(true);
  const [showWireframe, setShowWireframe] = useState(false);

  const previewQuery = useCompositionPreview(compositionId, true);
  const geometryQuery = useGeometryDetail(geometryId);
  const nominalRadius = Number(geometryQuery.data?.settings?.find((s) => s.reference === 'nominal_radius')?.value) || 1;

  return (
    <div className="pointer-events-auto relative h-full w-full overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white/95 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <OccViewer
        stlData={previewQuery.data}
        stlScale={nominalRadius}
        showBlade={showBlade}
        showLayups={false}
        showWebView={showWireframe}
        className="absolute inset-0 h-full w-full"
      />

      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-md border border-[#e5e7eb] bg-white/95 p-3 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm">
        <label className="flex items-center gap-2 text-[13px] text-[#0a0a0a]">
          <Checkbox checked={showBlade} onCheckedChange={setShowBlade} />
          Blade
        </label>
        <label className="flex items-center gap-2 text-[13px] text-[#0a0a0a]">
          <Checkbox checked={showWireframe} onCheckedChange={setShowWireframe} />
          Wireframe
        </label>
      </div>

      {previewQuery.isError && (
        <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-[13px] text-[#dc2626]">
          Failed to load preview. Please try again.
        </p>
      )}
    </div>
  );
}
