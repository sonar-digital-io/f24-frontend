import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  computeProfilesBoundingRect,
  computeTicks,
  dataToPx,
  decimalsForStep,
  interpolateEdgeY,
  niceStep,
  PAD_BOTTOM,
  PAD_LEFT,
  PAD_RIGHT,
  PAD_TOP,
  VB_HEIGHT,
  VB_WIDTH,
} from '@/lib/bezierMath';
import { chordFractionForLocalX, pointAtArcFraction } from '@/lib/profileGeometry';
import type { GeometryProfile, GeometryTopView } from '@/api/types/geometry';
import type { SparDraft } from '@/hooks/useSparsState';

interface SparsPreviewPanelProps {
  topView: GeometryTopView | undefined;
  isLoading: boolean;
  isError: boolean;
  profiles: GeometryProfile[];
  spars: SparDraft[];
  /** Raw contour points per profile id (GET /geometry/:id/profiles/:profileId/)
   *  for whichever profiles are actually referenced by a spar — needed to
   *  turn a spar's arc-length position into a real chordwise location. */
  profilePointsById: Map<number, [number, number][]>;
  /** Profiles belonging to the currently expanded spar row — drawn highlighted. */
  highlightProfileIds?: number[];
  noTwist: boolean;
  onNoTwistChange: (v: boolean) => void;
  parallel: boolean;
  onParallelChange: (v: boolean) => void;
}

const LEGEND: { label: string; color: string }[] = [
  { label: 'Axis location', color: '#2563eb' },
  { label: 'Leading edge', color: '#16a34a' },
  { label: 'Trailing edge', color: '#f59e0b' },
  { label: 'Profiles', color: '#0a0a0a' },
  { label: 'Spars', color: '#dc2626' },
];

/**
 * Spanwise preview built from GET /geometry/:id/top-view/ (leading/trailing
 * edge) plus GET /geometry/:id/profiles/ (profile positions) — traces both
 * edges across the span, a vertical tick per profile, the stacking axis at
 * x=0, and every spar's upper/lower lines between its start/end profiles.
 */
