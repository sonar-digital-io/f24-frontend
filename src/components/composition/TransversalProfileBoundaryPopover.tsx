import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SelectField } from '@/components/composition/SelectField';
import { useChartZoomPan } from '@/hooks/useChartZoomPan';
import { usePointerDrag } from '@/hooks/usePointerDrag';
import { ChartZoomControls } from '@/components/common/viewer/ChartZoomControls';
import { ChartBackgroundRect } from '@/components/common/viewer/ChartBackgroundRect';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { dataToPx, pxToData } from '@/lib/bezierMath';
import { arcFractionNearestTo, pointAtArcFraction, profileDomainFromPoints } from '@/lib/profileGeometry';
import type { ControlPoint } from '@/types';
import type { ProfileBoundary } from '@/components/composition/TransversalMappingRow';

const UNLOCKED = 'unlocked';
const RING_COLORS = ['#0d9488', '#ca8a04', '#dc2626', '#2563eb', '#c026d3'];
const ARC_STEPS = 48;

function arcSegment(points: [number, number][], startFrac: number, endFrac: number): ControlPoint[] {
  const span = endFrac >= startFrac ? endFrac - startFrac : 1 - startFrac + endFrac;
  const out: ControlPoint[] = [];
  for (let i = 0; i <= ARC_STEPS; i++) {
    const t = startFrac + (span * i) / ARC_STEPS;
    out.push(pointAtArcFraction(points, t > 1 ? t - 1 : t));
  }
  return out;
}

function parsePosition(raw: string): number | null {
  if (raw === '') return null;
  const v = parseFloat(raw);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : null;
}

export interface OtherRing {
  startFrac: number;
  endFrac: number;
}

interface TransversalProfileBoundaryPopoverProps {
  profileName: string;
  points: [number, number][] | undefined;
  boundary: ProfileBoundary;
  lockOptions: { value: string; label: string }[];
  otherRings: OtherRing[];
  onChange: (patch: Partial<ProfileBoundary>) => void;
  onClose: () => void;
}

/**
 * One profile's own boundary editor for a transversal mapping — the profile's
 * real cross-section outline, draggable start/end handles on it (both free to
 * move around the whole closed contour), and the numeric position + locked-to
 * fields the drag keeps in sync with. "Show all layups" overlays every other
 * mapping that also has its start or end on this same profile, for context.
 */
