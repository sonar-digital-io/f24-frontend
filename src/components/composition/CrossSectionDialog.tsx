import { useState } from 'react';
import { X } from 'lucide-react';
import type { Profile } from '@/data/profiles';
import { LAYUPS } from '@/data/layups';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import {
  CROSS_SECTION_N as N,
  buildAllPts,
  offsetSvgPts,
  computeArcFractions,
  signedToIdx,
  perimeterLabel,
  chordLabel,
  getSegPts,
  segD,
} from '@/lib/crossSectionGeometry';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsLayup {
  id: string;
  badge: string;
  layupName: string;
  /** Value shown in the Start position table column */
  displayStart: number;
  startLockedTo: string;
  /** Value shown in the End position table column */
  displayEnd: number;
  endLockedTo: string;
  surface: 'upper' | 'lower' | 'transversal';
  /** First allPts index of the segment */
  segLo: number;
  /** Last allPts index of the segment */
  segHi: number;
  /** True when the transversal wraps around the trailing edge */
  wrapArc: boolean;
  color: string;
  /** Inward perpendicular offset in SVG-viewport units */
  svgOffset: number;
}

export interface TransversalEntryForCs {
  id: string;
  name: string;
  layupName: string;
  /** Signed chord position, −1..1 */
  startPos: number;
  endPos: number;
}

interface CrossSectionDialogProps {
  profile: Profile;
  transversalEntries: TransversalEntryForCs[];
  /** Display names from the parent's upper layup mapping rows (OUTER-SHELL, MID-SHELL, …). */
  layupMappingNames?: string[];
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
const NUM_PAIRS = 3;   // number of concentric sandwich pairs

// 6 unique colors: first 3 for uppers (layup0..2), last 3 for lowers (copies)
const REGULAR_COLORS = [
  '#22c55e', // layup0      – green
  '#3b82f6', // layup1      – blue
  '#f59e0b', // layup2      – amber
  '#e11d48', // layup0 copy – rose
  '#8b5cf6', // layup1 copy – violet
  '#0891b2', // layup2 copy – cyan
];
const TRANSVERSAL_COLORS = ['#64748b', '#ca8a04', '#be185d', '#14b8a6', '#ef4444'];

// ─── Component ────────────────────────────────────────────────────────────────

export function CrossSectionDialog({
  profile,
  transversalEntries,
  layupMappingNames,
  onClose,
}: CrossSectionDialogProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEscapeKey(onClose);

  const baseM = profile.maxCamber / 100;
  const baseP = Math.max(0.001, Math.min(0.999, profile.maxCamberPosition / 100));
  const baseT = profile.thickness / 100;

  // Build NACA pts and compute y bounds so the SVG scales to fit any profile
  const nacaPts = buildAllPts(baseM, baseP, baseT);
  const nacaYs = nacaPts.map(([, y]) => y);
  const yMax = Math.max(...nacaYs);
  const yMin = Math.min(...nacaYs);
  const yRange = Math.max(yMax - yMin, 1e-6);

  // Maps NACA data-space → SVG viewport, fitting the profile within PAD_Y margins
  function toSvg([x, y]: [number, number]): [number, number] {
    return [PAD_X + x * INNER_W, PAD_Y + ((yMax - y) / yRange) * INNER_H];
  }

  const svgBasePts: [number, number][] = nacaPts.map(toSvg);
  const arcFracs = computeArcFractions(svgBasePts);
  // LE perimeter fraction — for NACA 2412 this is ~0.5343 (upper surface is slightly longer)
  const leFrac = arcFracs[N];

  // Pull the first NUM_PAIRS layups from the database
  const layupData = LAYUPS.slice(0, NUM_PAIRS);

  // Upper surface entries
  const upperEntries: CsLayup[] = layupData.map((layup, i) => ({
    id: `upper-${i}`,
    badge: layupMappingNames?.[i] || `layup${i}`,
    layupName: layup.name,
    displayStart: 0,
    startLockedTo: perimeterLabel(0, leFrac),
    displayEnd: leFrac,
    endLockedTo: perimeterLabel(leFrac, leFrac),
    surface: 'upper' as const,
    segLo: 0,
    segHi: N,
    wrapArc: false,
    color: REGULAR_COLORS[i],
    svgOffset: (i + 1) * RING_OFFSET,
  }));

  // Lower surface entries (copies of upper)
  const lowerEntries: CsLayup[] = layupData.map((layup, i) => ({
    id: `lower-${i}`,
    badge: `${layupMappingNames?.[i] || `layup${i}`} copy`,
    layupName: layup.name,
    displayStart: leFrac,
    startLockedTo: perimeterLabel(leFrac, leFrac),
    displayEnd: 1,
    endLockedTo: perimeterLabel(1, leFrac),
    surface: 'lower' as const,
    segLo: N,
    segHi: 2 * N,
    wrapArc: false,
    color: REGULAR_COLORS[NUM_PAIRS + i],
    svgOffset: (i + 1) * RING_OFFSET,
  }));

  // Transversal entries (innermost)
  const transversalLayups: CsLayup[] = transversalEntries.map((entry, i) => {
    const idxA = signedToIdx(entry.startPos);
    const idxB = signedToIdx(entry.endPos);
    const lo = Math.min(idxA, idxB);
    const hi = Math.max(idxA, idxB);
    const wrap = hi - lo > N;
    return {
      id: entry.id,
      badge: entry.name || `transversal${i + 1}`,
      layupName: entry.layupName,
      displayStart: entry.startPos,
      startLockedTo: chordLabel(entry.startPos),
      displayEnd: entry.endPos,
      endLockedTo: chordLabel(entry.endPos),
      surface: 'transversal' as const,
      segLo: lo,
      segHi: hi,
      wrapArc: wrap,
      color: TRANSVERSAL_COLORS[i % TRANSVERSAL_COLORS.length],
      svgOffset: (NUM_PAIRS + 1 + i) * RING_OFFSET,
    };
  });

  // Table order: uppers (layup0,1,2), lowers (copies), transversals
  const tableLayups = [...upperEntries, ...lowerEntries, ...transversalLayups];

  // Render order: outermost ring first (underneath), innermost last (on top)
  const renderLayups = [...tableLayups].sort((a, b) => a.svgOffset - b.svgOffset);

  // Pre-compute offset SVG points per unique svgOffset
  const svgOffsetCache = new Map<number, [number, number][]>();
  for (const entry of tableLayups) {
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
          <h2 className="text-[18px] font-semibold text-[#0a0a0a]">{profile.name}</h2>
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
            {renderLayups.map((entry) => {
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
              {tableLayups.map((entry) => {
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
