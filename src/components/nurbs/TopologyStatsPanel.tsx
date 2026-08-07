import { StatBadge } from '@/components/nurbs/NurbsControls';

interface NurbsStats {
  quadCount: number;
  vertexCount: number;
  edgeCount: number;
}

interface LoftStats {
  faces: number;
  edges: number;
  vertices: number;
  planeCount: number;
  solid: boolean;
  ruled: boolean;
}

interface TopologyStatsPanelProps {
  isNurbs: boolean;
  nurbs: NurbsStats;
  loft: LoftStats;
}

export function TopologyStatsPanel({ isNurbs, nurbs, loft }: TopologyStatsPanelProps) {
  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
      {isNurbs ? (
        <>
          <StatBadge label="Quads" value={nurbs.quadCount} highlight />
          <StatBadge label="Vertices" value={nurbs.vertexCount} />
          <StatBadge label="Edges" value={nurbs.edgeCount} />
          <StatBadge label="Topology" value="Quad" green />
          <StatBadge label="Degree" value="3 × 3" />
          <StatBadge label="Ctrl Points" value="5 × 5" />
        </>
      ) : (
        <>
          <StatBadge label="Faces" value={loft.faces} highlight />
          <StatBadge label="Edges" value={loft.edges} />
          <StatBadge label="Vertices" value={loft.vertices} />
          <StatBadge label="Engine" value="OCC" orange />
          <StatBadge label="Planes" value={loft.planeCount} />
          <StatBadge label="Mode" value={`${loft.solid ? 'Solid' : 'Shell'} / ${loft.ruled ? 'Ruled' : 'Smooth'}`} green />
        </>
      )}
    </div>
  );
}
