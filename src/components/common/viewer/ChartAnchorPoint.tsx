import type { MouseEvent, PointerEvent } from 'react';

interface ChartAnchorPointProps {
  cx: number;
  cy: number;
  isDragging: boolean;
  onPointerDown: (e: PointerEvent<SVGCircleElement>) => void;
  onPointerMove: (e: PointerEvent<SVGCircleElement>) => void;
  onPointerUp: (e: PointerEvent<SVGCircleElement>) => void;
  onPointerCancel: (e: PointerEvent<SVGCircleElement>) => void;
  onDoubleClick?: (e: MouseEvent<SVGCircleElement>) => void;
  tooltip?: string;
}

/** Draggable chart control-point dot (with an oversized invisible hit area), shared by `BezierEditor`/`LayupMappingChart`. */
export function ChartAnchorPoint({
  cx,
  cy,
  isDragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onDoubleClick,
  tooltip,
}: ChartAnchorPointProps) {
  return (
    <g>
      {/* Invisible hit area (larger than visible dot for easier grab) */}
      <circle
        cx={cx}
        cy={cy}
        r="14"
        fill="transparent"
        style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onDoubleClick={onDoubleClick}
      >
        {tooltip && <title>{tooltip}</title>}
      </circle>
      {/* Visible dot */}
      <circle cx={cx} cy={cy} r={isDragging ? 7 : 6} fill="#0066cc" style={{ pointerEvents: 'none' }} />
      <circle cx={cx} cy={cy} r="3" fill="white" style={{ pointerEvents: 'none' }} />
    </g>
  );
}
