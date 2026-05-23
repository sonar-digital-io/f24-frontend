import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface BladeSceneProps {
  wireframe?: boolean;
}

/**
 * Three.js 3D scene for the geometry editor. Shows a placeholder tapered blade
 * with orbit controls. The blade is a BoxGeometry whose vertices are scaled
 * along the chord/height axes proportional to root→tip distance, giving it a
 * blade-like silhouette. Replace with real B-Rep blade once OpenCascade pipeline
 * is wired in.
 */
export function BladeScene({ wireframe = false }: BladeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const wireframeLineRef = useRef<THREE.LineSegments | null>(null);

  // Update wireframe mode without re-creating the scene
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.opacity = wireframe ? 0 : 0.9;
      materialRef.current.needsUpdate = true;
    }
    if (wireframeLineRef.current) {
      const mat = wireframeLineRef.current.material as THREE.LineBasicMaterial;
      mat.color.setHex(wireframe ? 0x475569 : 0x64748b);
      mat.opacity = wireframe ? 0.85 : 0.35;
      mat.needsUpdate = true;
    }
  }, [wireframe]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;

    // Scene + gradient background
    const scene = new THREE.Scene();
    const bg = document.createElement('canvas');
    bg.width = 2;
    bg.height = 512;
    const bgCtx = bg.getContext('2d')!;
    const grad = bgCtx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#f1f5f9');
    grad.addColorStop(0.6, '#f8fafc');
    grad.addColorStop(1, '#e2e8f0');
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, 2, 512);
    scene.background = new THREE.CanvasTexture(bg);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(8, 4, 12);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Orbit controls (view-only)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 4;
    controls.maxDistance = 40;
    controls.target.set(4, 0, 0);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(8, 12, 8);
    keyLight.castShadow = true;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xc8d4e0, 0.3);
    fillLight.position.set(-5, -2, -5);
    scene.add(fillLight);

    // Ground grid + shadow plane
    const grid = new THREE.GridHelper(40, 40, 0xcbd5e1, 0xe2e8f0);
    grid.position.y = -1.5;
    (grid.material as THREE.Material).opacity = 0.45;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;
    ground.receiveShadow = true;
    scene.add(ground);

    // Blade geometry: elongated box with taper applied per-vertex
    const bladeGeo = new THREE.BoxGeometry(12, 0.6, 2, 24, 2, 4);
    const positions = bladeGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      // x in [-6, 6]; root at x=-6, tip at x=+6
      const t = (x + 6) / 12; // 0..1
      // Taper: chord goes 1.0 -> 0.15, height goes 1.0 -> 0.1
      const chordScale = 1.0 - t * 0.85;
      const heightScale = 1.0 - t * 0.9;
      positions.setY(i, positions.getY(i) * heightScale);
      positions.setZ(i, positions.getZ(i) * chordScale);
    }
    positions.needsUpdate = true;
    bladeGeo.computeVertexNormals();

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.15,
      roughness: 0.55,
      transparent: true,
      opacity: wireframe ? 0 : 0.9,
    });
    materialRef.current = bladeMat;
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    // Pivot at root: translate so x=-6 sits at world origin
    blade.position.x = 6;
    blade.castShadow = true;
    blade.receiveShadow = true;
    scene.add(blade);

    // Wireframe edges
    const edgeGeo = new THREE.EdgesGeometry(bladeGeo, 20);
    const edgeMat = new THREE.LineBasicMaterial({
      color: wireframe ? 0x475569 : 0x64748b,
      opacity: wireframe ? 0.85 : 0.35,
      transparent: true,
    });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    wireframeLineRef.current = edges;
    edges.position.copy(blade.position);
    scene.add(edges);

    // Animate
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', onResize);

    // ResizeObserver for parent size changes (e.g. when sidebar layout changes)
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      cancelAnimationFrame(animId);
      bladeGeo.dispose();
      bladeMat.dispose();
      edgeGeo.dispose();
      edgeMat.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}
