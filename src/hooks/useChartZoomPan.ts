import { useRef, useState, type PointerEvent, type RefObject } from 'react';
import { VB_WIDTH, VB_HEIGHT, clamp } from '@/lib/bezierMath';

export const CHART_ZOOM_MIN = 1;
export const CHART_ZOOM_MAX = 8;
export const CHART_ZOOM_STEP = 1.25;

/**
 * Zoom + pan state machine shared by the SVG chart editors (`CurveEditor`,
 * `LayupMappingChart`): a zoomable/pannable viewBox over a fixed-size chart,
 * pan only enabled while zoomed in, double-click resets to zoom 1.
 */
export function useChartZoomPan(svgRef: RefObject<SVGSVGElement>) {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [panningPointerId, setPanningPointerId] = useState<number | null>(null);
  const panStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    panX: number;
    panY: number;
  } | null>(null);

  // Track whether a background pointer-down resulted in actual panning so
  // callers can distinguish a plain click (e.g. add-point) from a drag-end.
  const hasPannedRef = useRef(false);

  const viewW = VB_WIDTH / zoom;
  const viewH = VB_HEIGHT / zoom;
  const centerOffsetX = (VB_WIDTH - viewW) / 2;
  const centerOffsetY = (VB_HEIGHT - viewH) / 2;
  const clampedPanX = clamp(panX, -centerOffsetX, centerOffsetX);
  const clampedPanY = clamp(panY, -centerOffsetY, centerOffsetY);
  const viewX = centerOffsetX + clampedPanX;
  const viewY = centerOffsetY + clampedPanY;

  function screenToViewBox(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  }

  function zoomBy(factor: number) {
    const next = clamp(zoom * factor, CHART_ZOOM_MIN, CHART_ZOOM_MAX);
    if (next === zoom) return;
    if (next <= 1) {
      setPanX(0);
      setPanY(0);
    }
    setZoom(next);
  }

  function handleBgPointerDown(e: PointerEvent<SVGRectElement>) {
    hasPannedRef.current = false;
    if (zoom <= 1) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setPanningPointerId(e.pointerId);
    panStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      panX: clampedPanX,
      panY: clampedPanY,
    };
  }

  function handleBgPointerMove(e: PointerEvent<SVGRectElement>) {
    if (panningPointerId === null || !panStartRef.current) return;
    const dx = e.clientX - panStartRef.current.pointerX;
    const dy = e.clientY - panStartRef.current.pointerY;
    if (dx * dx + dy * dy > 16) hasPannedRef.current = true; // 4 px threshold
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vbDx = (dx / rect.width) * viewW;
    const vbDy = (dy / rect.height) * viewH;
    setPanX(panStartRef.current.panX - vbDx);
    setPanY(panStartRef.current.panY - vbDy);
  }

  function handleBgPointerUp(e: PointerEvent<SVGRectElement>) {
    if (panningPointerId === null) return;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setPanningPointerId(null);
    panStartRef.current = null;
  }

  function resetView() {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }

  return {
    zoom,
    viewX,
    viewY,
    viewW,
    viewH,
    panningPointerId,
    hasPannedRef,
    zoomBy,
    screenToViewBox,
    resetView,
    bgPointerHandlers: {
      onPointerDown: handleBgPointerDown,
      onPointerMove: handleBgPointerMove,
      onPointerUp: handleBgPointerUp,
      onPointerCancel: handleBgPointerUp,
    },
    /** Wiring for `<ChartZoomControls {...zoomControlProps} />` — identical at every call site. */
    zoomControlProps: {
      onZoomIn: () => zoomBy(CHART_ZOOM_STEP),
      onZoomOut: () => zoomBy(1 / CHART_ZOOM_STEP),
      canZoomIn: zoom < CHART_ZOOM_MAX,
      canZoomOut: zoom > CHART_ZOOM_MIN,
    },
  };
}