export function SparsPreviewPanel({
  topView,
  isLoading,
  isError,
  profiles,
  spars,
  profilePointsById,
  highlightProfileIds,
  noTwist,
  onNoTwistChange,
  parallel,
  onParallelChange,
}: SparsPreviewPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showTics, setShowTics] = useState(true);

  const leadingEdge = (topView?.leading_edge ?? []).map(([x, y]) => ({ x, y }));
  const trailingEdge = (topView?.trailing_edge ?? []).map(([x, y]) => ({ x, y }));
  const nominalRadius = topView?.nominal_radius || 1;
  // Independent x/y padding (unlike computeMappingBounds, whose transversal
  // padding formula is tied to the longitudinal range) — a spar's upper/lower
  // separation is a fraction of the actual chord depth, so squeezing that
  // into an oversized transversal domain was making it invisible.
  const bounds = computeProfilesBoundingRect([leadingEdge, trailingEdge]);
  const xStep = niceStep(bounds.longitudinalMax - bounds.longitudinalMin);
  const yStep = niceStep(bounds.transversalMax - bounds.transversalMin);
  const xTicks = computeTicks(bounds.longitudinalMin, bounds.longitudinalMax, xStep);
  const yTicks = computeTicks(bounds.transversalMin, bounds.transversalMax, yStep);
  const xDecimals = decimalsForStep(xStep);

  function toPx(x: number, y: number) {
    return dataToPx(
      { x, y },
      bounds.longitudinalMin,
      bounds.longitudinalMax,
      bounds.transversalMin,
      bounds.transversalMax,
    );
  }

  function toPath(points: { x: number; y: number }[]) {
    return points
      .map((p) => toPx(p.x, p.y))
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`)
      .join(' ');
  }

  // Stacking axis is always at longitudinal position 0, spanning the chart's
  // full transversal range — not necessarily the root profile's position.
  const axisTop = toPx(0, bounds.transversalMax);
  const axisBottom = toPx(0, bounds.transversalMin);

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  // A spar position is an arc-length fraction along the profile's own
  // contour (see lib/profileGeometry.ts) — resolve it to a local chordwise
  // point, then re-express that chordwise fraction against THIS profile's
  // real leading/trailing edge (from top-view) to get its canvas position.
  function sparPointOnCanvas(profile: GeometryProfile, positionFraction: number | null) {
    if (positionFraction == null) return null;
    const localPoints = profilePointsById.get(profile.id);
    if (!localPoints) return null;
    const local = pointAtArcFraction(localPoints, positionFraction);
    const chordFraction = chordFractionForLocalX(localPoints, local.x);
    const x = profile.position * nominalRadius;
    const leadY = interpolateEdgeY(leadingEdge, x);
    const trailY = interpolateEdgeY(trailingEdge, x);
    return { x, y: leadY + chordFraction * (trailY - leadY) };
  }

  const sparLines = spars.flatMap((spar) => {
    const startProfile = spar.startProfileId != null ? profileById.get(spar.startProfileId) : undefined;
    const endProfile = spar.endProfileId != null ? profileById.get(spar.endProfileId) : undefined;
    if (!startProfile || !endProfile) return [];
    const upperStart = sparPointOnCanvas(startProfile, spar.startUpper);
    const lowerStart = sparPointOnCanvas(startProfile, spar.startLower);
    const upperEnd = sparPointOnCanvas(endProfile, spar.endUpper);
    const lowerEnd = sparPointOnCanvas(endProfile, spar.endLower);
    if (!upperStart || !lowerStart || !upperEnd || !lowerEnd) return [];
    return [
      { key: `${spar.localId}-upper`, a: toPx(upperStart.x, upperStart.y), b: toPx(upperEnd.x, upperEnd.y) },
      { key: `${spar.localId}-lower`, a: toPx(lowerStart.x, lowerStart.y), b: toPx(lowerEnd.x, lowerEnd.y) },
    ];
  });

  return (
    <div className="flex w-full flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white/95 p-4 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-[14px] font-medium text-[#0a0a0a]">Preview</span>
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#6b7280]">
          <span>[ Legend:</span>
          {LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
              {l.label}
            </span>
          ))}
          <span>]</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? 'Collapse preview' : 'Expand preview'}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-[#6b7280] hover:bg-[#f1f5f9]"
        >
          {expanded ? <ChevronUp className="h-4 w-4" strokeWidth={2} /> : <ChevronDown className="h-4 w-4" strokeWidth={2} />}
        </button>
      </div>

      {expanded && (
        <>
          {isLoading && <p className="text-[13px] text-[#6b7280]">Loading top view…</p>}
          {isError && <p className="text-[13px] text-[#dc2626]">Failed to load top view.</p>}
          {!isLoading && !isError && (
            <svg viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`} className="h-[220px] w-full" aria-label="Spars preview">
              {showGrid &&
                xTicks.map((v) => {
                  const { cx } = toPx(v, bounds.transversalMin);
                  return (
                    <line
                      key={`gx${v}`}
                      x1={cx}
                      y1={PAD_TOP}
                      x2={cx}
                      y2={VB_HEIGHT - PAD_BOTTOM}
                      stroke="#f1f5f9"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              {showGrid &&
                yTicks.map((v) => {
                  const { cy } = toPx(bounds.longitudinalMin, v);
                  return (
                    <line
                      key={`gy${v}`}
                      x1={PAD_LEFT}
                      y1={cy}
                      x2={VB_WIDTH - PAD_RIGHT}
                      y2={cy}
                      stroke="#f1f5f9"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}

              <path d={toPath(leadingEdge)} fill="none" stroke="#16a34a" strokeWidth={2} vectorEffect="non-scaling-stroke" />
              <path d={toPath(trailingEdge)} fill="none" stroke="#f59e0b" strokeWidth={2} vectorEffect="non-scaling-stroke" />

              {profiles.map((p) => {
                const x = p.position * nominalRadius;
                const a = toPx(x, interpolateEdgeY(leadingEdge, x));
                const b = toPx(x, interpolateEdgeY(trailingEdge, x));
                const highlighted = highlightProfileIds?.includes(p.id);
                return (
                  <line
                    key={p.id}
                    x1={a.cx}
                    y1={a.cy}
                    x2={b.cx}
                    y2={b.cy}
                    stroke={highlighted ? '#2563eb' : '#0a0a0a'}
                    strokeWidth={highlighted ? 2.5 : 1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              {sparLines.map(({ key, a, b }) => (
                <line
                  key={key}
                  x1={a.cx}
                  y1={a.cy}
                  x2={b.cx}
                  y2={b.cy}
                  stroke="#dc2626"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              <line
                x1={axisTop.cx}
                y1={axisTop.cy}
                x2={axisBottom.cx}
                y2={axisBottom.cy}
                stroke="#2563eb"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />

              {showTics &&
                xTicks.map((v) => {
                  const { cx } = toPx(v, bounds.transversalMin);
                  return (
                    <text key={`tx${v}`} x={cx - 9} y={VB_HEIGHT - PAD_BOTTOM + 14} fontSize="9" fill="#6b7280">
                      {v.toFixed(xDecimals)}
                    </text>
                  );
                })}
            </svg>
          )}

          <div className="flex flex-wrap items-center gap-5">
            {[
              { id: 'spars-no-twist', label: 'No twist', checked: noTwist, onChange: onNoTwistChange },
              { id: 'spars-parallel', label: 'Parallel', checked: parallel, onChange: onParallelChange },
              { id: 'spars-grid', label: 'Grid', checked: showGrid, onChange: setShowGrid },
              { id: 'spars-tics', label: 'Tics', checked: showTics, onChange: setShowTics },
            ].map((opt) => (
              <div key={opt.id} className="flex items-center gap-1.5">
                <Checkbox
                  id={opt.id}
                  checked={opt.checked}
                  onCheckedChange={(c) => opt.onChange(Boolean(c))}
                  className="size-4 rounded border-[#e2e8f0]"
                />
                <Label htmlFor={opt.id} className="cursor-pointer text-[13px] font-medium text-[#0a0a0a]">
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
