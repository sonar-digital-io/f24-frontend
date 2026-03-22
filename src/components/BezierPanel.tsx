import { useState, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Input } from '@/components/ui/input';

interface BezierPanelProps {
  selectedVertex: THREE.Vector3 | null;
  onBezierChange: (points: THREE.Vector3[]) => void;
  onVertexUpdate?: (vertex: THREE.Vector3) => void;
}

export function BezierPanel({ selectedVertex, onBezierChange, onVertexUpdate }: BezierPanelProps) {
  const [bezierPoints, setBezierPoints] = useState<THREE.Vector3[] | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const previousVertexRef = useRef<THREE.Vector3 | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Initialize Bézier points when vertex is selected
  useEffect(() => {
    if (!selectedVertex) {
      setBezierPoints(null);
      previousVertexRef.current = null;
      return;
    }

    // Check if this is a different vertex than before
    const isNewVertex = !previousVertexRef.current || 
      !previousVertexRef.current.equals(selectedVertex);

    // Initialize if not set OR if it's a new vertex
    if (!bezierPoints || isNewVertex) {
      const P0 = new THREE.Vector3(0, 0, 0);
      const P1 = new THREE.Vector3(
        selectedVertex.x * 0.3,
        selectedVertex.y * 0.3,
        selectedVertex.z * 0.3
      );
      const P2 = new THREE.Vector3(
        selectedVertex.x * 0.7,
        selectedVertex.y * 0.7,
        selectedVertex.z * 0.7
      );
      const P3 = selectedVertex.clone();
      setBezierPoints([P0, P1, P2, P3]);
      previousVertexRef.current = selectedVertex.clone();
    } else {
      // Only update P3 if user manually modified the Bézier curve
      // This allows P3 to be updated when vertex changes externally
      const updated = [...bezierPoints];
      updated[3] = selectedVertex.clone();
      setBezierPoints(updated);
    }
  }, [selectedVertex]);

  // Update vertex when P3 changes (but not when it's just being synced from selectedVertex)
  useEffect(() => {
    if (bezierPoints && bezierPoints[3] && onVertexUpdate && previousVertexRef.current) {
      // Only update if P3 actually differs from the selected vertex
      // This prevents infinite loops when syncing
      if (!bezierPoints[3].equals(previousVertexRef.current)) {
        onVertexUpdate(bezierPoints[3]);
      }
    }
    if (bezierPoints && onBezierChange) {
      onBezierChange(bezierPoints);
    }
  }, [bezierPoints, onBezierChange, onVertexUpdate]);

  // Generate points along the Bézier curve for visualization
  const curvePoints = useMemo(() => {
    if (!bezierPoints) return [];

    const points: THREE.Vector3[] = [];
    const steps = 50;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = cubicBezier(
        bezierPoints[0],
        bezierPoints[1],
        bezierPoints[2],
        bezierPoints[3],
        t
      );
      points.push(point);
    }

    return points;
  }, [bezierPoints]);

  // Cubic Bézier curve calculation
  function cubicBezier(
    P0: THREE.Vector3,
    P1: THREE.Vector3,
    P2: THREE.Vector3,
    P3: THREE.Vector3,
    t: number
  ): THREE.Vector3 {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    const x = mt3 * P0.x + 3 * mt2 * t * P1.x + 3 * mt * t2 * P2.x + t3 * P3.x;
    const y = mt3 * P0.y + 3 * mt2 * t * P1.y + 3 * mt * t2 * P2.y + t3 * P3.y;
    const z = mt3 * P0.z + 3 * mt2 * t * P1.z + 3 * mt * t2 * P2.z + t3 * P3.z;

    return new THREE.Vector3(x, y, z);
  }

  if (!selectedVertex || !bezierPoints) {
    return null;
  }

  // Normalize points for 2D visualization (project to XY plane)
  const getBoundingBox = () => {
    const allPoints = [...bezierPoints, ...curvePoints];
    const minX = Math.min(...allPoints.map(p => p.x));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.y));
    const maxY = Math.max(...allPoints.map(p => p.y));
    return { minX, maxX, minY, maxY };
  };

  const normalizePoint = (point: THREE.Vector3, size: number) => {
    const { minX, maxX, minY, maxY } = getBoundingBox();
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const x = ((point.x - minX) / rangeX) * size;
    const y = size - ((point.y - minY) / rangeY) * size; // Flip Y for SVG

    return { x, y };
  };

  const denormalizePoint = (x: number, y: number, size: number, index: number): THREE.Vector3 => {
    const { minX, maxX, minY, maxY } = getBoundingBox();
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const worldX = (x / size) * rangeX + minX;
    const worldY = ((size - y) / size) * rangeY + minY; // Flip Y back

    // Keep Z coordinate from original point
    const originalZ = bezierPoints[index]?.z || 0;

    return new THREE.Vector3(worldX, worldY, originalZ);
  };

  const handlePointUpdate = (index: number, axis: 'x' | 'y' | 'z', value: number) => {
    if (!bezierPoints) return;
    
    const updated = [...bezierPoints];
    updated[index] = updated[index].clone();
    updated[index][axis] = value;
    setBezierPoints(updated);
    
    // Update previous vertex ref when P3 is manually changed
    if (index === 3) {
      previousVertexRef.current = updated[3].clone();
    }
  };

  const handleMouseDown = (index: number, event: React.MouseEvent<SVGCircleElement>) => {
    if (index === 0) return; // Don't allow dragging P0
    setDraggingIndex(index);
    event.preventDefault();
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (draggingIndex === null || !svgRef.current || !bezierPoints) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    const size = 200;

    const worldPoint = denormalizePoint(x, y, size, draggingIndex);
    const updated = [...bezierPoints];
    updated[draggingIndex] = worldPoint;
    setBezierPoints(updated);
    
    // Update previous vertex ref when P3 is dragged
    if (draggingIndex === 3) {
      previousVertexRef.current = worldPoint.clone();
    }
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  const size = 200;

  return (
    <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
      <h3 className="text-xs font-semibold mb-1.5 text-foreground">Bézier Curve</h3>
      
      {/* SVG Visualization */}
      <div className="mb-2 bg-muted/50 rounded p-2">
        <svg 
          ref={svgRef}
          width={size} 
          height={size} 
          className="w-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
            </pattern>
          </defs>
          <rect width={size} height={size} fill="url(#grid)" />
          
          {/* Bézier curve path */}
          {curvePoints.length > 1 && (
            <path
              d={`M ${normalizePoint(curvePoints[0], size).x} ${normalizePoint(curvePoints[0], size).y} ${curvePoints.slice(1).map((p) => {
                const np = normalizePoint(p, size);
                return `L ${np.x} ${np.y}`;
              }).join(' ')}`}
              fill="none"
              stroke="#ff8800"
              strokeWidth="2"
            />
          )}
          
          {/* Control point lines */}
          {bezierPoints[1] && (
            <line
              x1={normalizePoint(bezierPoints[0], size).x}
              y1={normalizePoint(bezierPoints[0], size).y}
              x2={normalizePoint(bezierPoints[1], size).x}
              y2={normalizePoint(bezierPoints[1], size).y}
              stroke="#666"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.5"
            />
          )}
          {bezierPoints[2] && bezierPoints[3] && (
            <line
              x1={normalizePoint(bezierPoints[2], size).x}
              y1={normalizePoint(bezierPoints[2], size).y}
              x2={normalizePoint(bezierPoints[3], size).x}
              y2={normalizePoint(bezierPoints[3], size).y}
              stroke="#666"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.5"
            />
          )}
          
          {/* Control points */}
          {bezierPoints.map((point, index) => {
            const np = normalizePoint(point, size);
            const isControlPoint = index === 1 || index === 2;
            const isEndPoint = index === 3;
            const isStartPoint = index === 0;
            
            return (
              <g key={index}>
                {/* Point */}
                <circle
                  cx={np.x}
                  cy={np.y}
                  r={isEndPoint ? 5 : isControlPoint ? 4 : 3}
                  fill={isEndPoint ? "#ff8800" : isControlPoint ? "#4a90e2" : "#888"}
                  stroke="#fff"
                  strokeWidth="1.5"
                  cursor={isStartPoint ? "default" : "move"}
                  onMouseDown={(e) => handleMouseDown(index, e)}
                  style={{ pointerEvents: isStartPoint ? 'none' : 'all' }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Control Points Parameters */}
      <div className="space-y-1.5">
        <div>
          <label className="block text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">
            P0 (Start)
          </label>
          <div className="grid grid-cols-3 gap-1">
            <Input
              type="number"
              value={bezierPoints[0].x.toFixed(2)}
              onChange={(e) => handlePointUpdate(0, 'x', parseFloat(e.target.value) || 0)}
              step="0.1"
              className="h-7 text-xs px-1.5 py-1"
              disabled
            />
            <Input
              type="number"
              value={bezierPoints[0].y.toFixed(2)}
              onChange={(e) => handlePointUpdate(0, 'y', parseFloat(e.target.value) || 0)}
              step="0.1"
              className="h-7 text-xs px-1.5 py-1"
              disabled
            />
            <Input
              type="number"
              value={bezierPoints[0].z.toFixed(2)}
              onChange={(e) => handlePointUpdate(0, 'z', parseFloat(e.target.value) || 0)}
              step="0.1"
              className="h-7 text-xs px-1.5 py-1"
              disabled
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">
            P1 (Control 1)
          </label>
          <div className="grid grid-cols-3 gap-1">
            <Input
              type="number"
              value={bezierPoints[1].x.toFixed(2)}
              onChange={(e) => handlePointUpdate(1, 'x', parseFloat(e.target.value) || 0)}
              step="0.1"
              className="h-7 text-xs px-1.5 py-1"
            />
            <Input
              type="number"
              value={bezierPoints[1].y.toFixed(2)}
              onChange={(e) => handlePointUpdate(1, 'y', parseFloat(e.target.value) || 0)}
              step="0.1"
              className="h-7 text-xs px-1.5 py-1"
            />
            <Input
              type="number"
              value={bezierPoints[1].z.toFixed(2)}
              onChange={(e) => handlePointUpdate(1, 'z', parseFloat(e.target.value) || 0)}
              step="0.1"
              className="h-7 text-xs px-1.5 py-1"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">
            P2 (Control 2)
          </label>
          <div className="grid grid-cols-3 gap-1">
            <Input
              type="number"
              value={bezierPoints[2].x.toFixed(2)}
              onChange={(e) => handlePointUpdate(2, 'x', parseFloat(e.target.value) || 0)}
              step="0.1"
              className="h-7 text-xs px-1.5 py-1"
            />
            <Input
              type="number"
              value={bezierPoints[2].y.toFixed(2)}
              onChange={(e) => handlePointUpdate(2, 'y', parseFloat(e.target.value) || 0)}
              step="0.1"
              className="h-7 text-xs px-1.5 py-1"
            />
            <Input
              type="number"
              value={bezierPoints[2].z.toFixed(2)}
              onChange={(e) => handlePointUpdate(2, 'z', parseFloat(e.target.value) || 0)}
              step="0.1"
              className="h-7 text-xs px-1.5 py-1"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">
            P3 (End / Vertex)
          </label>
          <div className="grid grid-cols-3 gap-1">
            <Input
              type="number"
              value={bezierPoints[3].x.toFixed(2)}
              onChange={(e) => handlePointUpdate(3, 'x', parseFloat(e.target.value) || 0)}
              step="0.1"
              className="h-7 text-xs px-1.5 py-1"
            />
            <Input
              type="number"
              value={bezierPoints[3].y.toFixed(2)}
              onChange={(e) => handlePointUpdate(3, 'y', parseFloat(e.target.value) || 0)}
              step="0.1"
              className="h-7 text-xs px-1.5 py-1"
            />
            <Input
              type="number"
              value={bezierPoints[3].z.toFixed(2)}
              onChange={(e) => handlePointUpdate(3, 'z', parseFloat(e.target.value) || 0)}
              step="0.1"
              className="h-7 text-xs px-1.5 py-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
