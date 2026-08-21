import { useMemo } from 'react';
import { useGeometryDetailCached, useGeometryProfilePreview } from '@/hooks/api/useGeometry';
import { Skeleton } from '@/components/ui/skeleton';

interface GeometryProfileThumbnailProps {
  /** Geometry whose first profile should be previewed; omit when the entity has no linked geometry yet. */
  geometryId?: number;
}

const NO_PREVIEW = (
  <p className="px-4 text-center text-[12px] leading-4 text-[#737373]">
    No preview image available for this geometry.
  </p>
);

/**
 * Grid-card thumbnail that draws a geometry's first profile outline via
 * POST /geometry/:id/profiles/preview/. Shows a skeleton while loading and a
 * "no preview" message when there's no linked geometry, no profiles, or the
 * preview request fails. Both underlying fetches are React Query-cached, so
 * remounting the card (e.g. toggling list/grid view) reuses prior results.
 */
export function GeometryProfileThumbnail({ geometryId }: GeometryProfileThumbnailProps) {
  const hasGeometry = geometryId !== undefined && Number.isFinite(geometryId);
  const { data: detail, isLoading: isDetailLoading } = useGeometryDetailCached(geometryId ?? NaN);
  const profile = hasGeometry ? detail?.profiles?.[0] : undefined;

  const { data: points, isLoading: isPreviewLoading, isError } = useGeometryProfilePreview(geometryId ?? NaN, profile);

  const path = useMemo(() => {
    if (!points || points.length === 0) return null;
    const ys = points.map(([, y]) => -y); // flip so positive y renders upward
    const xs = points.map(([x]) => x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padX = (maxX - minX) * 0.08 || 0.01;
    const padY = (maxY - minY) * 0.08 || 0.01;
    const viewBox = `${minX - padX} ${minY - padY} ${maxX - minX + 2 * padX} ${maxY - minY + 2 * padY}`;
    const d = `M ${points.map(([x], i) => `${x},${ys[i]}`).join(' L ')} Z`;
    return { viewBox, d };
  }, [points]);

  if (!hasGeometry) return NO_PREVIEW;

  if (isDetailLoading || (profile && isPreviewLoading)) {
    return <Skeleton className="h-full w-full" />;
  }

  if (!profile || isError || !path) return NO_PREVIEW;

  return (
    <svg viewBox={path.viewBox} className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d={path.d} fill="#e5e7eb" stroke="#374151" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
