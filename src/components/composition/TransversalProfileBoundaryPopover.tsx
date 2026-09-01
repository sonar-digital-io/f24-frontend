import { useRef } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/composition/SelectField';
import { usePointerDrag } from '@/hooks/usePointerDrag';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  PROFILE_VIEWBOX,
  computeFitTransform,
  applyFitTransform,
  invertFitTransform,
} from '@/lib/crossSectionGeometry';
import { arcFractionNearestTo, pointAtArcFraction } from '@/lib/profileGeometry';
import type { ProfileBoundary } from '@/components/composition/TransversalMappingRow';

const UNLOCKED = 'unlocked';
const ARC_STEPS = 48;

const { width: VB_W, height: VB_H, padX: PAD_X, padY: PAD_Y } = PROFILE_VIEWBOX;
const INNER_W = VB_W - 2 * PAD_X;
const INNER_H = VB_H - 2 * PAD_Y;

function arcSegment(
  points: [number, number][],
  startFrac: number,
  endFrac: number,
): [number, number][] {
  const span = endFrac >= startFrac ? endFrac - startFrac : 1 - startFrac + endFrac;
  const out: [number, number][] = [];
  for (let i = 0; i <= ARC_STEPS; i++) {
    const t = startFrac + (span * i) / ARC_STEPS;
    const p = pointAtArcFraction(points, t > 1 ? t - 1 : t);
    out.push([p.x, p.y]);
  }
  return out;
}

function parsePosition(raw: string): number | null {
  if (raw === '') return null;
  const v = parseFloat(raw);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : null;
}

interface TransversalProfileBoundaryPopoverProps {
  profileName: string;
  points: [number, number][] | undefined;
  boundary: ProfileBoundary;
  lockOptions: { value: string; label: string }[];
  onChange: (patch: Partial<ProfileBoundary>) => void;
  onClose: () => void;
}

/**
 * One profile's own boundary editor for a transversal mapping — the profile's
 * real cross-section outline, draggable start/end handles on it (both free to
 * move around the whole closed contour), and the numeric position + locked-to
 * fields the drag keeps in sync with. Uses the same fixed viewBox/fit as
 * `CrossSectionDialog` so a profile renders at the same size and scale in both.
 */
export function TransversalProfileBoundaryPopover({
  profileName,
  points,
  boundary,
  lockOptions,
  onChange,
  onClose,
}: TransversalProfileBoundaryPopoverProps) {
  useEscapeKey(onClose);
  useBodyScrollLock(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const { dragging, startDrag, endDrag } = usePointerDrag<'start' | 'end'>();

  const pts = points ?? [];
  const transform = computeFitTransform(pts, INNER_W, INNER_H, PAD_X, PAD_Y);

  function toPx(p: [number, number]) {
    const [cx, cy] = applyFitTransform(p, transform);
    return { cx, cy };
  }
  function pathFor(segment: [number, number][], close: boolean) {
    if (!segment.length) return '';
    return (
      segment
        .map((p, i) => {
          const { cx, cy } = toPx(p);
          return `${i === 0 ? 'M' : 'L'} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
        })
        .join(' ') + (close ? ' Z' : '')
    );
  }
  /** Handle position (SVG px) at a boundary fraction, or null if there's no
   *  position yet or the profile outline hasn't loaded. */
  function handleAt(fraction: number | null) {
    if (fraction == null || !pts.length) return null;
    const p = pointAtArcFraction(pts, fraction);
    return toPx([p.x, p.y]);
  }

  const outlinePath = pts.length ? pathFor(pts, true) : '';
  const startHandle = handleAt(boundary.startPosition);
  const endHandle = handleAt(boundary.endPosition);
  const highlightPath =
    boundary.startPosition != null && boundary.endPosition != null && pts.length
      ? pathFor(arcSegment(pts, boundary.startPosition, boundary.endPosition), false)
      : '';

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || !pts.length) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    const [x, y] = invertFitTransform(local.x, local.y, transform);
    const t = arcFractionNearestTo(pts, { x, y });
    if (dragging === 'start') onChange({ startPosition: t });
    else onChange({ endPosition: t });
  }

  return (
    <div className="flex max-h-[90vh] w-[900px] max-w-[95vw] flex-col gap-3 overflow-y-auto rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between gap-2">
        <h3
          id="boundary-editor-title"
          className="text-[16px] font-semibold leading-6 text-[#0a0a0a]"
        >
          {profileName}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="h-[180px] w-full rounded-md border border-[#e5e7eb] bg-white">
        {pts.length ? (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="h-full w-full touch-none"
            aria-label="Profile cross-section"
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <path
              d={outlinePath}
              fill="none"
              stroke="#0a0a0a"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />

            {highlightPath && (
              <path
                d={highlightPath}
                fill="none"
                stroke="#9333ea"
                strokeWidth={3}
                vectorEffect="non-scaling-stroke"
              />
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
          <div className="flex h-full items-center justify-center text-[13px] text-[#6b7280]">
            Loading profile…
          </div>
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
    </div>
  );
}
