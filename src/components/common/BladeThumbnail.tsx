/**
 * Minimal SVG placeholder for a wind-turbine blade thumbnail in geometry cards.
 * Resembles a tapered airfoil shape with a few section guidelines.
 * Replace with a real rendered blade preview when 3D pipeline is wired up.
 */
export function BladeThumbnail() {
  return (
    <svg
      viewBox="0 0 200 100"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* blade silhouette */}
      <path
        d="M10,50 Q40,30 100,38 Q160,46 190,49 L190,52 Q160,55 100,53 Q40,52 10,50 Z"
        fill="#e5e7eb"
        stroke="#9ca3af"
        strokeWidth="0.5"
      />
      {/* section guidelines */}
      {[25, 50, 75, 100, 125, 150, 175].map((x) => (
        <line
          key={x}
          x1={x}
          y1={30 + (x - 25) * 0.18}
          x2={x}
          y2={70 - (x - 25) * 0.18}
          stroke="#9ca3af"
          strokeWidth="0.3"
          opacity="0.7"
        />
      ))}
      {/* root reinforcement */}
      <rect x="10" y="44" width="6" height="12" fill="#6b7280" opacity="0.4" />
    </svg>
  );
}
