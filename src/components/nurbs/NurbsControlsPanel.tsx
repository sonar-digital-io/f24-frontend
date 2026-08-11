import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { ToggleBtn } from '@/components/nurbs/NurbsControls';

interface NurbsControlsPanelProps {
  subdivisionsU: number;
  subdivisionsV: number;
  onSubdivisionsUChange: (v: number) => void;
  onSubdivisionsVChange: (v: number) => void;
  showSurface: boolean;
  showWireframe: boolean;
  showControlPoints: boolean;
  onToggleSurface: () => void;
  onToggleWireframe: () => void;
  onToggleControlPoints: () => void;
}

export function NurbsControlsPanel({
  subdivisionsU,
  subdivisionsV,
  onSubdivisionsUChange,
  onSubdivisionsVChange,
  showSurface,
  showWireframe,
  showControlPoints,
  onToggleSurface,
  onToggleWireframe,
  onToggleControlPoints,
}: NurbsControlsPanelProps) {
  return (
    <Card className="bg-background/90 backdrop-blur-sm border border-border min-w-[240px]">
      <CardContent className="p-4">
        <div className="flex items-center gap-2.5 mb-4 text-base font-semibold">
          <span>NURBS Surface</span>
        </div>
        <div className="mb-3">
          <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">U Subdivisions</label>
          <div className="flex items-center gap-2">
            <Slider value={[subdivisionsU]} onValueChange={(v) => onSubdivisionsUChange(v[0])} min={4} max={64} step={1} className="flex-1" />
            <span className="text-sm font-semibold w-8 text-right">{subdivisionsU}</span>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">V Subdivisions</label>
          <div className="flex items-center gap-2">
            <Slider value={[subdivisionsV]} onValueChange={(v) => onSubdivisionsVChange(v[0])} min={4} max={64} step={1} className="flex-1" />
            <span className="text-sm font-semibold w-8 text-right">{subdivisionsV}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <ToggleBtn active={showSurface} onClick={onToggleSurface} color="blue" label="Surface" />
          <ToggleBtn active={showWireframe} onClick={onToggleWireframe} color="cyan" label="Wireframe" />
          <ToggleBtn active={showControlPoints} onClick={onToggleControlPoints} color="red" label="Control Points" />
        </div>
      </CardContent>
    </Card>
  );
}
