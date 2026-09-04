import * as THREE from 'three';

/**
 * Static base scene shared by every full-bleed Three.js viewer (OccViewer):
 * gradient background, camera, lights, a shadow-receiving ground plane, and the
 * spinning "loading" ring placeholder. Pure Three.js object construction —
 * no React lifecycle here, so callers own mounting the renderer's canvas and
 * disposing everything on unmount.
 */
export function createViewerScene(width: number, height: number) {
  const scene = new THREE.Scene();

  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 2; bgCanvas.height = 512;
  const bgCtx = bgCanvas.getContext('2d')!;
  const grad = bgCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0,   '#e8edf2');
  grad.addColorStop(0.5, '#f1f5f9');
  grad.addColorStop(1,   '#dde3ea');
  bgCtx.fillStyle = grad;
  bgCtx.fillRect(0, 0, 2, 512);
  scene.background = new THREE.CanvasTexture(bgCanvas);

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 5000);
  // Pulled back to keep the 100-unit reference grid mostly in frame by default
  // (auto-fit is disabled, so this initial framing is what most loads see).
  camera.position.set(30, 18, 40);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // Hemisphere (sky/ground) ambient instead of a flat AmbientLight — gives every
  // surface a subtle top-vs-bottom gradient even where no direct light reaches it,
  // which reads as "real" shading rather than a flat silhouette.
  scene.add(new THREE.HemisphereLight(0xf3f7fb, 0x8891a0, 0.65));

  // Three-point rig so a double-sided shell (e.g. a thin blade) shows visible
  // shading on whichever face you're looking at, not just the one the single old
  // key light happened to hit — key (casts the shadow), fill (softer, opposite
  // side), and a low rim/back light so the far side isn't left flat and unlit.
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
  keyLight.position.set(12, 18, 10);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left   = -50;
  keyLight.shadow.camera.right  = 50;
  keyLight.shadow.camera.top    = 50;
  keyLight.shadow.camera.bottom = -50;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc8d8e8, 0.55);
  fillLight.position.set(-10, 6, -6);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xe6edf5, 0.4);
  rimLight.position.set(-6, -10, 8);
  scene.add(rimLight);

  const groundGeo = new THREE.PlaneGeometry(500, 500);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.08 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Fixed-size scale reference: with auto-fit disabled, the camera no longer
  // zooms to match each loaded object's bounding box, so two objects with
  // different real-world scale (e.g. different nominal_radius) actually look
  // different-sized — this grid gives the eye something stationary to judge
  // that size against. 100 world units across, 5-unit cells, sitting on the
  // same plane as the shadow ground.
  const grid = new THREE.GridHelper(100, 20, 0x94a3b8, 0xd1d5db);
  grid.position.y = -2;
  scene.add(grid);

  const ringGeo = new THREE.TorusGeometry(2, 0.15, 16, 60);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xcbd5e1, wireframe: true });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  scene.add(ring);

  return { scene, camera, renderer, ground, groundGeo, groundMat, ring, ringGeo, ringMat };
}

/** Fits `camera`/`controls`/`ground` to the bounding box of `roots`.
 *  Returns the geometry's `maxDim`, needed by `updateGroundFade` below. */
export function fitViewerSceneToBounds(
  roots: THREE.Object3D[],
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; minDistance: number; maxDistance: number; update: () => void },
  ground: THREE.Mesh,
): number | null {
  if (roots.length === 0) return null;
  const box = new THREE.Box3();
  roots.forEach((r) => box.expandByObject(r));
  if (box.isEmpty()) return null;

  const center  = box.getCenter(new THREE.Vector3());
  const size    = box.getSize(new THREE.Vector3());
  const maxDim  = Math.max(size.x, size.y, size.z);
  const fitDist = maxDim * 2.0;

  camera.position.set(
    center.x + fitDist * 0.55,
    center.y + fitDist * 0.38,
    center.z + fitDist,
  );
  camera.near = maxDim * 0.001;
  camera.far  = maxDim * 100;
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.minDistance = maxDim * 0.05;
  controls.maxDistance = maxDim * 20;
  controls.update();

  const groundY = box.min.y - maxDim * 0.015;
  ground.position.y = groundY;

  return maxDim;
}

/**
 * The shadow-receiving ground plane sits very close beneath the loaded geometry (see
 * `groundY` above) — a thin, mostly-flat result (e.g. a blade shell) viewed close up
 * from underneath or behind lets the camera look straight through the open space below
 * it, right at that nearby floor. Fading it out as the camera zooms in past the object's
 * own size keeps it from reading as part of the object, while leaving the shadow visible
 * at the normal fitted-overview distance.
 */
export function updateGroundFade(
  camera: THREE.Camera,
  target: THREE.Vector3,
  ground: THREE.Mesh,
  groundMat: THREE.ShadowMaterial,
  maxDim: number,
  baseGroundOpacity: number,
) {
  const dist = camera.position.distanceTo(target);
  const fadeInEnd = maxDim * 0.6;
  const fadeInStart = maxDim * 0.3;
  // maxDim === 0 (degenerate/empty geometry) would otherwise divide by zero.
  const t = fadeInEnd === fadeInStart ? 1 : Math.max(0, Math.min(1, (dist - fadeInStart) / (fadeInEnd - fadeInStart)));
  groundMat.opacity = baseGroundOpacity * t;
  ground.visible = t > 0.001;
}
