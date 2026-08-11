/**
 * True 3D isometric-style view of the layup stack: each ply is a Three.js box
 * mesh, stacked on top of each other (index 0 = top of stack, drawn highest
 * on the Y axis). Plies taper going up the stack (each one a bit narrower in
 * X/Z than the one below).
 *
 * Fiber orientation is modeled literally as a stack of parallel "sheets of
 * paper" running through the ply at the orientation angle, evenly spaced and
 * clipped to the ply's own footprint (real geometry, analytically clipped to
 * the box's X/Z bounds — not a baked 2D texture). See lib/plyStackGeometry.ts
 * for the mesh-building details.
 *
 * Camera/controls mirror OccViewer: OrbitControls (left-drag rotate, scroll
 * zoom, right-drag pan). The renderer/camera/controls persist across ply
 * edits — only the ply meshes are rebuilt when `plies` changes, and the
 * camera only auto-fits when the set of plies (added/removed) changes, not
 * on every thickness/orientation/material tweak, so the user's view doesn't
 * jump around while editing.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { disposeObject3D, rebuildPlyStackMeshes } from '@/lib/plyStackGeometry';
import type { Ply } from '@/components/layup/LayupBuilder';
import type { Material } from '@/api/types/materials';

interface PlyStackVizProps {
  plies: Ply[]; // top of stack = index 0
  materials: Material[];
  className?: string;
}

export function PlyStackViz({ plies, materials, className }: PlyStackVizProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const fittedKeyRef = useRef<string | null>(null);

  // ── One-time scene/camera/renderer/controls setup ─────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const w = container.clientWidth || 400;
    const h = container.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
    camera.position.set(6, 5, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(6, 10, 6);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xc8d8e8, 0.4);
    fillLight.position.set(-6, 4, -6);
    scene.add(fillLight);

    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (!nw || !nh) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animId);
      controls.dispose();
      scene.traverse(disposeObject3D);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      groupRef.current = null;
    };
  }, []);

  // ── Rebuild ply meshes whenever the ply data changes ──────────────────────
  useEffect(() => {
    const group = groupRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!group || !camera || !controls) return;

    rebuildPlyStackMeshes(group, plies, materials);

    // Auto-fit the camera only when the set of plies changes (add/remove),
    // not on every property edit, so the user's rotation/zoom is preserved.
    const fitKey = plies.map((p) => p.id).join(',');
    if (fitKey !== fittedKeyRef.current) {
      fittedKeyRef.current = fitKey;
      const box = new THREE.Box3().setFromObject(group);
      if (!box.isEmpty()) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 1);
        const fitDist = maxDim * 2.2;
        camera.position.set(center.x + fitDist * 0.7, center.y + fitDist * 0.55, center.z + fitDist * 0.7);
        camera.near = maxDim * 0.01;
        camera.far = maxDim * 100;
        camera.updateProjectionMatrix();
        controls.target.copy(center);
        controls.minDistance = maxDim * 0.2;
        controls.maxDistance = maxDim * 20;
        controls.update();
      }
    }
  }, [plies, materials]);

  return <div ref={containerRef} className={className} aria-label="Layup ply stack 3D visualization" />;
}
