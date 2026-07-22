/** Small XYZ axis indicator overlaid on a 3D viewport (bottom-left convention). */
export function CoordinateGizmo() {
  return (
    <svg viewBox="0 0 100 100" className="h-20 w-20" aria-hidden="true">
      <line x1="50" y1="50" x2="50" y2="15" stroke="#16a34a" strokeWidth="2" />
      <polygon points="50,10 46,18 54,18" fill="#16a34a" />
      <text x="55" y="14" fontSize="9" fill="#16a34a">z</text>
      <line x1="50" y1="50" x2="85" y2="50" stroke="#2563eb" strokeWidth="2" />
      <polygon points="90,50 82,46 82,54" fill="#2563eb" />
      <text x="80" y="64" fontSize="9" fill="#2563eb">y</text>
      <line x1="50" y1="50" x2="22" y2="78" stroke="#dc2626" strokeWidth="2" />
      <polygon points="18,82 26,80 22,72" fill="#dc2626" />
      <text x="10" y="78" fontSize="9" fill="#dc2626">x</text>
    </svg>
  );
}
