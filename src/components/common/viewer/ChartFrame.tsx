import type { MouseEvent as ReactMouseEvent, ReactNode, RefObject } from 'react';
import { cn } from '@/lib/utils';
import { ChartZoomControls, type ChartZoomControlsProps } from '@/components/common/viewer/ChartZoomControls';
import { ChartBackgroundRect, type BgPointerHandlers } from '@/components/common/viewer/ChartBackgroundRect';
import { ChartGrid } from '@/components/common/viewer/ChartGrid';
import { VB_WIDTH, VB_HEIGHT, PAD_RIGHT } from '@/lib/bezierMath';

interface ChartFrameProps {
  svgRef: RefObject<SVGSVGElement>;
  ariaLabel: string;
  viewX: number;
  viewY: number;
  viewW: number;
  viewH: number;
  zoom: number;
  panningPointerId: number | null;
  idleCursor?: 'crosshair' | 'default' | 'grab';
  bgPointerHandlers: BgPointerHandlers;
  onBgClick?: (e: ReactMouseEvent<SVGRectElement>) => void;
  onBgDoubleClick: () => void;
  zoomControlProps: ChartZoomControlsProps;
  xTicks: number[];
  yTicks: number[];
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xDecimals: number;
  yDecimals: number;
  xUnit?: string;
  yUnit?: string;
  className?: string;
  /** Chart-specific SVG content (curve path, polygon, anchor layer, etc.) —
   *  rendered after the grid, inside the same `<svg>`. */
  children: ReactNode;
}

/**
 * Chart chrome shared by every zoomable SVG chart (`CurveEditor`,
 * `LayupMappingChart`): the sizing/background div, zoom controls, `<svg>`
 * viewBox wiring, background hit-rect (pan/click-to-add/dbl-click-reset),
 * axis unit labels, and gridlines. Each caller supplies only its own
 * curve/polygon/anchor rendering as `children`.
 */
export function ChartFrame({
  svgRef,
  ariaLabel,
  viewX,
  viewY,
  viewW,
  viewH,
  zoom,
  panningPointerId,
  idleCursor,
  bgPointerHandlers,
  onBgClick,
  onBgDoubleClick,
  zoomControlProps,
  xTicks,
  yTicks,
  xMin,
  xMax,
  yMin,
  yMax,
  xDecimals,
  yDecimals,
  xUnit,
  yUnit,
  className,
  children,
}: ChartFrameProps) {
  return (
    <div className={cn('relative h-[260px] w-full rounded-md bg-white', className)}>
      <ChartZoomControls {...zoomControlProps} />

      <svg
        ref={svgRef}
        viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
        className="h-full w-full"
        aria-label={ariaLabel}
        style={{ touchAction: 'none' }}
      >
        <ChartBackgroundRect
          viewX={viewX}
          viewY={viewY}
          viewW={viewW}
          viewH={viewH}
          zoom={zoom}
          panningPointerId={panningPointerId}
          idleCursor={idleCursor}
          bgPointerHandlers={bgPointerHandlers}
          onClick={onBgClick}
          onDoubleClick={onBgDoubleClick}
        />

        {yUnit && (
          <text x="6" y="12" fontSize="10" fill="#6b7280">
            [{yUnit}]
          </text>
        )}

        {xUnit && (
          <text x={VB_WIDTH - PAD_RIGHT} y={VB_HEIGHT - 4} fontSize="10" fill="#6b7280" textAnchor="end">
            [{xUnit}]
          </text>
        )}

        <ChartGrid
          xTicks={xTicks}
          yTicks={yTicks}
          xMin={xMin}
          xMax={xMax}
          yMin={yMin}
          yMax={yMax}
          xDecimals={xDecimals}
          yDecimals={yDecimals}
        />

        {children}
      </svg>
    </div>
  );
}
