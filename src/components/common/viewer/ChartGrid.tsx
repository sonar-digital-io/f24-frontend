import { VB_WIDTH, VB_HEIGHT, PAD_LEFT, PAD_RIGHT, PAD_TOP, PAD_BOTTOM, dataToPx } from '@/lib/bezierMath';

interface ChartGridProps {
  xTicks: number[];
  yTicks: number[];
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xDecimals: number;
  yDecimals: number;
}

/** Y/X gridlines + axis labels shared by `CubicSplineEditor` and `LayupMappingChart`. */
export function ChartGrid({ xTicks, yTicks, xMin, xMax, yMin, yMax, xDecimals, yDecimals }: ChartGridProps) {
  return (
    <>
      {yTicks.map((v) => {
        const { cy } = dataToPx({ x: xMin, y: v }, xMin, xMax, yMin, yMax);
        return (
          <g key={`y${v}`}>
            <text x="22" y={cy + 4} fontSize="9" fill="#6b7280">
              {v.toFixed(yDecimals)}
            </text>
            <line
              x1={PAD_LEFT}
              y1={cy}
              x2={VB_WIDTH - PAD_RIGHT}
              y2={cy}
              stroke="#f1f5f9"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}

      {xTicks.map((v) => {
        const { cx } = dataToPx({ x: v, y: yMin }, xMin, xMax, yMin, yMax);
        return (
          <g key={`x${v}`}>
            <line
              x1={cx}
              y1={PAD_TOP}
              x2={cx}
              y2={VB_HEIGHT - PAD_BOTTOM}
              stroke="#f1f5f9"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <text x={cx - 9} y={VB_HEIGHT - PAD_BOTTOM + 14} fontSize="9" fill="#6b7280">
              {v.toFixed(xDecimals)}
            </text>
          </g>
        );
      })}
    </>
  );
}
