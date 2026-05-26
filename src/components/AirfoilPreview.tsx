/**
 * Lightweight 2D airfoil preview using the NACA 4-digit airfoil parametric
 * equations. Replace with a real foil-coordinate renderer once geometry
 * data is available — for now we approximate from (maxCamber, position,
 * thickness) in percent.
 *
 *   maxCamber (m)        — max camber as a fraction of chord, here % so /100
 *   maxCamberPosition(p) — position of max camber along chord, % so /100
 *   thickness (t)        — max thickness as a fraction of chord, % so /100
 *
 * https://en.wikipedia.org/wiki/NACA_airfoil#Equation_for_a_cambered_4-digit_NACA_airfoil
 */

interface AirfoilPreviewProps {
  maxCamber: number; // %
  maxCamberPosition: number; // %
  thickness: number; // %
  className?: string;
}

export function AirfoilPreview({
  maxCamber,
  maxCamberPosition,
  thickness,
  className,
}: AirfoilPreviewProps) {
  const m = maxCamber / 100;
  const p = Math.max(0.001, Math.min(0.999, maxCamberPosition / 100));
  const t = thickness / 100;
  const N = 50;

  // Thickness distribution (symmetric airfoil profile)
  function yt(x: number) {
    return (
      (t / 0.2) *
      (0.2969 * Math.sqrt(x) -
        0.126 * x -
        0.3516 * x * x +
        0.2843 * x * x * x -
        0.1015 * x * x * x * x)
    );
  }

  // Mean camber line
  function yc(x: number) {
    if (x < p) return (m / (p * p)) * (2 * p * x - x * x);
    return (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x);
  }
  function dycDx(x: number) {
    if (x < p) return ((2 * m) / (p * p)) * (p - x);
    return ((2 * m) / ((1 - p) * (1 - p))) * (p - x);
  }

  function point(x: number, upper: boolean): [number, number] {
    const theta = Math.atan(dycDx(x));
    const ytx = yt(x);
    const ycx = yc(x);
    const px = upper ? x - ytx * Math.sin(theta) : x + ytx * Math.sin(theta);
    const py = upper ? ycx + ytx * Math.cos(theta) : ycx - ytx * Math.cos(theta);
    return [px, py];
  }

  const upper: [number, number][] = [];
  const lower: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    // Cosine-spaced x for finer leading-edge detail
    const x = 0.5 * (1 - Math.cos((Math.PI * i) / N));
    upper.push(point(x, true));
    lower.push(point(x, false));
  }

  // Build a single closed path: upper trailing-edge -> leading edge -> lower trailing edge
  const allPts = [...upper.reverse(), ...lower];

  // Find bounds for autoscaling into the viewBox (0..1 x, ±0.2 y roughly)
  const vbW = 400;
  const vbH = 200;
  const padX = 20;
  const padY = 40;
  const innerW = vbW - 2 * padX;
  const innerH = vbH - 2 * padY;

  function toSvg([x, y]: [number, number]) {
    const sx = padX + x * innerW;
    // Flip Y so camber points up
    const sy = vbH / 2 - y * innerH;
    return `${sx.toFixed(2)},${sy.toFixed(2)}`;
  }

  const d = `M ${allPts.map(toSvg).join(' L ')} Z`;

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className={className}
      aria-label="2D airfoil preview"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={d} fill="none" stroke="#0066cc" strokeWidth="2" />
    </svg>
  );
}
