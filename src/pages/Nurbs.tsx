import { useCallback, useRef, useState } from 'react';
import { NurbsViewer } from '@/components/NurbsViewer';
import { LoftViewer, type PlaneProfile } from '@/components/LoftViewer';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

type GeometryType = 'nurbs-wave' | 'nurbs-dome' | 'nurbs-saddle' | 'loft';

const GEOMETRIES: { value: GeometryType; label: string }[] = [
  { value: 'nurbs-wave', label: 'NURBS Wave Surface' },
  { value: 'nurbs-dome', label: 'NURBS Dome' },
  { value: 'nurbs-saddle', label: 'NURBS Saddle' },
  { value: 'loft', label: 'Loft (OCC)' },
];

// Generate a default circle profile (anchor points on XZ plane)
function defaultCircleAnchors(radius: number, n = 8): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    pts.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return pts;
}

let planeIdCounter = 0;
function newPlaneId() {
  return `plane-${++planeIdCounter}`;
}

export function Nurbs() {
  const [selectedGeometry, setSelectedGeometry] = useState<GeometryType>('nurbs-wave');

  // NURBS state
  const [subdivisionsU, setSubdivisionsU] = useState(16);
  const [subdivisionsV, setSubdivisionsV] = useState(16);
  const [showWireframe, setShowWireframe] = useState(true);
  const [showSurface, setShowSurface] = useState(true);
  const [showControlPoints, setShowControlPoints] = useState(false);

  // Loft state
  const [planes, setPlanes] = useState<PlaneProfile[]>([]);
  const [loftSolid, setLoftSolid] = useState(true);
  const [loftRuled, setLoftRuled] = useState(false);
  const [showPlanes, setShowPlanes] = useState(true);
  const [loftStats, setLoftStats] = useState({ faces: 0, edges: 0, vertices: 0 });
  const [selectedPlaneIdx, setSelectedPlaneIdx] = useState<number | null>(null);
  const [loftTrigger, setLoftTrigger] = useState(0);
  const [edgePlacementMode, setEdgePlacementMode] = useState(false);

  const isNurbs = selectedGeometry !== 'loft';
  const canLoft = planes.filter((p) => p.anchors.length >= 3).length >= 2;

  // NURBS stats
  const quadCount = subdivisionsU * subdivisionsV;
  const nurbsVertexCount = (subdivisionsU + 1) * (subdivisionsV + 1);
  const nurbsEdgeCount = subdivisionsU * (subdivisionsV + 1) + subdivisionsV * (subdivisionsU + 1);

  const addPlane = () => {
    const lastY = planes.length > 0 ? planes[planes.length - 1].y + 3 : 0;
    const newPlane: PlaneProfile = {
      id: newPlaneId(),
      y: lastY,
      anchors: defaultCircleAnchors(2, 8),
    };
    setPlanes((prev) => [...prev, newPlane]);
    setSelectedPlaneIdx(planes.length);
  };

  // Toggle edge placement mode
  const toggleEdgePlacement = () => {
    setEdgePlacementMode((prev) => !prev);
  };

  // Called when user clicks on geometry to place an edge
  const handleEdgePlaced = useCallback((y: number) => {
    const sorted = [...planes].filter(p => p.anchors.length >= 3).sort((a, b) => a.y - b.y);
    if (sorted.length < 2) return;

    // Find surrounding planes
    let below = sorted[0];
    let above = sorted[sorted.length - 1];
    for (let i = 0; i < sorted.length - 1; i++) {
      if (y >= sorted[i].y && y <= sorted[i + 1].y) {
        below = sorted[i];
        above = sorted[i + 1];
        break;
      }
    }

    // Interpolate profile at this Y
    const t = above.y === below.y ? 0.5 : (y - below.y) / (above.y - below.y);
    const anchorCount = Math.min(below.anchors.length, above.anchors.length);
    const interpAnchors: [number, number][] = [];
    for (let i = 0; i < anchorCount; i++) {
      interpAnchors.push([
        below.anchors[i][0] + (above.anchors[i][0] - below.anchors[i][0]) * t,
        below.anchors[i][1] + (above.anchors[i][1] - below.anchors[i][1]) * t,
      ]);
    }

    const newPlane: PlaneProfile = {
      id: newPlaneId(),
      y: Math.round(y * 10) / 10, // round to 1 decimal
      anchors: interpAnchors,
    };

    setPlanes((prev) => [...prev, newPlane]);
    setSelectedPlaneIdx(planes.length);
    setEdgePlacementMode(false); // exit placement mode after placing
  }, [planes]);

  const removePlane = (idx: number) => {
    setPlanes((prev) => prev.filter((_, i) => i !== idx));
    if (selectedPlaneIdx === idx) setSelectedPlaneIdx(null);
    else if (selectedPlaneIdx !== null && selectedPlaneIdx > idx) setSelectedPlaneIdx(selectedPlaneIdx - 1);
  };

  const updatePlaneY = (idx: number, y: number) => {
    setPlanes((prev) => prev.map((p, i) => (i === idx ? { ...p, y } : p)));
  };

  const updateAnchor = (planeIdx: number, anchorIdx: number, x: number, z: number) => {
    setPlanes((prev) =>
      prev.map((p, i) => {
        if (i !== planeIdx) return p;
        const newAnchors = [...p.anchors];
        newAnchors[anchorIdx] = [x, z];
        return { ...p, anchors: newAnchors };
      })
    );
  };

  const handleStatsUpdate = useCallback(
    (stats: { faces: number; edges: number; vertices: number }) => {
      setLoftStats(stats);
    },
    []
  );

  const saveGeometry = () => {
    const data = JSON.stringify(planes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loft-geometry-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadGeometry = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const loaded = JSON.parse(ev.target?.result as string) as PlaneProfile[];
          if (Array.isArray(loaded) && loaded.every(p => p.id && typeof p.y === 'number' && Array.isArray(p.anchors))) {
            setPlanes(loaded);
            setSelectedPlaneIdx(null);
            setLoftTrigger(0);
          }
        } catch {
          // invalid JSON
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Profile editor SVG
  const selectedPlane = selectedPlaneIdx !== null ? planes[selectedPlaneIdx] : null;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gray-900">
      {/* 3D Viewer */}
      {isNurbs ? (
        <NurbsViewer
          subdivisionsU={subdivisionsU}
          subdivisionsV={subdivisionsV}
          showWireframe={showWireframe}
          showSurface={showSurface}
          showControlPoints={showControlPoints}
          geometryType={selectedGeometry as any}
        />
      ) : (
        <LoftViewer
          planes={planes}
          solid={loftSolid}
          ruled={loftRuled}
          showWireframe={showWireframe}
          showSurface={showSurface}
          showPlanes={showPlanes}
          loftTrigger={loftTrigger}
          edgePlacementMode={edgePlacementMode}
          onEdgePlaced={handleEdgePlaced}
          onStatsUpdate={handleStatsUpdate}
        />
      )}

      {/* Controls */}
      <div className="absolute top-4 left-4 z-50 max-h-[calc(100vh-2rem)] overflow-y-auto">
        {/* Geometry Selector */}
        <Card className="bg-background/90 backdrop-blur-sm border border-border min-w-[240px] mb-2">
          <CardContent className="p-3">
            <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">
              Select Geometry
            </label>
            <select
              value={selectedGeometry}
              onChange={(e) => setSelectedGeometry(e.target.value as GeometryType)}
              className="w-full px-3 py-2 text-sm font-medium rounded-md border border-border bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            >
              {GEOMETRIES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* NURBS Controls */}
        {isNurbs && (
          <Card className="bg-background/90 backdrop-blur-sm border border-border min-w-[240px]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2.5 mb-4 text-base font-semibold">
                <span>NURBS Surface</span>
              </div>
              <div className="mb-3">
                <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">U Subdivisions</label>
                <div className="flex items-center gap-2">
                  <Slider value={[subdivisionsU]} onValueChange={(v) => setSubdivisionsU(v[0])} min={4} max={64} step={1} className="flex-1" />
                  <span className="text-sm font-semibold w-8 text-right">{subdivisionsU}</span>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">V Subdivisions</label>
                <div className="flex items-center gap-2">
                  <Slider value={[subdivisionsV]} onValueChange={(v) => setSubdivisionsV(v[0])} min={4} max={64} step={1} className="flex-1" />
                  <span className="text-sm font-semibold w-8 text-right">{subdivisionsV}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <ToggleBtn active={showSurface} onClick={() => setShowSurface(!showSurface)} color="blue" label="Surface" />
                <ToggleBtn active={showWireframe} onClick={() => setShowWireframe(!showWireframe)} color="cyan" label="Wireframe" />
                <ToggleBtn active={showControlPoints} onClick={() => setShowControlPoints(!showControlPoints)} color="red" label="Control Points" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loft Controls */}
        {!isNurbs && (
          <>
            {/* Planes List */}
            <Card className="bg-background/90 backdrop-blur-sm border border-border min-w-[240px] mb-2">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-base font-semibold">Planes</span>
                  <button
                    onClick={addPlane}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-white/30 bg-black text-white hover:bg-white/10 transition-colors"
                  >
                    + Add Plane
                  </button>
                </div>

                {planes.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No planes yet. Click "+ Add Plane" to create one.</p>
                )}

                <div className="flex flex-col gap-2">
                  {planes.map((plane, idx) => {
                    const colors = ['text-green-400 border-green-500/50', 'text-blue-400 border-blue-500/50', 'text-pink-400 border-pink-500/50', 'text-orange-400 border-orange-500/50', 'text-purple-400 border-purple-500/50'];
                    const colorClass = colors[idx % colors.length];
                    const isSelected = selectedPlaneIdx === idx;

                    return (
                      <div
                        key={plane.id}
                        className={`p-2 rounded-md border cursor-pointer transition-colors ${
                          isSelected ? `${colorClass} bg-white/5` : 'border-border/50 hover:border-border'
                        }`}
                        onClick={() => setSelectedPlaneIdx(isSelected ? null : idx)}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold ${isSelected ? colorClass.split(' ')[0] : 'text-muted-foreground'}`}>
                            Plane {idx + 1}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removePlane(idx); }}
                            className="text-xs text-white/50 hover:text-white px-1"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-muted-foreground w-6">Y</label>
                          <Slider
                            value={[plane.y]}
                            onValueChange={(v) => updatePlaneY(idx, v[0])}
                            min={0}
                            max={15}
                            step={0.5}
                            className="flex-1"
                          />
                          <span className="text-xs font-semibold w-6 text-right">{plane.y}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setLoftTrigger((t) => t + 1)}
                disabled={!canLoft}
                className={`flex-1 px-4 py-3 text-sm font-bold rounded-md border transition-colors ${
                  canLoft
                    ? 'bg-black border-white/30 text-white hover:bg-white/10 cursor-pointer'
                    : 'bg-black/50 border-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                Loft
              </button>
              <button
                onClick={toggleEdgePlacement}
                disabled={!canLoft || loftTrigger === 0}
                className={`flex-1 px-4 py-3 text-sm font-bold rounded-md border transition-colors ${
                  edgePlacementMode
                    ? 'bg-yellow-500/30 border-yellow-400/60 text-yellow-200 cursor-pointer'
                    : canLoft && loftTrigger > 0
                      ? 'bg-black border-white/30 text-white hover:bg-white/10 cursor-pointer'
                      : 'bg-black/50 border-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                {edgePlacementMode ? 'Cancel' : 'Add Edge'}
              </button>
            </div>

            {/* Profile Editor (for selected plane) */}
            {selectedPlane && selectedPlaneIdx !== null && (
              <Card className="bg-background/90 backdrop-blur-sm border border-border min-w-[240px] mb-2">
                <CardContent className="p-4">
                  <div className="text-sm font-semibold mb-3">
                    Profile Editor — Plane {selectedPlaneIdx + 1}
                  </div>
                  <ProfileEditor
                    anchors={selectedPlane.anchors}
                    onChange={(anchorIdx, x, z) => updateAnchor(selectedPlaneIdx, anchorIdx, x, z)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Loft Parameters */}
            <Card className="bg-background/90 backdrop-blur-sm border border-border min-w-[240px]">
              <CardContent className="p-4">
                <div className="text-sm font-semibold mb-3">Loft Parameters</div>
                <div className="flex flex-col gap-1.5 mb-3">
                  <ToggleBtn active={showSurface} onClick={() => setShowSurface(!showSurface)} color="blue" label="Surface" />
                  <ToggleBtn active={showWireframe} onClick={() => setShowWireframe(!showWireframe)} color="cyan" label="Wireframe" />
                  <ToggleBtn active={showPlanes} onClick={() => setShowPlanes(!showPlanes)} color="purple" label="Planes" />
                </div>
                <div className="flex gap-1.5">
                  <ToggleBtn active={loftSolid} onClick={() => setLoftSolid(!loftSolid)} color="green" label={loftSolid ? 'Solid' : 'Shell'} />
                  <ToggleBtn active={!loftRuled} onClick={() => setLoftRuled(!loftRuled)} color="yellow" label={loftRuled ? 'Ruled' : 'Smooth'} />
                </div>
              </CardContent>
            </Card>

            {/* Save / Load */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveGeometry}
                disabled={planes.length === 0}
                className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-md border transition-colors ${
                  planes.length > 0
                    ? 'bg-black border-white/30 text-white hover:bg-white/10 cursor-pointer'
                    : 'bg-black/50 border-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                Save
              </button>
              <button
                onClick={loadGeometry}
                className="flex-1 px-4 py-2.5 text-sm font-bold rounded-md border bg-black border-white/30 text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Load
              </button>
            </div>
          </>
        )}
      </div>

      {/* Topology Stats */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        {isNurbs ? (
          <>
            <StatBadge label="Quads" value={quadCount} highlight />
            <StatBadge label="Vertices" value={nurbsVertexCount} />
            <StatBadge label="Edges" value={nurbsEdgeCount} />
            <StatBadge label="Topology" value="Quad" green />
            <StatBadge label="Degree" value="3 × 3" />
            <StatBadge label="Ctrl Points" value="5 × 5" />
          </>
        ) : (
          <>
            <StatBadge label="Faces" value={loftStats.faces} highlight />
            <StatBadge label="Edges" value={loftStats.edges} />
            <StatBadge label="Vertices" value={loftStats.vertices} />
            <StatBadge label="Engine" value="OCC" orange />
            <StatBadge label="Planes" value={planes.length} />
            <StatBadge label="Mode" value={`${loftSolid ? 'Solid' : 'Shell'} / ${loftRuled ? 'Ruled' : 'Smooth'}`} green />
          </>
        )}
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <Card className="bg-background/85 backdrop-blur-sm border border-border">
          <CardContent className="px-5 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {isNurbs
                  ? 'NURBS Surface • Quad topology wireframe'
                  : 'Loft (OpenCascade.js) • B-Rep edge wireframe'}
                {' '}• Drag to rotate • Scroll to zoom
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function ToggleBtn({ active, onClick, label }: { active: boolean; onClick: () => void; color?: string; label: string }) {
  const showOnOff = typeof label === 'string' && !['Solid', 'Shell', 'Ruled', 'Smooth'].includes(label);
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
        active
          ? 'bg-black border-white/40 text-white'
          : 'bg-black/50 border-white/15 text-white/50 hover:text-white hover:border-white/30'
      }`}
    >
      {label}{showOnOff ? (active ? ' ON' : ' OFF') : ''}
    </button>
  );
}

function StatBadge({ label, value, highlight, green, orange }: { label: string; value: string | number; highlight?: boolean; green?: boolean; orange?: boolean }) {
  let valueClass = 'text-base font-semibold';
  if (highlight) valueClass += ' text-cyan-400';
  else if (green) valueClass += ' text-green-400';
  else if (orange) valueClass += ' text-orange-400';

  return (
    <div className="flex justify-between items-center gap-5 px-4 py-2.5 bg-background/85 backdrop-blur-sm border border-border rounded-lg">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

// ─── Profile Editor (XZ plane Bézier anchor editor) ───

function ProfileEditor({
  anchors,
  onChange,
}: {
  anchors: [number, number][];
  onChange: (anchorIdx: number, x: number, z: number) => void;
}) {
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

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
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
