import * as THREE from 'three';

/**
 * Static base scene shared by every full-bleed Three.js viewer (OccViewer):
 * gradient background, camera, lights, ground grid + shadow plane, and the
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
  camera.position.set(12, 7, 16);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(12, 18, 10);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left   = -50;
  keyLight.shadow.camera.right  = 50;
  keyLight.shadow.camera.top    = 50;
  keyLight.shadow.camera.bottom = -50;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc8d8e8, 0.35);
  fillLight.position.set(-8, 4, -8);
  scene.add(fillLight);

  const grid = new THREE.GridHelper(200, 40, 0xc0ccd8, 0xd4dde6);
  grid.position.y = -2;
  (grid.material as THREE.Material).opacity = 0.5;
  (grid.material as THREE.Material).transparent = true;
  scene.add(grid);

  const groundGeo = new THREE.PlaneGeometry(500, 500);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.08 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2;
  ground.receiveShadow = true;
  scene.add(ground);

  const ringGeo = new THREE.TorusGeometry(2, 0.15, 16, 60);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xcbd5e1, wireframe: true });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  scene.add(ring);

  return { scene, camera, renderer, grid, ground, groundGeo, groundMat, ring, ringGeo, ringMat };
}

/** Fits `camera`/`controls`/`grid`/`ground` to the bounding box of `roots`. */
export function fitViewerSceneToBounds(
  roots: THREE.Object3D[],
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; minDistance: number; maxDistance: number; update: () => void },
  grid: THREE.GridHelper,
  ground: THREE.Mesh,
) {
  if (roots.length === 0) return;
  const box = new THREE.Box3();
  roots.forEach((r) => box.expandByObject(r));
  if (box.isEmpty()) return;

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
  grid.position.y   = groundY;
  ground.position.y = groundY;
  const footprint = Math.max(size.x, size.z) * 3;
  grid.scale.setScalar(footprint / 200);
}
