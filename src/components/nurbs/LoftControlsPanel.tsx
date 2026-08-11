import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { ToggleBtn } from '@/components/nurbs/NurbsControls';
import { ProfileEditor } from '@/components/nurbs/ProfileEditor';
import type { PlaneProfile } from '@/components/nurbs/LoftViewer';

const PLANE_COLORS = [
  'text-green-400 border-green-500/50',
  'text-blue-400 border-blue-500/50',
  'text-pink-400 border-pink-500/50',
  'text-orange-400 border-orange-500/50',
  'text-purple-400 border-purple-500/50',
];

interface LoftControlsPanelProps {
  planes: PlaneProfile[];
  selectedPlaneIdx: number | null;
  onSelectPlane: (idx: number | null) => void;
  onAddPlane: () => void;
  onRemovePlane: (idx: number) => void;
  onUpdatePlaneY: (idx: number, y: number) => void;
  onUpdateAnchor: (planeIdx: number, anchorIdx: number, x: number, z: number) => void;
  canLoft: boolean;
  loftTrigger: number;
  onLoft: () => void;
  edgePlacementMode: boolean;
  onToggleEdgePlacement: () => void;
  showSurface: boolean;
  showWireframe: boolean;
  showPlanes: boolean;
  onToggleSurface: () => void;
  onToggleWireframe: () => void;
  onTogglePlanes: () => void;
  loftSolid: boolean;
  loftRuled: boolean;
  onToggleSolid: () => void;
  onToggleRuled: () => void;
  onSave: () => void;
  onLoad: () => void;
}

export function LoftControlsPanel({
  planes,
  selectedPlaneIdx,
  onSelectPlane,
  onAddPlane,
  onRemovePlane,
  onUpdatePlaneY,
  onUpdateAnchor,
  canLoft,
  loftTrigger,
  onLoft,
  edgePlacementMode,
  onToggleEdgePlacement,
  showSurface,
  showWireframe,
  showPlanes,
  onToggleSurface,
  onToggleWireframe,
  onTogglePlanes,
  loftSolid,
  loftRuled,
  onToggleSolid,
  onToggleRuled,
  onSave,
  onLoad,
}: LoftControlsPanelProps) {
  const selectedPlane = selectedPlaneIdx !== null ? planes[selectedPlaneIdx] : null;

  return (
    <>
      {/* Planes List */}
      <Card className="bg-background/90 backdrop-blur-sm border border-border min-w-[240px] mb-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-semibold">Planes</span>
            <button
              onClick={onAddPlane}
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
              const colorClass = PLANE_COLORS[idx % PLANE_COLORS.length];
              const isSelected = selectedPlaneIdx === idx;

              return (
                <div
                  key={plane.id}
                  className={`p-2 rounded-md border cursor-pointer transition-colors ${
                    isSelected ? `${colorClass} bg-white/5` : 'border-border/50 hover:border-border'
                  }`}
                  onClick={() => onSelectPlane(isSelected ? null : idx)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-semibold ${isSelected ? colorClass.split(' ')[0] : 'text-muted-foreground'}`}>
                      Plane {idx + 1}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemovePlane(idx); }}
                      className="text-xs text-white/50 hover:text-white px-1"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground w-6">Y</label>
                    <Slider
                      value={[plane.y]}
                      onValueChange={(v) => onUpdatePlaneY(idx, v[0])}
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
          onClick={onLoft}
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
          onClick={onToggleEdgePlacement}
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
              onChange={(anchorIdx, x, z) => onUpdateAnchor(selectedPlaneIdx, anchorIdx, x, z)}
            />
          </CardContent>
        </Card>
      )}

      {/* Loft Parameters */}
      <Card className="bg-background/90 backdrop-blur-sm border border-border min-w-[240px]">
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-3">Loft Parameters</div>
          <div className="flex flex-col gap-1.5 mb-3">
            <ToggleBtn active={showSurface} onClick={onToggleSurface} color="blue" label="Surface" />
            <ToggleBtn active={showWireframe} onClick={onToggleWireframe} color="cyan" label="Wireframe" />
            <ToggleBtn active={showPlanes} onClick={onTogglePlanes} color="purple" label="Planes" />
          </div>
          <div className="flex gap-1.5">
            <ToggleBtn active={loftSolid} onClick={onToggleSolid} color="green" label={loftSolid ? 'Solid' : 'Shell'} />
            <ToggleBtn active={!loftRuled} onClick={onToggleRuled} color="yellow" label={loftRuled ? 'Ruled' : 'Smooth'} />
          </div>
        </CardContent>
      </Card>

      {/* Save / Load */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={onSave}
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
          onClick={onLoad}
          className="flex-1 px-4 py-2.5 text-sm font-bold rounded-md border bg-black border-white/30 text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          Load
        </button>
      </div>
    </>
  );
}
