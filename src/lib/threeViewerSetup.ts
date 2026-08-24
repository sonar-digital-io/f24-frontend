import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/** WebGL renderer with the tone-mapping/shadow settings shared by `LoftViewer`
 *  and `NurbsViewer`, mounted into `container`. */
export function createViewerRenderer(
  container: HTMLElement,
  width: number,
  height: number,
  shadowMapType?: THREE.ShadowMapType,
): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  if (shadowMapType !== undefined) renderer.shadowMap.type = shadowMapType;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);
  return renderer;
}

/** Damped `OrbitControls` — callers set their own target/min/maxDistance. */
export function createDampedOrbitControls(camera: THREE.Camera, renderer: THREE.WebGLRenderer): OrbitControls {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  return controls;
}

/** Disposes every mesh/line geometry+material still in `scene` — the boilerplate
 *  every Three.js viewer repeats on unmount. */
export function disposeSceneObjects(scene: THREE.Scene): void {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
      obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => m.dispose());
    }
  });
}
