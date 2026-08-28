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

/** Disposes every mesh/line geometry+material(+texture) still in `scene` — the
 *  boilerplate every Three.js viewer repeats on unmount. */
export function disposeSceneObjects(scene: THREE.Scene): void {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
      obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        Object.values(m).forEach((v) => { if (v instanceof THREE.Texture) v.dispose(); });
        m.dispose();
      });
    }
  });
}

/** The true wireframe of `geometry` (every triangle edge, via `THREE.WireframeGeometry`) as
 *  a standalone `LineSegments` — unlike an edges-only overlay, this doesn't hide the solid
 *  fill underneath it and shows every facet, not just hard edges. */
export function createWireframeOverlay(geometry: THREE.BufferGeometry, color = 0x9ca3af): THREE.LineSegments {
  const webGeo = new THREE.WireframeGeometry(geometry);
  const webMat = new THREE.LineBasicMaterial({ color });
  return new THREE.LineSegments(webGeo, webMat);
}
