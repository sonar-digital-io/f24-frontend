import { forwardRef, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';

export interface CoordinateGizmoHandle {
  /** Re-projects each axis arrow from the main viewport camera's current
   *  orientation — call every animation frame so the arrows keep pointing
   *  along the true world X/Y/Z axes as the camera orbits. */
  updateOrientation: (cameraQuaternion: THREE.Quaternion) => void;
}

const AXES: { dir: THREE.Vector3; color: string; label: string }[] = [
  { dir: new THREE.Vector3(1, 0, 0), color: '#dc2626', label: 'x' },
  { dir: new THREE.Vector3(0, 1, 0), color: '#16a34a', label: 'y' },
  { dir: new THREE.Vector3(0, 0, 1), color: '#2563eb', label: 'z' },
];

const CENTER = 50;
const RADIUS = 35;

/** Small XYZ axis indicator overlaid on a 3D viewport (bottom-left convention) —
 *  each arrow's screen direction is computed from the real camera orientation
 *  (world axis projected into camera space via the inverse camera quaternion),
 *  so it tracks the main viewport as it orbits instead of showing a fixed picture. */
export const CoordinateGizmo = forwardRef<CoordinateGizmoHandle>(function CoordinateGizmo(
  _props,
  ref,
) {
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const textRefs = useRef<(SVGTextElement | null)[]>([]);
  const invQuat = useRef(new THREE.Quaternion());
  const projected = useRef(new THREE.Vector3());

  useImperativeHandle(ref, () => ({
    updateOrientation(cameraQuaternion: THREE.Quaternion) {
      invQuat.current.copy(cameraQuaternion).invert();
      AXES.forEach((axis, i) => {
        projected.current.copy(axis.dir).applyQuaternion(invQuat.current);
        const x = CENTER + projected.current.x * RADIUS;
        const y = CENTER - projected.current.y * RADIUS;

        lineRefs.current[i]?.setAttribute('x2', String(x));
        lineRefs.current[i]?.setAttribute('y2', String(y));
        dotRefs.current[i]?.setAttribute('cx', String(x));
        dotRefs.current[i]?.setAttribute('cy', String(y));
        textRefs.current[i]?.setAttribute('x', String(x + (x >= CENTER ? 5 : -10)));
        textRefs.current[i]?.setAttribute('y', String(y + (y >= CENTER ? 9 : -4)));
      });
    },
  }));

  return (
    <svg viewBox="0 0 100 100" className="h-40 w-40" aria-hidden="true">
      {AXES.map((axis, i) => (
        <g key={axis.label}>
          <line
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            x1={CENTER}
            y1={CENTER}
            x2={CENTER}
            y2={CENTER}
            stroke={axis.color}
            strokeWidth="2"
          />
          <circle
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            cx={CENTER}
            cy={CENTER}
            r="3"
            fill={axis.color}
          />
          <text
            ref={(el) => {
              textRefs.current[i] = el;
            }}
            x={CENTER}
            y={CENTER}
            fontSize="9"
            fill={axis.color}
          >
            {axis.label}
          </text>
        </g>
      ))}
    </svg>
  );
});
