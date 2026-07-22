import { useRef, useState, type MouseEvent } from 'react';

// ─── Profile Editor (XZ plane Bézier anchor editor) ───

interface ProfileEditorProps {
  anchors: [number, number][];
  onChange: (anchorIdx: number, x: number, z: number) => void;
}

export function ProfileEditor({ anchors, onChange }: ProfileEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const size = 200;
  const viewRange = 4; // -4 to +4

  const toSvg = (x: number, z: number): [number, number] => {
    return [
      ((x + viewRange) / (2 * viewRange)) * size,
      ((viewRange - z) / (2 * viewRange)) * size, // flip Z for screen
    ];
  };

  const fromSvg = (sx: number, sy: number): [number, number] => {
    return [
      (sx / size) * (2 * viewRange) - viewRange,
      viewRange - (sy / size) * (2 * viewRange),
    ];
  };

  // Sample Bézier curve for preview
  const curvePoints: [number, number][] = [];
  const n = anchors.length;
  if (n >= 3) {
    const samplesPerSeg = 12;
    for (let i = 0; i < n; i++) {
      const p0 = anchors[i];
      const p3 = anchors[(i + 1) % n];
      const prev = anchors[(i - 1 + n) % n];
      const next = anchors[(i + 2) % n];
      const t0x = (p3[0] - prev[0]) * 0.25;
      const t0z = (p3[1] - prev[1]) * 0.25;
      const t3x = (next[0] - p0[0]) * 0.25;
      const t3z = (next[1] - p0[1]) * 0.25;
      const cp1: [number, number] = [p0[0] + t0x, p0[1] + t0z];
      const cp2: [number, number] = [p3[0] - t3x, p3[1] - t3z];
      for (let s = 0; s <= samplesPerSeg; s++) {
        const t = s / samplesPerSeg;
        const mt = 1 - t;
        const x = mt * mt * mt * p0[0] + 3 * mt * mt * t * cp1[0] + 3 * mt * t * t * cp2[0] + t * t * t * p3[0];
        const z = mt * mt * mt * p0[1] + 3 * mt * mt * t * cp1[1] + 3 * mt * t * t * cp2[1] + t * t * t * p3[1];
        curvePoints.push([x, z]);
      }
    }
  }

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (dragging === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = Math.max(0, Math.min(size, e.clientX - rect.left));
    const sy = Math.max(0, Math.min(size, e.clientY - rect.top));
    const [x, z] = fromSvg(sx, sy);
    onChange(dragging, x, z);
  };

  const curvePath = curvePoints.length > 0
    ? `M ${curvePoints.map(([x, z]) => toSvg(x, z).join(',')).join(' L ')} Z`
    : '';

  return (
    <div className="bg-muted/30 rounded p-2">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className="w-full cursor-crosshair"
        viewBox={`0 0 ${size} ${size}`}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
      >
        {/* Grid */}
        <defs>
          <pattern id="profileGrid" width={size / 8} height={size / 8} patternUnits="userSpaceOnUse">
            <path d={`M ${size / 8} 0 L 0 0 0 ${size / 8}`} fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
          </pattern>
        </defs>
        <rect width={size} height={size} fill="url(#profileGrid)" />

        {/* Axes */}
        <line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke="#444" strokeWidth="0.5" />
        <line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke="#444" strokeWidth="0.5" />

        {/* Curve */}
        {curvePath && (
          <path d={curvePath} fill="rgba(68,136,204,0.1)" stroke="#4488cc" strokeWidth="1.5" />
        )}

        {/* Anchor points */}
        {anchors.map(([x, z], i) => {
          const [sx, sz] = toSvg(x, z);
          return (
            <circle
              key={i}
              cx={sx}
              cy={sz}
              r={5}
              fill={dragging === i ? '#ff8800' : '#4488cc'}
              stroke="#fff"
              strokeWidth="1.5"
              cursor="move"
              onMouseDown={(e) => { e.preventDefault(); setDragging(i); }}
            />
          );
        })}
      </svg>
      <p className="text-xs text-muted-foreground mt-1.5 text-center">
        Drag anchor points to edit profile (XZ view)
      </p>
    </div>
  );
}
