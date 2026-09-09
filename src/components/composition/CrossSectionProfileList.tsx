import { buildCrossSectionRender, type CrossSectionViewBox } from '@/lib/crossSectionGeometry';

// Same aspect as before, sized up ~1.2x (was 140x80) — the sidebar's own
// available width, not this viewBox, is what actually caps the rendered size.
const THUMBNAIL_VIEWBOX: CrossSectionViewBox = { width: 168, height: 96, padX: 7, padY: 7 };
const RING_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#e11d48', '#8b5cf6'];

export interface CrossSectionThumbnailRing {
  startFrac: number;
  endFrac: number;
  /** Overrides the auto-cycled ring color — used for the layup-mapping
   *  reference regions (blue = upper side, yellow = lower side). */
  color?: string;
}

interface CrossSectionThumbnailProps {
  points: [number, number][];
  rings?: CrossSectionThumbnailRing[];
}

/** Small static outline preview — same rendering (`buildCrossSectionRender`)
 *  as the full `CrossSectionDialog`, just at a smaller viewBox, so a profile
 *  looks identical (fitting, ring offset, smoothing) at either size. */
function CrossSectionThumbnail({ points, rings }: CrossSectionThumbnailProps) {
  const { outlineD, rings: renderedRings } = buildCrossSectionRender(
    points,
    (rings ?? []).map((r, i) => ({
      id: String(i),
      startFrac: r.startFrac,
      endFrac: r.endFrac,
      color: r.color ?? RING_COLORS[i % RING_COLORS.length],
    })),
    THUMBNAIL_VIEWBOX,
  );

  return (
    <svg
      viewBox={`0 0 ${THUMBNAIL_VIEWBOX.width} ${THUMBNAIL_VIEWBOX.height}`}
      className="h-[86px] w-full"
      aria-hidden="true"
    >
      {renderedRings.map(
        (r) =>
          r.d && (
            <path
              key={r.id}
              d={r.d}
              fill="none"
              stroke={r.color}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          ),
      )}
      <path d={outlineD} fill="none" stroke="#1a1a1a" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface CrossSectionProfileListProps {
  profiles: { id: number; name: string }[];
  /** Raw contour points per profile id (GET /geometry/:id/profiles/:profileId/) —
   *  a profile without an entry here just shows its name, no canvas. */
  pointsByProfileId: Map<number, [number, number][]>;
  /** Saved transversal-mapping rings per profile id — drawn on top of the outline. */
  ringsByProfileId?: Map<number, CrossSectionThumbnailRing[]>;
  selected: string | null;
  onSelect: (profileId: string) => void;
}

/** Left sidebar: every geometry profile, each with a cross-section preview
 *  when its point data has loaded — click one to open the full dialog. */
export function CrossSectionProfileList({
  profiles,
  pointsByProfileId,
  ringsByProfileId,
  selected,
  onSelect,
}: CrossSectionProfileListProps) {
  return (
    <div className="flex w-[180px] shrink-0 flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <span className="text-[12px] font-medium leading-none text-[#6b7280]">Cross-section view</span>
      <ul className="flex flex-col gap-2">
        {profiles.map((prof) => {
          const points = pointsByProfileId.get(prof.id);
          return (
            <li key={prof.id}>
              <button
                type="button"
                onClick={() => onSelect(String(prof.id))}
                className={`relative flex w-full flex-col overflow-hidden rounded-md text-left text-[13px] transition-colors ${
                  selected === String(prof.id)
                    ? 'bg-[#eef9ff] text-[#0a0a0a]'
                    : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                }`}
              >
                {points && <CrossSectionThumbnail points={points} rings={ringsByProfileId?.get(prof.id)} />}
                <span className="absolute bottom-1 left-2 rounded bg-white/85 px-1 py-0.5 text-[12px] font-medium leading-none backdrop-blur-[1px]">
                  {prof.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
