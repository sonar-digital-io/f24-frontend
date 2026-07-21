/**
 * Isometric schematic of the layup stack. Each ply is drawn as a parallelogram
 * (rhombus, ~30° iso) with fiber orientation lines clipped to that shape.
 *
 * Unified mode: all plies are flat, evenly spaced.
 * Non-unified mode: each ply grows a visible side face proportional to its
 * thickness (mm). The face heights are scaled by PLY_THICKNESS_SCALE px/mm.
 * Plies with thickness=0 stay flat but keep a minimum Y gap.
 */

import type { Ply } from '@/components/LayupBuilder';
import { MATERIALS } from '@/data/materials';

const BIAXIAL_TYPES = new Set(['Biaxial Ply (±45°)']);

function isBiaxial(materialName: string): boolean {
  const m = MATERIALS.find((mat) => mat.name === materialName);
  if (m) return BIAXIAL_TYPES.has(m.type);
  return materialName.toLowerCase().includes('biax');
}

// px per mm of ply thickness in non-unified mode (0.1 mm ≈ 1 SVG unit)
const PLY_THICKNESS_SCALE = 10;

function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - factor))},${Math.round(g * (1 - factor))},${Math.round(b * (1 - factor))})`;
}

interface PlyStackVizProps {
  plies: Ply[]; // top of stack = index 0, drawn on top of the viz
  unified?: boolean;
  className?: string;
}

// Geometry of a single ply in viewBox units
const PLY_W = 360; // horizontal extent of the rhombus
const PLY_H = 180; // vertical extent (top-to-bottom of the rhombus diamond shape)
const Y_STEP = 50; // vertical distance between consecutive plies in unified mode
const PAD_X = 60;
const PAD_Y = 30;

/** 4 corners of the rhombus for a ply at given vertical offset (in viewBox y). */
function rhombusPath(yOffset: number): string {
  const top = `${PAD_X + PLY_W / 2},${PAD_Y + yOffset}`;
  const right = `${PAD_X + PLY_W},${PAD_Y + yOffset + PLY_H / 2}`;
  const bottom = `${PAD_X + PLY_W / 2},${PAD_Y + yOffset + PLY_H}`;
  const left = `${PAD_X},${PAD_Y + yOffset + PLY_H / 2}`;
  return `M ${top} L ${right} L ${bottom} L ${left} Z`;
}

/**
 * Side face paths for a ply at yOffset with visual height h.
 * The right and left faces form the front "walls" of the slab in the iso view.
 * Both faces share the bottom vertex of the rhombus.
 */
function sideFacePaths(yOffset: number, h: number): { right: string; left: string } {
  const cx = PAD_X + PLY_W / 2;
  const midY = PAD_Y + yOffset + PLY_H / 2; // y of left and right vertices
  const botY = PAD_Y + yOffset + PLY_H;      // y of bottom vertex
  const rx = PAD_X + PLY_W;
  const lx = PAD_X;
  return {
    right: `M ${rx},${midY} L ${cx},${botY} L ${cx},${botY + h} L ${rx},${midY + h} Z`,
    left:  `M ${lx},${midY} L ${cx},${botY} L ${cx},${botY + h} L ${lx},${midY + h} Z`,
  };
}

/** Maps ply orientation (deg) to a screen angle (deg) for the iso rhombus.
 *  0° → top-right edge direction, 45° → horizontal, 90° → top-left edge. */
function orientationToScreenAngle(orientation: number): number {
  const edgeAngleDeg = Math.atan2(PLY_H / 2, PLY_W / 2) * (180 / Math.PI);
  return edgeAngleDeg + (orientation / 90) * (180 - 2 * edgeAngleDeg);
}

/** Generate fiber lines at an exact screen angle (deg), clipped to the rhombus. */
function fiberLinesAtScreenAngle(yOffset: number, screenAngleDeg: number): string[] {
  const a = (screenAngleDeg * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const px = -dy;
  const py = dx;

  const cx = PAD_X + PLY_W / 2;
  const cy = PAD_Y + yOffset + PLY_H / 2;

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

export function PlyStackViz({ plies, unified = true, className }: PlyStackVizProps) {
  // Per-ply visual heights (px) — 0 in unified mode or when thickness is 0
  const heights = plies.map((ply) =>
    unified ? 0 : Math.max(0, ply.thickness * PLY_THICKNESS_SCALE)
  );

  // Y offsets are identical in both modes — uniform Y_STEP spacing is preserved.
  // In non-unified mode the side faces overlay the ply below rather than
  // pushing it further down, so spacing stays consistent.
  const yOffsets = plies.map((_, i) => i * Y_STEP);

  const lastH = plies.length > 0 ? heights[plies.length - 1] : 0;
  // Extra height for the last ply's side face (nothing below it to cover it).
  const totalY = PLY_H + (plies.length - 1) * Y_STEP + lastH + 2 * PAD_Y;
  const totalX = PLY_W + 2 * PAD_X;

  return (
    <svg
      viewBox={`0 0 ${totalX} ${totalY}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Layup ply stack visualization"
    >
      <defs>
        {plies.map((ply, idx) => (
          <clipPath key={ply.id} id={`ply-clip-${ply.id}`}>
            <path d={rhombusPath(yOffsets[idx])} />
          </clipPath>
        ))}
      </defs>

      {/* Paint bottom-to-top so the top ply is drawn last (highest SVG z-order). */}
      {[...plies].reverse().map((ply) => {
        const idx = plies.indexOf(ply);
        const yOffset = yOffsets[idx];
        const h = heights[idx];

        const biaxial = isBiaxial(ply.material);
        const screenAngle = biaxial
          ? ply.orientation
          : orientationToScreenAngle(ply.orientation);
        const lines = fiberLinesAtScreenAngle(yOffset, screenAngle);
        const crossLines = biaxial
          ? fiberLinesAtScreenAngle(yOffset, screenAngle + 90)
          : null;

        const faces = h > 0 ? sideFacePaths(yOffset, h) : null;

        return (
          <g key={ply.id}>
            {/* Side faces drawn first so the top face covers their shared edge */}
            {faces && (
              <>
                <path
                  d={faces.right}
                  fill={darkenColor(ply.color, 0.18)}
                  stroke="#0f172a"
                  strokeOpacity="0.25"
                  strokeWidth="1.5"
                />
                <path
                  d={faces.left}
                  fill={darkenColor(ply.color, 0.34)}
                  stroke="#0f172a"
                  strokeOpacity="0.25"
                  strokeWidth="1.5"
                />
              </>
            )}
            {/* Top face */}
            <path
              d={rhombusPath(yOffset)}
              fill={ply.color}
              stroke="#0f172a"
              strokeOpacity="0.35"
              strokeWidth="2"
            />
            {/* Fiber lines clipped to the top face */}
            <g clipPath={`url(#ply-clip-${ply.id})`}>
              {lines.map((d, i) => (
                <path key={i} d={d} stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.4" />
              ))}
              {crossLines?.map((d, i) => (
                <path key={`x${i}`} d={d} stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.4" />
              ))}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
