import { useState } from 'react';
import { OccViewer } from '@/components/common/viewer/OccViewer';
import { Checkbox } from '@/components/ui/checkbox';
import { useCompositionDetail, useCompositionPreview } from '@/hooks/api/useComposition';
import { useGeometryDetail } from '@/hooks/api/useGeometry';
import { LAYUP_MAPPING_COLORS } from '@/lib/crossSectionGeometry';

export interface CompositionPreviewTabProps {
  compositionId: number;
  geometryId: number;
}

export function CompositionPreviewTab({ compositionId, geometryId }: CompositionPreviewTabProps) {
  const [showBlade, setShowBlade] = useState(true);
  const [showWireframe, setShowWireframe] = useState(false);
  // Every non-blade 3MF object name found in the current preview (each
  // layup upper/lower/transversal mapping strip ships as its own named
  // part) — populated by OccViewer once it parses the result, so the
  // checkbox list always matches what this composition actually has.
  const [layupNames, setLayupNames] = useState<string[]>([]);
  const [layupVisibility, setLayupVisibility] = useState<Record<string, boolean>>({});

  function handleLayupNames(names: string[]) {
    setLayupNames(names);
    setLayupVisibility((prev) => {
      const next: Record<string, boolean> = {};
      names.forEach((name) => {
        next[name] = prev[name] ?? true;
      });
      return next;
    });
  }

  const previewQuery = useCompositionPreview(compositionId, true);
  const geometryQuery = useGeometryDetail(geometryId);
  const nominalRadius =
    Number(geometryQuery.data?.settings?.find((s) => s.reference === 'nominal_radius')?.value) || 1;

  // A 3MF part's own name (a layup mapping's user-given name) carries no
  // reliable "upper"/"lower" signal — resolve it from the composition's own
  // longitudinal_mapping sides instead, so a layup mapping never gets
  // miscategorized as a transversal mapping part in the 3D view.
  const { data: compositionDetail } = useCompositionDetail(compositionId);
  const layupColorOverride: Record<string, string> = {};
  (compositionDetail?.longitudinal_mapping?.upper_side ?? []).forEach((entry) => {
    layupColorOverride[entry.name] = LAYUP_MAPPING_COLORS.upper;
  });
  (compositionDetail?.longitudinal_mapping?.lower_side ?? []).forEach((entry) => {
    layupColorOverride[entry.name] = LAYUP_MAPPING_COLORS.lower;
  });

  return (
    <div className="pointer-events-auto relative h-full w-full overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white/95 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <OccViewer
        stlData={previewQuery.data}
        stlScale={nominalRadius}
        showBlade={showBlade}
        layupVisibility={layupVisibility}
        onLayupNames={handleLayupNames}
        layupColorOverride={layupColorOverride}
        showWebView={showWireframe}
        className="absolute inset-0 h-full w-full"
      />

      <div className="absolute left-4 top-4 z-10 flex max-h-[calc(100%-32px)] flex-col gap-2 overflow-y-auto rounded-md border border-[#e5e7eb] bg-white/95 p-3 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm">
        <label className="flex items-center gap-2 text-[13px] text-[#0a0a0a]">
          <Checkbox checked={showBlade} onCheckedChange={setShowBlade} />
          Blade
        </label>
        <label className="flex items-center gap-2 text-[13px] text-[#0a0a0a]">
          <Checkbox checked={showWireframe} onCheckedChange={setShowWireframe} />
          Wireframe
        </label>
        {layupNames.length > 0 && <div className="my-1 border-t border-[#e5e7eb]" />}
        {layupNames.map((name) => (
          <label key={name} className="flex items-center gap-2 text-[13px] text-[#0a0a0a]">
            <Checkbox
              checked={layupVisibility[name] ?? true}
              onCheckedChange={(checked) =>
                setLayupVisibility((prev) => ({ ...prev, [name]: checked === true }))
              }
            />
            {name}
          </label>
        ))}
      </div>

      {previewQuery.isError && (
        <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-[13px] text-[#dc2626]">
          Failed to load preview. Please try again.
        </p>
      )}
    </div>
  );
}
