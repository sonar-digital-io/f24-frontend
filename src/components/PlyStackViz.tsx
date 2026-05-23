/**
 * Isometric schematic of the layup stack. Each ply is drawn as a parallelogram
 * (rhombus, ~30° iso) with fiber orientation lines clipped to that shape.
 *
 * Colors and ordering MUST match the table on the left — the same `plies`
 * array is rendered in both places.
 */

import type { Ply } from '@/components/LayupBuilder';

interface PlyStackVizProps {
  plies: Ply[]; // top of stack = index 0, drawn on top of the viz
  className?: string;
}

// Geometry of a single ply in viewBox units
const PLY_W = 360; // horizontal extent of the rhombus
const PLY_H = 180; // vertical extent (top-to-bottom of the rhombus diamond shape)
const Y_STEP = 60; // vertical distance between consecutive plies (parallel offset)
const PAD_X = 60;
const PAD_Y = 30;

/** 4 corners of the rhombus for a ply at given vertical offset (in viewBox y). */
function rhombusPath(yOffset: number): string {
  // Diamond shape: top, right, bottom, left
  const top = `${PAD_X + PLY_W / 2},${PAD_Y + yOffset}`;
  const right = `${PAD_X + PLY_W},${PAD_Y + yOffset + PLY_H / 2}`;
  const bottom = `${PAD_X + PLY_W / 2},${PAD_Y + yOffset + PLY_H}`;
  const left = `${PAD_X},${PAD_Y + yOffset + PLY_H / 2}`;
  return `M ${top} L ${right} L ${bottom} L ${left} Z`;
}

/** Generate fiber direction lines clipped to a single ply's rhombus shape.
 *  Orientation in degrees, measured along the long axis of the rhombus.
 *  0°  → lines parallel to the rhombus' top-right edge (down-right slope)
 *  45° → lines parallel to the horizontal mid-line (rectangle in iso)
 *  90° → lines parallel to the rhombus' top-left edge (down-left slope)
 *  Other angles interpolate between these. */
function fiberLines(yOffset: number, orientation: number): string[] {
  // We rotate a reference angle: 0° is "down-right" direction in iso.
  // Convert blade orientation (0..180°) to an iso vector angle.
  // Mapping: 0° -> 30° in screen space (top edge slope)
  //          45° -> 90° (horizontal in viewBox terms)
  //          90° -> 150° (top-left slope mirror)
  const screenAngleDeg = 30 + (orientation / 90) * 120;
  const a = (screenAngleDeg * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  // Perpendicular spacing direction
  const px = -dy;
  const py = dx;

  // Center of the ply
  const cx = PAD_X + PLY_W / 2;
  const cy = PAD_Y + yOffset + PLY_H / 2;

  // Number of lines to draw: enough to cover the diagonal of the rhombus
  const maxOffset = (PLY_W + PLY_H) / 2;
  const spacing = 14;
  const count = Math.floor((2 * maxOffset) / spacing);

  const lines: string[] = [];
  for (let i = -count / 2; i <= count / 2; i++) {
    const offset = i * spacing;
    const x0 = cx + px * offset - dx * maxOffset;
    const y0 = cy + py * offset - dy * maxOffset;
    const x1 = cx + px * offset + dx * maxOffset;
    const y1 = cy + py * offset + dy * maxOffset;
    lines.push(`M ${x0.toFixed(1)},${y0.toFixed(1)} L ${x1.toFixed(1)},${y1.toFixed(1)}`);
  }
  return lines;
}

export function PlyStackViz({ plies, className }: PlyStackVizProps) {
  // Total view dimensions
  const totalY = PLY_H + (plies.length - 1) * Y_STEP + 2 * PAD_Y;
  const totalX = PLY_W + 2 * PAD_X;

  return (
    <svg
      viewBox={`0 0 ${totalX} ${totalY}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Layup ply stack visualization"
    >
      <defs>
        {plies.map((ply, idx) => {
          const yOffset = idx * Y_STEP;
          return (
            <clipPath key={ply.id} id={`ply-clip-${ply.id}`}>
              <path d={rhombusPath(yOffset)} />
            </clipPath>
          );
        })}
      </defs>

      {plies.map((ply, idx) => {
        const yOffset = idx * Y_STEP;
        const lines = fiberLines(yOffset, ply.orientation);
        return (
          <g key={ply.id}>
            {/* Filled rhombus */}
            <path
              d={rhombusPath(yOffset)}
              fill={ply.color}
              fillOpacity="0.18"
              stroke={ply.color}
              strokeWidth="2.5"
            />
            {/* Fiber lines clipped to the rhombus */}
            <g clipPath={`url(#ply-clip-${ply.id})`}>
              {lines.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  stroke={ply.color}
                  strokeWidth="1.5"
                  fill="none"
                  opacity="0.85"
                />
              ))}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
