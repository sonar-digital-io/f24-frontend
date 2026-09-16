import { useRef, useState } from 'react';
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
import { arcFractionNearestTo, pointAtArcFraction, sideOfPosition } from '@/lib/profileGeometry';
import { round6 } from '@/lib/bezierMath';
import type { ProfileBoundary } from '@/components/composition/TransversalMappingRow';

const UNLOCKED = 'unlocked';
const ARC_STEPS = 48;
/** Must match the Start/End position `<Input step="...">` below. */
const INPUT_STEP = 0.01;

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
  return Number.isFinite(v) ? round6(Math.max(0, Math.min(1, v))) : null;
}

interface TransversalProfileBoundaryPopoverProps {
  profileName: string;
  points: [number, number][] | undefined;
  boundary: ProfileBoundary;
  /** `position` is this profile's own arc-fraction for that landmark — null
   *  for "Unlocked". Used to validate a lock choice the same way a dragged/
   *  typed position is (see `handleLockChange`) before applying it. */
  lockOptions: { value: string; label: string; position: number | null }[];
  /** This profile's own trailing/leading edge positions (0 or 2 entries) —
   *  the real border between its upper and lower surface. Empty when the
   *  profile's edge intersections haven't loaded yet, in which case the side
   *  check below is skipped rather than blocking on incomplete data. */
  edgePositions: number[];
  /** Every OTHER profile this same mapping covers, with its own resolved
   *  start/end position and its own edge positions — a start (or, separately,
   *  end) edit here is rejected if it would put this profile on a different
   *  side than any of these. Start and end are NOT compared against each
   *  other — a mapping normally spans from the upper to the lower surface of
   *  the SAME profile, that's expected. */
  otherProfiles: { startPosition: number | null; endPosition: number | null; edgePositions: number[] }[];
  /** Same color this mapping is drawn in everywhere else (the Cross-section
   *  dialog's rings, the 3D preview) — the highlight arc and drag handles use
   *  it too, so editing a mapping never shows it in a different color than
   *  the rest of the app does. */
  color: string;
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
  edgePositions,
  otherProfiles,
  color,
  onChange,
  onClose,
}: TransversalProfileBoundaryPopoverProps) {
  useEscapeKey(onClose);
  useBodyScrollLock(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const { dragging, startDrag, endDrag } = usePointerDrag<'start' | 'end'>();
  // Buffers the position inputs' raw text while typing — validated (range,
  // start<end, cross-profile side) only on blur, so an in-progress value (a
  // lone "0." while typing "0.5") isn't rejected keystroke by keystroke.
  const [editingValues, setEditingValues] = useState<Partial<Record<'start' | 'end', string>>>({});
  // Why the last blur reverted a field's typed value — cleared as soon as
  // the user focuses that field again. Surfaced as a red border + message so
  // a rejected/clamped value isn't a silent no-op from the user's side.
  const [invalidFields, setInvalidFields] = useState<Partial<Record<'start' | 'end', string>>>({});

  /** Whether a new start (or end) value `v` for THIS profile stays on the
   *  same side as every other covered profile's own start (or end) — using
   *  each profile's own real edges, not this profile's. True (never blocks)
   *  if this profile's own edges, or a given other profile's, aren't known. */
  function sameSideAsOtherProfiles(field: 'start' | 'end', v: number): boolean {
    if (edgePositions.length !== 2) return true;
    const mySide = sideOfPosition(v, edgePositions[0], edgePositions[1]);
    return otherProfiles.every((p) => {
      const other = field === 'start' ? p.startPosition : p.endPosition;
      if (other == null || p.edgePositions.length !== 2) return true;
      return sideOfPosition(other, p.edgePositions[0], p.edgePositions[1]) === mySide;
    });
  }

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
    // Locked to a landmark (an edge or another mapping's boundary) — its
    // position is that landmark's own, not independently draggable.
    if (dragging === 'start' ? boundary.startLockedTo != null : boundary.endLockedTo != null) return;
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
    // Must stay on the same side (upper/lower) as every other covered
    // profile's own start (end respectively) — a drag past that limit just
    // stops moving there instead of crossing over it. Surfaced the same way a
    // rejected typed value is (red border + message) — silently refusing to
    // move with no feedback read as the editor being broken/unresponsive
    // rather than as a real boundary. Start/end are not required to stay in a
    // fixed order — the arc between them can wrap through the 0/1 seam (see
    // arcSegment/buildArcPoints).
    const field = dragging;
    if (!sameSideAsOtherProfiles(field, t)) {
      const message = 'Would put this profile on a different side than the mapping’s other profiles.';
      setInvalidFields((v) => (v[field] === message ? v : { ...v, [field]: message }));
      return;
    }
    setInvalidFields((v) => (v[field] === undefined ? v : { ...v, [field]: undefined }));
    if (field === 'start') {
      onChange({ startPosition: round6(t) });
    } else {
      onChange({ endPosition: round6(t) });
    }
  }

  function getInputValue(field: 'start' | 'end'): string {
    if (editingValues[field] !== undefined) return editingValues[field]!;
    const v = field === 'start' ? boundary.startPosition : boundary.endPosition;
    return v != null ? v.toFixed(6) : '';
  }

  /** Validates and, if valid, commits a typed/stepped raw value for `field` —
   *  shared by the step-button/arrow-key live commit below and the on-blur
   *  commit, so both apply the exact same rules. Leaves `editingValues`
   *  alone; callers decide when the buffer itself is cleared. */
  function tryCommit(field: 'start' | 'end', raw: string) {
    if (raw.trim() === '') {
      // Emptying the field is a deliberate way to clear this profile's own
      // explicit override, so it goes back to being interpolated between its
      // covered neighbors — not an invalid value.
      setInvalidFields((v) => (v[field] === undefined ? v : { ...v, [field]: undefined }));
      onChange(field === 'start' ? { startPosition: null } : { endPosition: null });
      return;
    }
    const parsed = parsePosition(raw);
    if (parsed == null) {
      setInvalidFields((v) => ({ ...v, [field]: 'Enter a number between 0 and 1.' }));
      return;
    }
    // Must stay on the same side (upper/lower) as every other covered
    // profile's own start (end respectively) — an invalid value is dropped,
    // reverting the field to its last valid one, with a message explaining
    // why. Start/end are not required to stay in a fixed order — the arc
    // between them can wrap through the 0/1 seam.
    if (!sameSideAsOtherProfiles(field, parsed)) {
      setInvalidFields((v) => ({
        ...v,
        [field]: 'Would put this profile on a different side than the mapping’s other profiles.',
      }));
      return;
    }
    setInvalidFields((v) => (v[field] === undefined ? v : { ...v, [field]: undefined }));
    onChange(field === 'start' ? { startPosition: parsed } : { endPosition: parsed });
  }

  function handleInputChange(field: 'start' | 'end', raw: string) {
    // The number input's spin buttons (and the Up/Down arrow keys while it's
    // focused) step the value by exactly INPUT_STEP without any keystroke —
    // move the point live for those instead of waiting for blur, same as
    // dragging the handle does. Free typing (any other delta) still only
    // buffers here and commits on blur, so a value mid-edit isn't rejected
    // keystroke by keystroke.
    const prev = getInputValue(field);
    setEditingValues((v) => ({ ...v, [field]: raw }));
    const prevNum = parseFloat(prev);
    const nextNum = parseFloat(raw);
    if (
      Number.isFinite(prevNum) &&
      Number.isFinite(nextNum) &&
      Math.abs(Math.abs(nextNum - prevNum) - INPUT_STEP) < 1e-6
    ) {
      tryCommit(field, raw);
    }
  }

  function handleInputFocus(field: 'start' | 'end') {
    setInvalidFields((v) => (v[field] === undefined ? v : { ...v, [field]: undefined }));
  }

  function handleInputBlur(field: 'start' | 'end') {
    const raw = editingValues[field];
    setEditingValues((v) => {
      if (v[field] === undefined) return v;
      const next = { ...v };
      delete next[field];
      return next;
    });
    if (raw === undefined) return;
    tryCommit(field, raw);
  }

  /** Locking to a landmark bypassed `sameSideAsOtherProfiles` entirely — unlike
   *  a dragged/typed position, so an incompatible lock choice was silently
   *  accepted here and only surfaced later as a save-time "not on the same
   *  side" error. Validates it the same way before applying it. */
  function handleLockChange(field: 'start' | 'end', raw: string) {
    if (raw === UNLOCKED) {
      setInvalidFields((v) => (v[field] === undefined ? v : { ...v, [field]: undefined }));
      onChange(field === 'start' ? { startLockedTo: null } : { endLockedTo: null });
      return;
    }
    const position = lockOptions.find((o) => o.value === raw)?.position;
    if (position != null && !sameSideAsOtherProfiles(field, position)) {
      setInvalidFields((v) => ({
        ...v,
        [field]: 'Would put this profile on a different side than the mapping’s other profiles.',
      }));
      return;
    }
    setInvalidFields((v) => (v[field] === undefined ? v : { ...v, [field]: undefined }));
    onChange(field === 'start' ? { startLockedTo: Number(raw) } : { endLockedTo: Number(raw) });
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
                stroke={color}
                strokeWidth={3}
                vectorEffect="non-scaling-stroke"
              />
            )}
            {startHandle && (
              <circle
                cx={startHandle.cx}
                cy={startHandle.cy}
                r={7}
                fill={color}
                stroke="#1f2937"
                className={boundary.startLockedTo != null ? 'cursor-not-allowed' : 'cursor-grab'}
                onPointerDown={(e) => boundary.startLockedTo == null && startDrag('start', e)}
              />
            )}
            {endHandle && (
              <circle
                cx={endHandle.cx}
                cy={endHandle.cy}
                r={7}
                fill={color}
                stroke="#1f2937"
                className={boundary.endLockedTo != null ? 'cursor-not-allowed' : 'cursor-grab'}
                onPointerDown={(e) => boundary.endLockedTo == null && startDrag('end', e)}
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
            value={getInputValue('start')}
            onChange={(e) => handleInputChange('start', e.target.value)}
            onFocus={() => handleInputFocus('start')}
            onBlur={() => handleInputBlur('start')}
            disabled={boundary.startLockedTo != null}
            placeholder="0.00"
            aria-invalid={invalidFields.start != null}
            title={invalidFields.start}
            className={`h-9 rounded-md px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:cursor-not-allowed disabled:opacity-60 ${
              invalidFields.start ? 'border-[#dc2626] focus-visible:ring-[#dc2626]' : 'border-[#e2e8f0]'
            }`}
          />
          {invalidFields.start && (
            <p className="text-[12px] leading-4 text-[#dc2626]">{invalidFields.start}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[12px] font-medium text-[#0a0a0a]">Start locked to</Label>
          <SelectField
            value={boundary.startLockedTo != null ? String(boundary.startLockedTo) : UNLOCKED}
            onChange={(v) => handleLockChange('start', v)}
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
            value={getInputValue('end')}
            onChange={(e) => handleInputChange('end', e.target.value)}
            onFocus={() => handleInputFocus('end')}
            onBlur={() => handleInputBlur('end')}
            disabled={boundary.endLockedTo != null}
            placeholder="0.00"
            aria-invalid={invalidFields.end != null}
            title={invalidFields.end}
            className={`h-9 rounded-md px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:cursor-not-allowed disabled:opacity-60 ${
              invalidFields.end ? 'border-[#dc2626] focus-visible:ring-[#dc2626]' : 'border-[#e2e8f0]'
            }`}
          />
          {invalidFields.end && <p className="text-[12px] leading-4 text-[#dc2626]">{invalidFields.end}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[12px] font-medium text-[#0a0a0a]">End locked to</Label>
          <SelectField
            value={boundary.endLockedTo != null ? String(boundary.endLockedTo) : UNLOCKED}
            onChange={(v) => handleLockChange('end', v)}
            options={lockOptions}
          />
        </div>
      </div>
    </div>
  );
}
