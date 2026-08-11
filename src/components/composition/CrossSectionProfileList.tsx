import { buildArcPoints, computeArcFractions, fitPointsToSvg, offsetSvgPts, segD } from '@/lib/crossSectionGeometry';

const VB_W = 140;
const VB_H = 80;
const PAD = 6;
const RING_OFFSET = 2;
const RING_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#e11d48', '#8b5cf6'];

export interface CrossSectionThumbnailRing {
  startFrac: number;
  endFrac: number;
}

interface CrossSectionThumbnailProps {
  points: [number, number][];
  rings?: CrossSectionThumbnailRing[];
}

/** Small static outline preview — same fitting math as the full CrossSectionDialog,
 *  plus a thin colored line per saved transversal mapping ring. */
function CrossSectionThumbnail({ points, rings }: CrossSectionThumbnailProps) {
  const svgPts = fitPointsToSvg(points, VB_W - 2 * PAD, VB_H - 2 * PAD, PAD, PAD);
  const arcFracs = computeArcFractions(svgPts);
  const d = 'M ' + svgPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ') + ' Z';
  const ringPts = (rings ?? []).map((_, i) => offsetSvgPts(svgPts, RING_OFFSET * (i + 1)));

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-12 w-full" aria-hidden="true">
      {(rings ?? []).map((r, i) => {
        const pts = buildArcPoints(ringPts[i], arcFracs, r.startFrac, r.endFrac);
        if (pts.length < 2) return null;
        return (
          <path
            key={i}
            d={segD(pts)}
            fill="none"
            stroke={RING_COLORS[i % RING_COLORS.length]}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      <path d={d} fill="none" stroke="#1a1a1a" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
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
                className={`flex w-full flex-col gap-1 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
                  selected === String(prof.id)
                    ? 'bg-[#eef9ff] text-[#0a0a0a]'
                    : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                }`}
              >
                {points && <CrossSectionThumbnail points={points} rings={ringsByProfileId?.get(prof.id)} />}
                {prof.name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
