import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { ChartAnchorPoint } from '@/components/common/viewer/ChartAnchorPoint';
import type { ControlPoint } from '@/types';

interface ChartAnchorPointsLayerProps {
  points: ControlPoint[];
  project: (p: ControlPoint) => { cx: number; cy: number };
  draggingIndex: number | null;
  /** Fewest points the curve may shrink to — below this, double-click/Delete no longer remove. */
  minPoints: number;
  onPointerDown: (idx: number, e: PointerEvent<SVGCircleElement>) => void;
  onPointerMove: (idx: number, e: PointerEvent<SVGCircleElement>) => void;
  onPointerUp: (idx: number, e: PointerEvent<SVGCircleElement>) => void;
  onDoubleClick: (idx: number, e: MouseEvent<SVGCircleElement>) => void;
  onKeyDown: (idx: number, e: KeyboardEvent<SVGCircleElement>) => void;
}

/** Draggable `ChartAnchorPoint`s for every control point — shared by `BezierEditor`
 *  and `LayupMappingChart`, which only differ in the tooltip's "· Double-click to
 *  remove" vs plain "Drag to move" via the `minPoints` threshold. */
export function ChartAnchorPointsLayer({
  points,
  project,
  draggingIndex,
  minPoints,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
  onKeyDown,
}: ChartAnchorPointsLayerProps) {
  return (
    <>
      {points.map((p, idx) => {
        const { cx, cy } = project(p);
        return (
          <ChartAnchorPoint
            key={idx}
            cx={cx}
            cy={cy}
            isDragging={draggingIndex === idx}
            onPointerDown={(e) => onPointerDown(idx, e)}
            onPointerMove={(e) => onPointerMove(idx, e)}
            onPointerUp={(e) => onPointerUp(idx, e)}
            onPointerCancel={(e) => onPointerUp(idx, e)}
            onDoubleClick={(e) => onDoubleClick(idx, e)}
            onKeyDown={(e) => onKeyDown(idx, e)}
            tooltip={points.length > minPoints ? 'Drag to move · Double-click to remove' : 'Drag to move'}
          />
        );
      })}
    </>
  );
}
