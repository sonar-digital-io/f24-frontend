import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildNurbsSurfaceObjects } from '@/lib/nurbsGeometry';
import { createViewerRenderer, createDampedOrbitControls, disposeSceneObjects } from '@/lib/threeViewerSetup';
import type { NurbsGeometryType } from '@/types';

interface NurbsViewerProps {
  subdivisionsU: number;
  subdivisionsV: number;
  showWireframe: boolean;
  showSurface: boolean;
  showControlPoints: boolean;
  geometryType: NurbsGeometryType;
}

export function NurbsViewer({
  subdivisionsU,
  subdivisionsV,
  showWireframe,
  showSurface,
  showControlPoints,
  geometryType,
}: NurbsViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);
  // Long-lived scene objects shared between the effects below
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
  } | null>(null);
  // Rebuildable surface objects (replaced when subdivisions / geometry change)
  const surfaceRef = useRef<{
    surfaceMesh: THREE.Mesh;
    wireframeLines: THREE.LineSegments;
    cpGroup: THREE.Group;
  } | null>(null);

  // Scene setup — renderer, camera, controls, lights. Runs once on mount.
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let width = container.clientWidth;
    let height = container.clientHeight;

    if (width === 0 || height === 0) {
      width = 800;
      height = 600;
    }

    // Scene
    const scene = new THREE.Scene();

    // Dark gradient background
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const skyTexture = new THREE.CanvasTexture(canvas);
    scene.background = skyTexture;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(12, 8, 12);

    // Renderer
    const renderer = createViewerRenderer(container, width, height, THREE.PCFSoftShadowMap);

    // Controls
    const controls = createDampedOrbitControls(camera, renderer);
    controls.minDistance = 3;
    controls.maxDistance = 50;
    controls.target.set(0, 0, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(15, 20, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-10, 5, -10);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xff8844, 0.2);
    backLight.position.set(0, -5, -15);
    scene.add(backLight);

    // Subtle grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x333355, 0x222244);
    gridHelper.position.y = -3;
    (gridHelper.material as THREE.Material).opacity = 0.4;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    // Axis helper
    const axesHelper = new THREE.AxesHelper(3);
    axesHelper.position.y = -3;
    scene.add(axesHelper);

    sceneRef.current = { scene, camera, renderer, controls };

    // =============================================
    // Animation
    // =============================================
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const onWindowResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // Reset camera
    const resetCamera = () => {
      camera.position.set(12, 8, 12);
      controls.target.set(0, 0, 0);
      controls.update();
    };
    resetCameraRef.current = resetCamera;

    // Cleanup
    return () => {
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      // Dispose every geometry/material still in the scene (surface, wireframe,
      // control points, grid, axes)
      disposeSceneObjects(scene);
      skyTexture.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      surfaceRef.current = null;
      resetCameraRef.current = null;
    };
  }, []);

  // Rebuild surface / wireframe / control points when the geometry parameters
  // change — renderer, camera and controls above are left untouched.
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    const { scene } = s;

    // Dispose the previous surface objects before replacing them
    const old = surfaceRef.current;
    if (old) {
      scene.remove(old.surfaceMesh, old.wireframeLines, old.cpGroup);
      old.surfaceMesh.geometry.dispose();
      (old.surfaceMesh.material as THREE.Material).dispose();
      old.wireframeLines.geometry.dispose();
      (old.wireframeLines.material as THREE.Material).dispose();
      old.cpGroup.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      surfaceRef.current = null;
    }

    const { surfaceMesh, wireframeLines, cpGroup } = buildNurbsSurfaceObjects(
      geometryType,
      subdivisionsU,
      subdivisionsV,
      showSurface,
      showWireframe,
      showControlPoints,
    );
    scene.add(surfaceMesh, wireframeLines, cpGroup);

    surfaceRef.current = { surfaceMesh, wireframeLines, cpGroup };
    // Visibility props are applied here on build and by the toggle effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdivisionsU, subdivisionsV, geometryType]);

  // Visibility toggles — flip flags only, no rebuild
  useEffect(() => {
    const s = surfaceRef.current;
    if (!s) return;
    (s.surfaceMesh.material as THREE.MeshPhysicalMaterial).opacity = showSurface ? 0.85 : 0;
    s.wireframeLines.visible = showWireframe;
    s.cpGroup.visible = showControlPoints;
  }, [showWireframe, showSurface, showControlPoints]);

  return <div ref={containerRef} className="w-full h-full" />;
}
