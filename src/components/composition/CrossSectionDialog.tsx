import { useState } from 'react';
import { X } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import {
  offsetSvgPts,
  computeArcFractions,
  fracToIdx,
  perimeterLabel,
  getSegPts,
  segD,
  fitPointsToSvg,
} from '@/lib/crossSectionGeometry';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsRing {
  id: string;
  badge: string;
  layupName: string;
  /** Value shown in the Start position table column */
  displayStart: number;
  startLockedTo: string;
  /** Value shown in the End position table column */
  displayEnd: number;
  endLockedTo: string;
  /** First allPts index of the segment */
  segLo: number;
  /** Last allPts index of the segment */
  segHi: number;
  /** True when the segment wraps around the 0/1 perimeter-fraction seam */
  wrapArc: boolean;
  color: string;
  /** Inward perpendicular offset in SVG-viewport units */
  svgOffset: number;
}

export interface TransversalMappingEntryForCs {
  id: string;
  name: string;
  layupName: string;
  /** Perimeter fraction along the profile outline, 0..1 */
  startFrac: number;
  endFrac: number;
  /** Resolved from GET /composition/:id/intersections/ (start_locked_to /
   *  end_locked_to point to intersection ids there) — falls back to a
   *  geometric guess when not provided. */
  startLockedToLabel?: string;
  endLockedToLabel?: string;
}

interface CrossSectionDialogProps {
  profileName: string;
  /** Raw [x, y] cross-section points from GET /geometry/:id/profiles/:profileId/ — a closed loop. */
  points: [number, number][];
  /** From GET /composition/:id/mapping/transversal/, for this profile. */
  entries: TransversalMappingEntryForCs[];
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VB_W = 800;
const VB_H = 200;
const PAD_X = 24;
const PAD_Y = 16;
const INNER_W = VB_W - 2 * PAD_X;
const INNER_H = VB_H - 2 * PAD_Y;

const RING_OFFSET = 5; // SVG-viewport units between consecutive rings

// Cycled by index — supports any number of mapping segments.
const RING_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#e11d48', '#8b5cf6', '#0891b2', '#64748b', '#ca8a04'];

// ─── Component ────────────────────────────────────────────────────────────────

export function CrossSectionDialog({ profileName, points, entries, onClose }: CrossSectionDialogProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEscapeKey(onClose);

  // Fit the raw profile points into the SVG viewport (uniform scale, both axes).
  const svgBasePts: [number, number][] = fitPointsToSvg(points, INNER_W, INNER_H, PAD_X, PAD_Y);
  const arcFracs = computeArcFractions(svgBasePts);
  // Leading edge = midpoint of the closed loop (TE → upper → LE → lower → TE).
  const halfN = Math.floor((svgBasePts.length - 1) / 2);
  const leFrac = arcFracs[halfN];

  const rings: CsRing[] = entries.map((entry, i) => {
    const idxA = fracToIdx(arcFracs, entry.startFrac);
    const idxB = fracToIdx(arcFracs, entry.endFrac);
    const lo = Math.min(idxA, idxB);
    const hi = Math.max(idxA, idxB);
    return {
      id: entry.id,
      badge: entry.name || `segment${i + 1}`,
      layupName: entry.layupName,
      displayStart: entry.startFrac,
      startLockedTo: entry.startLockedToLabel ?? perimeterLabel(entry.startFrac, leFrac),
      displayEnd: entry.endFrac,
      endLockedTo: entry.endLockedToLabel ?? perimeterLabel(entry.endFrac, leFrac),
      segLo: lo,
      segHi: hi,
      wrapArc: entry.endFrac < entry.startFrac,
      color: RING_COLORS[i % RING_COLORS.length],
      svgOffset: (i + 1) * RING_OFFSET,
    };
  });

  // Render order: outermost ring first (underneath), innermost last (on top)
  const renderRings = [...rings].sort((a, b) => a.svgOffset - b.svgOffset);

  // Pre-compute offset SVG points per unique svgOffset
  const svgOffsetCache = new Map<number, [number, number][]>();
  for (const entry of rings) {
    if (!svgOffsetCache.has(entry.svgOffset)) {
      svgOffsetCache.set(entry.svgOffset, offsetSvgPts(svgBasePts, entry.svgOffset));
    }
  }

  const fullD =
    'M ' + svgBasePts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L ') + ' Z';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto flex max-h-[90vh] w-[900px] max-w-[95vw] flex-col overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#e5e7eb] px-6 py-4">
          <h2 className="text-[18px] font-semibold text-[#0a0a0a]">{profileName}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Airfoil cross-section */}
        <div className="shrink-0 border-b border-[#e5e7eb] bg-[#f8fafc] px-6 py-4">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="h-[180px] w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {renderRings.map((entry) => {
              const svgPts = svgOffsetCache.get(entry.svgOffset)!;
              const pts = getSegPts(svgPts, entry.segLo, entry.segHi, entry.wrapArc);
              if (pts.length < 2) return null;
              const isHovered = hoveredId === entry.id;
              const dimmed = hoveredId !== null && !isHovered;
              return (
                <path
                  key={entry.id}
                  d={segD(pts)}
                  fill="none"
                  stroke={entry.color}
                  strokeWidth={isHovered ? 4 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={dimmed ? 0.5 : 1}
                  vectorEffect="non-scaling-stroke"
                  style={{ transition: 'opacity 0.15s ease, stroke-width 0.1s ease' }}
                />
              );
            })}
            {/* Black outline drawn last — sits on top of all rings */}
            <path d={fullD} fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Table */}
        <div className="overflow-y-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-[#e5e7eb]">
                <th className="h-9 w-[180px] px-4 text-left text-[12px] font-medium text-[#6b7280]">
                  Name
                </th>
                <th className="h-9 w-[96px] px-4 text-left text-[12px] font-medium text-[#6b7280]">
                  Start position
                </th>
                <th className="h-9 px-4 text-left text-[12px] font-medium text-[#6b7280]">
                  Start locked to
                </th>
                <th className="h-9 w-[96px] px-4 text-left text-[12px] font-medium text-[#6b7280]">
                  End position
                </th>
                <th className="h-9 px-4 text-left text-[12px] font-medium text-[#6b7280]">
                  End locked to
                </th>
                <th className="h-9 px-4 text-left text-[12px] font-medium text-[#6b7280]">Layup</th>
              </tr>
            </thead>
            <tbody>
              {rings.map((entry) => {
                const isHovered = hoveredId === entry.id;
                return (
                  <tr
                    key={entry.id}
                    onMouseEnter={() => setHoveredId(entry.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`border-b border-[#f1f5f9] last:border-b-0 ${
                      isHovered ? 'bg-[#f8fafc]' : 'hover:bg-[#f8fafc]'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex max-w-[148px] items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white"
                        style={{ backgroundColor: entry.color }}
                        title={entry.badge.length > 20 ? entry.badge : undefined}
                      >
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                          {entry.badge.length > 20 ? `${entry.badge.slice(0, 17)}…` : entry.badge}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-[#374151]">
                      {entry.displayStart.toFixed(4)}
                    </td>
                    <td className="px-4 py-2.5 text-[#374151]">{entry.startLockedTo}</td>
                    <td className="px-4 py-2.5 tabular-nums text-[#374151]">
                      {entry.displayEnd.toFixed(4)}
                    </td>
                    <td className="px-4 py-2.5 text-[#374151]">{entry.endLockedTo}</td>
                    <td className="px-4 py-2.5 text-[#374151]">{entry.layupName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
