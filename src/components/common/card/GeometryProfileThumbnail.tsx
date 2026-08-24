import { useMemo } from 'react';
import { useGeometryDetailCached, useGeometryProfilePreview } from '@/hooks/api/useGeometry';
import { useInView } from '@/hooks/useInView';
import { profileDomainFromPoints } from '@/lib/profileGeometry';
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
  const { ref, inView } = useInView<HTMLDivElement>();
  const hasGeometry = geometryId !== undefined && Number.isFinite(geometryId);
  // Defer both fetches until the card actually scrolls into view — a grid of
  // many cards would otherwise fire a detail GET + preview POST per card on mount.
  const { data: detail, isLoading: isDetailLoading } = useGeometryDetailCached(inView ? geometryId ?? NaN : NaN);
  const profile = hasGeometry ? detail?.profiles?.[0] : undefined;

  const { data: points, isLoading: isPreviewLoading, isError } = useGeometryProfilePreview(
    inView ? geometryId ?? NaN : NaN,
    profile,
  );

  const path = useMemo(() => {
    if (!points || points.length === 0) return null;
    const flipped: [number, number][] = points.map(([x, y]) => [x, -y]); // flip so positive y renders upward
    const { domainXMin, domainXMax, domainYMin, domainYMax } = profileDomainFromPoints(flipped);
    const viewBox = `${domainXMin} ${domainYMin} ${domainXMax - domainXMin} ${domainYMax - domainYMin}`;
    const d = `M ${flipped.map(([x, y]) => `${x},${y}`).join(' L ')} Z`;
    return { viewBox, d };
  }, [points]);

  let content;
  if (!hasGeometry) {
    content = NO_PREVIEW;
  } else if (!inView || isDetailLoading || (profile && isPreviewLoading)) {
    content = <Skeleton className="h-full w-full" />;
  } else if (!profile || isError || !path) {
    content = NO_PREVIEW;
  } else {
    content = (
      <svg viewBox={path.viewBox} className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path d={path.d} fill="#e5e7eb" stroke="#374151" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }

  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center">
      {content}
    </div>
  );
}
