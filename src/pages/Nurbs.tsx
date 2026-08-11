import { useCallback, useState } from 'react';
import { NurbsViewer } from '@/components/nurbs/NurbsViewer';
import { LoftViewer, type PlaneProfile } from '@/components/nurbs/LoftViewer';
import { Card, CardContent } from '@/components/ui/card';
import { NurbsControlsPanel } from '@/components/nurbs/NurbsControlsPanel';
import { LoftControlsPanel } from '@/components/nurbs/LoftControlsPanel';
import { TopologyStatsPanel } from '@/components/nurbs/TopologyStatsPanel';
import { interpolateAnchorsAtY } from '@/lib/loftGeometry';
import type { GeometryType } from '@/types';

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
    const interpolated = interpolateAnchorsAtY(planes, y);
    if (!interpolated) return;

    const newPlane: PlaneProfile = {
      id: newPlaneId(),
      y: Math.round(interpolated.clampedY * 10) / 10, // round to 1 decimal
      anchors: interpolated.anchors,
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
          geometryType={selectedGeometry}
        />
      ) : (
        <LoftViewer
          planes={planes}
          solid={loftSolid}
          ruled={loftRuled}
          showWireframe={showWireframe}
          showSurface={showSurface}
          showPlanes={showPlanes}
          selectedPlaneIdx={selectedPlaneIdx}
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

        {isNurbs ? (
          <NurbsControlsPanel
            subdivisionsU={subdivisionsU}
            subdivisionsV={subdivisionsV}
            onSubdivisionsUChange={setSubdivisionsU}
            onSubdivisionsVChange={setSubdivisionsV}
            showSurface={showSurface}
            showWireframe={showWireframe}
            showControlPoints={showControlPoints}
            onToggleSurface={() => setShowSurface(!showSurface)}
            onToggleWireframe={() => setShowWireframe(!showWireframe)}
            onToggleControlPoints={() => setShowControlPoints(!showControlPoints)}
          />
        ) : (
          <LoftControlsPanel
            planes={planes}
            selectedPlaneIdx={selectedPlaneIdx}
            onSelectPlane={setSelectedPlaneIdx}
            onAddPlane={addPlane}
            onRemovePlane={removePlane}
            onUpdatePlaneY={updatePlaneY}
            onUpdateAnchor={updateAnchor}
            canLoft={canLoft}
            loftTrigger={loftTrigger}
            onLoft={() => setLoftTrigger((t) => t + 1)}
            edgePlacementMode={edgePlacementMode}
            onToggleEdgePlacement={toggleEdgePlacement}
            showSurface={showSurface}
            showWireframe={showWireframe}
            showPlanes={showPlanes}
            onToggleSurface={() => setShowSurface(!showSurface)}
            onToggleWireframe={() => setShowWireframe(!showWireframe)}
            onTogglePlanes={() => setShowPlanes(!showPlanes)}
            loftSolid={loftSolid}
            loftRuled={loftRuled}
            onToggleSolid={() => setLoftSolid(!loftSolid)}
            onToggleRuled={() => setLoftRuled(!loftRuled)}
            onSave={saveGeometry}
            onLoad={loadGeometry}
          />
        )}
      </div>

      <TopologyStatsPanel
        isNurbs={isNurbs}
        nurbs={{ quadCount, vertexCount: nurbsVertexCount, edgeCount: nurbsEdgeCount }}
        loft={{ ...loftStats, planeCount: planes.length, solid: loftSolid, ruled: loftRuled }}
      />

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
