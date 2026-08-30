import { isBiaxial } from '@/lib/plyStackGeometry';
import type { Ply } from '@/components/layup/LayupBuilder';
import type { Material } from '@/api/types/materials';

interface UnifiedPlyStackVizProps {
  plies: Ply[]; // top of stack = index 0
  materials: Material[];
  className?: string;
}

// Isometric diamond tile — classic 2:1 width:height ratio.
const TILE_W = 220;
const TILE_H = 110;
// Each ply is drawn dead-center under the one above it (aligned, no sideways
// drift) — only offset down, so the stack reads as a straight vertical deck.
const STEP_Y = 46;
const PAD = 12;
const HATCH_SPACING = 10;
// Same dark navy as the 3D view's ply edges/fiber sheets (plyStackGeometry.ts
// EDGE/SHEET_COLOR, 0x0f172a) — keeps both visualizations' palette consistent.
const LINE_COLOR = '#0f172a';

function diamondPoints(cx: number, cy: number): string {
  return [
    [cx, cy - TILE_H / 2],
    [cx + TILE_W / 2, cy],
    [cx, cy + TILE_H / 2],
    [cx - TILE_W / 2, cy],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ');
}

// The diamond's own two edge directions, in screen space: "u" runs from the
// top vertex to the right vertex (the projection of the rectangle's 0°
// side), "v" from the top vertex to the left vertex (the 90° side). A fiber
// direction of `orientationDeg` is (cosθ, sinθ) in the rectangle's own local
// X/Z — projecting that through this isometric basis (not just rotating it
// in flat screen space) is what actually makes 0° come out parallel to the
// diamond's own edge instead of flat horizontal.
const U_AXIS = { x: TILE_W / 2, y: TILE_H / 2 };
const V_AXIS = { x: -TILE_W / 2, y: TILE_H / 2 };

/** Screen-space angle (degrees, SVG `rotate()` convention) a ply's real
 *  `orientation` projects to once drawn on the isometric diamond. */
function screenAngleForOrientation(orientationDeg: number): number {
  const rad = (orientationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = cos * U_AXIS.x + sin * V_AXIS.x;
  const dy = cos * U_AXIS.y + sin * V_AXIS.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Whether a ply's material reads as a woven fabric (crosshatch pattern) —
 *  biaxial plies get the same treatment since they also need two fiber
 *  directions, not one. */
function needsCrosshatch(ply: Ply, materials: Material[]): boolean {
  if (isBiaxial(ply.material, materials)) return true;
  const material = materials.find((m) => m.name === ply.material);
  return (material?.type ?? '').toLowerCase().includes('woven');
}

/**
 * Static isometric "exploded stack" diagram — an alternative to `PlyStackViz`
 * for a quick-glance schematic read of the layup: every ply drawn as an
 * equal-size diamond (no taper), aligned on a shared vertical center and
 * cascaded straight down so each one peeks out from under the one above.
 * Fill colors match the 3D view exactly (`ply.color`), and the fiber-line
 * overlay uses the same dark navy as the 3D view's edges/fiber sheets.
 * Lines run at the ply's real `orientation`, projected through the isometric
 * diamond's own two edge directions (`screenAngleForOrientation`) so 0° is
 * parallel to the diamond's edge — i.e. the rectangle's own side — not flat
 * horizontal. Drawn as a crosshatch instead of single-direction lines when
 * the material is biaxial or woven (`needsCrosshatch`) — those need two
 * fiber directions to read correctly, not one.
 */
export function UnifiedPlyStackViz({ plies, materials, className }: UnifiedPlyStackVizProps) {
  const n = plies.length;
  const width = TILE_W + PAD * 2;
  const height = TILE_H + Math.max(0, n - 1) * STEP_Y + PAD * 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-label="Layup ply stack unified visualization"
    >
      <defs>
        {plies.map((ply) => {
          const crosshatch = needsCrosshatch(ply, materials);
          const angle = screenAngleForOrientation(ply.orientation);
          // Crosshatch's second line is pre-rotated inside the tile by the
          // gap between the two projected angles, so that after the shared
          // patternTransform below it lands exactly at screenAngle(θ + 90°)
          // — the two directions aren't 90° apart on screen once projected
          // through the isometric shear, so they can't share one rotation.
          const crossAngleOffset = crosshatch
            ? screenAngleForOrientation(ply.orientation + 90) - angle
            : 0;
          return (
            <pattern
              key={ply.id}
              id={`hatch-${ply.id}`}
              width={HATCH_SPACING}
              height={HATCH_SPACING}
              patternUnits="userSpaceOnUse"
              patternTransform={`rotate(${angle})`}
            >
              {/* 0° = parallel to the diamond's own edge (the rectangle's own side), not flat horizontal */}
              <line x1="0" y1="0" x2={HATCH_SPACING} y2="0" stroke={LINE_COLOR} strokeWidth="1.5" />
              {crosshatch && (
                <line
                  x1="0"
                  y1="0"
                  x2={HATCH_SPACING}
                  y2="0"
                  stroke={LINE_COLOR}
                  strokeWidth="1.5"
                  transform={`rotate(${crossAngleOffset}, ${HATCH_SPACING / 2}, ${HATCH_SPACING / 2})`}
                />
              )}
            </pattern>
          );
        })}
      </defs>

      {plies.length === 0 ? (
        <text x={width / 2} y={height / 2} textAnchor="middle" fontSize="13" fill="#6b7280">
          No plies yet.
        </text>
      ) : (
        // Paint back-to-front (last ply in the stack first) so ply 0 — the
        // top of the stack — is painted last and lands in front, unoccluded,
        // instead of buried under everything drawn after it.
        plies
          .map((ply, idx) => ({ ply, idx }))
          .reverse()
          .map(({ ply, idx }) => {
            const cx = width / 2;
            const cy = PAD + TILE_H / 2 + idx * STEP_Y;
            const points = diamondPoints(cx, cy);
            return (
              <g key={ply.id}>
                <polygon points={points} fill={ply.color} stroke={LINE_COLOR} strokeWidth="2" />
                <polygon points={points} fill={`url(#hatch-${ply.id})`} stroke="none" />
              </g>
            );
          })
      )}
    </svg>
  );
}
