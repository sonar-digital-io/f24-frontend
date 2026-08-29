import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';

interface ChartBackgroundRectProps {
  viewX: number;
  viewY: number;
  viewW: number;
  viewH: number;
  zoom: number;
  panningPointerId: number | null;
  /** Cursor shown while idle (zoom === 1) — 'crosshair' hints click-to-add (CubicSplineEditor), 'default' elsewhere. */
  idleCursor?: 'crosshair' | 'default' | 'grab';
  bgPointerHandlers: {
    onPointerDown: (e: ReactPointerEvent<SVGRectElement>) => void;
    onPointerMove: (e: ReactPointerEvent<SVGRectElement>) => void;
    onPointerUp: (e: ReactPointerEvent<SVGRectElement>) => void;
    onPointerCancel: (e: ReactPointerEvent<SVGRectElement>) => void;
  };
  onDoubleClick: () => void;
  onClick?: (e: ReactMouseEvent<SVGRectElement>) => void;
}

/** Transparent hit-area rect catching pan + double-click-to-reset (and
 *  optionally click-to-add-point) — shared by every zoomable SVG chart. */
export function ChartBackgroundRect({
  viewX,
  viewY,
  viewW,
  viewH,
  zoom,
  panningPointerId,
  idleCursor = 'default',
  bgPointerHandlers,
  onDoubleClick,
  onClick,
}: ChartBackgroundRectProps) {
  return (
    <rect
      x={viewX}
      y={viewY}
      width={viewW}
      height={viewH}
      fill="transparent"
      style={{ cursor: zoom > 1 ? (panningPointerId !== null ? 'grabbing' : 'grab') : idleCursor }}
      {...bgPointerHandlers}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    />
  );
}
