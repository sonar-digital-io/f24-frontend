import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface BackgroundSceneProps {
  wireframe?: boolean;
}

/**
 * A simplified 3D background scene with a box and orbit controls.
 * No selection, no editing — just view controls (rotate, zoom, pan).
 */
export function BackgroundScene({ wireframe = false }: BackgroundSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const wireframeLineRef = useRef<THREE.LineSegments | null>(null);

  // Update wireframe mode without re-creating the scene
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.opacity = wireframe ? 0 : 0.85;
      materialRef.current.needsUpdate = true;
    }
    if (wireframeLineRef.current) {
      wireframeLineRef.current.material = new THREE.LineBasicMaterial({
        color: wireframe ? 0x4488cc : 0x88bbee,
        opacity: wireframe ? 0.9 : 0.5,
        transparent: true,
      });
    }
  }, [wireframe]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let w = container.clientWidth || 800;
    let h = container.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();

    // Transparent / gradient background
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#e8ecf0');
    grad.addColorStop(0.5, '#f0f2f5');
    grad.addColorStop(1, '#e4e8ec');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 512);
    scene.background = new THREE.CanvasTexture(canvas);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    camera.position.set(4, 3, 5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Controls — view only
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.target.set(0, 0.5, 0);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Grid
    const grid = new THREE.GridHelper(10, 10, 0xcccccc, 0xdddddd);
    grid.position.y = -0.01;
    (grid.material as THREE.Material).opacity = 0.4;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    // Box geometry
    const geometry = new THREE.BoxGeometry(2, 1.5, 2, 3, 3, 3);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4488cc,
      metalness: 0.2,
      roughness: 0.5,
      transparent: true,
      opacity: wireframe ? 0 : 0.85,
    });
    materialRef.current = material;
    const box = new THREE.Mesh(geometry, material);
    box.position.y = 0.75;
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);

    // Wireframe overlay
    const wireGeo = new THREE.EdgesGeometry(geometry);
    const wireMat = new THREE.LineBasicMaterial({
      color: wireframe ? 0x4488cc : 0x88bbee,
      opacity: wireframe ? 0.9 : 0.5,
      transparent: true,
    });
    const wireframeLines = new THREE.LineSegments(wireGeo, wireMat);
    wireframeLineRef.current = wireframeLines;
    wireframeLines.position.copy(box.position);
    scene.add(wireframeLines);

    // Ground plane (shadow receiver)
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.08 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Animate
    let animId: number;
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

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
      geometry.dispose();
      material.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}