export function TransversalProfileBoundaryPopover({
  profileName,
  points,
  boundary,
  lockOptions,
  otherRings,
  onChange,
  onClose,
}: TransversalProfileBoundaryPopoverProps) {
  useEscapeKey(onClose);
  const svgRef = useRef<SVGSVGElement>(null);
  const { dragging, startDrag, endDrag } = usePointerDrag<'start' | 'end'>();
  const [showAllLayups, setShowAllLayups] = useState(false);
  const {
    zoom,
    viewX,
    viewY,
    viewW,
    viewH,
    panningPointerId,
    screenToViewBox,
    resetView,
    bgPointerHandlers,
    zoomControlProps,
  } = useChartZoomPan(svgRef);

  const pts = points ?? [];
  const { domainXMin, domainXMax, domainYMin, domainYMax } = profileDomainFromPoints(pts);

  function toPx(p: ControlPoint) {
    return dataToPx(p, domainXMin, domainXMax, domainYMin, domainYMax);
  }
  function pathFor(segment: ControlPoint[], close: boolean) {
    if (!segment.length) return '';
    return (
      segment.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toPx(p).cx.toFixed(1)} ${toPx(p).cy.toFixed(1)}`).join(' ') +
      (close ? ' Z' : '')
    );
  }

  const outlinePath = pts.length ? pathFor(pts.map(([x, y]) => ({ x, y })), true) : '';
  const startHandle = boundary.startPosition != null && pts.length ? toPx(pointAtArcFraction(pts, boundary.startPosition)) : null;
  const endHandle = boundary.endPosition != null && pts.length ? toPx(pointAtArcFraction(pts, boundary.endPosition)) : null;
  const highlightPath =
    boundary.startPosition != null && boundary.endPosition != null && pts.length
      ? pathFor(arcSegment(pts, boundary.startPosition, boundary.endPosition), false)
      : '';

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || !pts.length) return;
    const local = screenToViewBox(e.clientX, e.clientY);
    if (!local) return;
    const data = pxToData(local.x, local.y, domainXMin, domainXMax, domainYMin, domainYMax);
    const t = arcFractionNearestTo(pts, data);
    if (dragging === 'start') onChange({ startPosition: t });
    else onChange({ endPosition: t });
  }

  return (
    <div className="flex w-[560px] flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[16px] font-semibold leading-6 text-[#0a0a0a]">{profileName}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="relative h-[220px] w-full rounded-md border border-[#e5e7eb] bg-white">
        <ChartZoomControls {...zoomControlProps} />
        {pts.length ? (
          <svg
            ref={svgRef}
            viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
            className="h-full w-full touch-none"
            aria-label="Profile cross-section"
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <ChartBackgroundRect
              viewX={viewX}
              viewY={viewY}
              viewW={viewW}
              viewH={viewH}
              zoom={zoom}
              panningPointerId={panningPointerId}
              bgPointerHandlers={bgPointerHandlers}
              onDoubleClick={resetView}
            />
            <path d={outlinePath} fill="none" stroke="#0a0a0a" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />

            {showAllLayups &&
              otherRings.map((ring, i) => (
                <path
                  key={i}
                  d={pathFor(arcSegment(pts, ring.startFrac, ring.endFrac), false)}
                  fill="none"
                  stroke={RING_COLORS[i % RING_COLORS.length]}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

            {highlightPath && (
              <path d={highlightPath} fill="none" stroke="#9333ea" strokeWidth={3} vectorEffect="non-scaling-stroke" />
            )}
            {startHandle && (
              <circle
                cx={startHandle.cx}
                cy={startHandle.cy}
                r={7}
                fill="#9333ea"
                stroke="#6b21a8"
                className="cursor-grab"
                onPointerDown={(e) => startDrag('start', e)}
              />
            )}
            {endHandle && (
              <circle
                cx={endHandle.cx}
                cy={endHandle.cy}
                r={7}
                fill="#9333ea"
                stroke="#6b21a8"
                className="cursor-grab"
                onPointerDown={(e) => startDrag('end', e)}
              />
            )}
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-[#6b7280]">Loading profile…</div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-[12px] font-medium text-[#0a0a0a]">Start position</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={boundary.startPosition ?? ''}
            onChange={(e) => onChange({ startPosition: parsePosition(e.target.value) })}
            placeholder="0.00"
            className="h-9 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[12px] font-medium text-[#0a0a0a]">Start locked to</Label>
          <SelectField
            value={boundary.startLockedTo != null ? String(boundary.startLockedTo) : UNLOCKED}
            onChange={(v) => onChange({ startLockedTo: v === UNLOCKED ? null : Number(v) })}
            options={lockOptions}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[12px] font-medium text-[#0a0a0a]">End position</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={boundary.endPosition ?? ''}
            onChange={(e) => onChange({ endPosition: parsePosition(e.target.value) })}
            placeholder="0.00"
            className="h-9 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[12px] font-medium text-[#0a0a0a]">End locked to</Label>
          <SelectField
            value={boundary.endLockedTo != null ? String(boundary.endLockedTo) : UNLOCKED}
            onChange={(v) => onChange({ endLockedTo: v === UNLOCKED ? null : Number(v) })}
            options={lockOptions}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-[13px] text-[#0a0a0a]">
        <Checkbox checked={showAllLayups} onCheckedChange={setShowAllLayups} />
        Show all layups
      </label>
    </div>
  );
}
