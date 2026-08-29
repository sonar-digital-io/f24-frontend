import { Minus, Plus } from 'lucide-react';

/** Zoom in/out button stack overlaid on a chart editor (top-right) — shared by
 *  `CubicSplineEditor`, `BezierEditor`, and `LayupMappingChart`. */
export interface ChartZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

export function ChartZoomControls({
  onZoomIn,
  onZoomOut,
  canZoomIn,
  canZoomOut,
}: ChartZoomControlsProps) {
  return (
    <div className="absolute right-2 top-2 z-10 flex flex-col overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
      <button
        type="button"
        aria-label="Zoom in"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        className="flex h-6 w-6 items-center justify-center text-[#6b7280] hover:bg-[#f1f5f9] disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        className="flex h-6 w-6 items-center justify-center border-t border-[#e5e7eb] text-[#6b7280] hover:bg-[#f1f5f9] disabled:opacity-40"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
