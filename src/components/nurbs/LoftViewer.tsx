import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { sampleClosedBezier, buildLoftMesh, interpolateProfileAtY } from '@/lib/loftGeometry';
import { createViewerRenderer, createDampedOrbitControls, disposeSceneObjects } from '@/lib/threeViewerSetup';

export interface PlaneProfile {
  id: string;
  y: number;
  anchors: [number, number][]; // [x, z] pairs on XZ plane
}

interface LoftViewerProps {
  planes: PlaneProfile[];
  solid: boolean;
  ruled: boolean;
  showWireframe: boolean;
  showSurface: boolean;
  showPlanes: boolean;
  loftTrigger: number;
  selectedPlaneIdx: number | null;
  edgePlacementMode: boolean;
  onEdgePlaced?: (y: number) => void;
  onStatsUpdate?: (stats: { faces: number; edges: number; vertices: number }) => void;
}

export function LoftViewer({
  planes,
  solid: _solid,
  ruled,
  showWireframe,
  showSurface,
  showPlanes,
  selectedPlaneIdx,
  loftTrigger,
  edgePlacementMode,
  onEdgePlaced,
  onStatsUpdate,
}: LoftViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    loftGroup: THREE.Group;
    planeGroup: THREE.Group;
    previewGroup: THREE.Group;
    previewRing: THREE.LineLoop;
    previewDisc: THREE.Mesh;
    animId: number;
  } | null>(null);
  const edgeModeRef = useRef(edgePlacementMode);
  const onEdgePlacedRef = useRef(onEdgePlaced);
  const planesRef = useRef(planes);

  // Keep refs in sync
  edgeModeRef.current = edgePlacementMode;
  onEdgePlacedRef.current = onEdgePlaced;
  planesRef.current = planes;

  // Initialize scene once
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    const canvas = document.createElement('canvas');
    canvas.width = 2; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1a1a1a');
    grad.addColorStop(0.5, '#2a2a2a');
    grad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 512);
    scene.background = new THREE.CanvasTexture(canvas);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(8, 6, 8);

    const renderer = createViewerRenderer(container, width, height);

    const controls = createDampedOrbitControls(camera, renderer);
    controls.target.set(0, 3, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(15, 20, 10);
    scene.add(sun);
    scene.add(new THREE.DirectionalLight(0x4488ff, 0.3).translateX(-10).translateY(5));

    const grid = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
    grid.position.y = -0.5;
    (grid.material as THREE.Material).opacity = 0.4;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);
    scene.add(new THREE.AxesHelper(3).translateY(-0.5));

    const loftGroup = new THREE.Group();
    scene.add(loftGroup);
    const planeGroup = new THREE.Group();
    scene.add(planeGroup);
    const previewGroup = new THREE.Group();
    scene.add(previewGroup);

    // Persistent edge-placement preview — created once, reused on every
    // mousemove (no per-move geometry/material alloc + dispose churn)
    const RING_CAPACITY = 256; // max sampled points in the preview ring
    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RING_CAPACITY * 3), 3));
    ringGeo.setAttribute('lineDistance', new THREE.BufferAttribute(new Float32Array(RING_CAPACITY), 1));
    const ringMat = new THREE.LineDashedMaterial({
      color: 0xffcc00,
      dashSize: 0.15,
      gapSize: 0.08,
      linewidth: 1,
    });
    const previewRing = new THREE.LineLoop(ringGeo, ringMat);
    previewRing.frustumCulled = false; // buffer is updated in place
    previewRing.visible = false;
    previewGroup.add(previewRing);

    const discGeo = new THREE.PlaneGeometry(8, 8);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const previewDisc = new THREE.Mesh(discGeo, discMat);
    previewDisc.rotation.x = -Math.PI / 2;
    previewDisc.visible = false;
    previewGroup.add(previewDisc);

    // Raycaster for edge placement
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();



    const onMouseMove = (event: MouseEvent) => {
      if (!edgeModeRef.current) {
        // Hide preview when not in edge mode
        previewRing.visible = false;
        previewDisc.visible = false;
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast against the loft mesh
      raycaster.setFromCamera(mouse, camera);
      const loftMeshes = loftGroup.children.filter(c => c instanceof THREE.Mesh);
      const intersects = raycaster.intersectObjects(loftMeshes, false);

      // Hide preview until a valid hit is found
      previewRing.visible = false;
      previewDisc.visible = false;

      if (intersects.length > 0) {
        const hitY = intersects[0].point.y;
        const interpolated = interpolateProfileAtY(planesRef.current, hitY);

        if (interpolated) {
          const { clampedY, curveXZ } = interpolated;
          const pts = curveXZ.map(([x, z]) => new THREE.Vector3(x, clampedY, z));

          // Preview ring (dashed line) — update the persistent buffers in place
          const loopPts = [...pts, pts[0]];
          const count = Math.min(loopPts.length, RING_CAPACITY);
          const posAttr = ringGeo.getAttribute('position') as THREE.BufferAttribute;
          const distAttr = ringGeo.getAttribute('lineDistance') as THREE.BufferAttribute;
          let dist = 0;
          for (let i = 0; i < count; i++) {
            const pt = loopPts[i];
            posAttr.setXYZ(i, pt.x, pt.y, pt.z);
            if (i > 0) dist += pt.distanceTo(loopPts[i - 1]);
            distAttr.setX(i, dist);
          }
          posAttr.needsUpdate = true;
          distAttr.needsUpdate = true;
          ringGeo.setDrawRange(0, count);
          previewRing.visible = true;

          // Semi-transparent disc
          previewDisc.position.y = clampedY;
          previewDisc.visible = true;

          // Store Y for click handler
          previewGroup.userData.pendingY = clampedY;
        }

        renderer.domElement.style.cursor = 'crosshair';
      } else {
        renderer.domElement.style.cursor = edgeModeRef.current ? 'crosshair' : 'grab';
        previewGroup.userData.pendingY = null;
      }
    };

    const onClick = (_event: MouseEvent) => {
      if (!edgeModeRef.current) return;
      if (previewGroup.userData.pendingY != null) {
        onEdgePlacedRef.current?.(previewGroup.userData.pendingY);
      }
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);

    const animate = () => {
      const id = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      if (sceneRef.current) sceneRef.current.animId = id;
    };
    const animId = requestAnimationFrame(animate);

    sceneRef.current = { scene, camera, renderer, controls, loftGroup, planeGroup, previewGroup, previewRing, previewDisc, animId };

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      cancelAnimationFrame(sceneRef.current?.animId || animId);
      controls.dispose();
      // Dispose every geometry/material still in the scene (loft, plane
      // previews, edge-placement preview, grid, axes)
      disposeSceneObjects(scene);
      (scene.background as THREE.Texture).dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, []);

  // Update plane previews when planes change
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;

    // Clear old plane visuals
    while (s.planeGroup.children.length > 0) {
      const child = s.planeGroup.children[0];
      s.planeGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    if (!showPlanes) return;

    planes.forEach((plane, idx) => {
      const isSelected = idx === selectedPlaneIdx;
      const color = isSelected ? 0xffcc00 : 0xffffff;
      const lineOpacity = isSelected ? 1.0 : 0.5;
      const planeOpacity = isSelected ? 0.08 : 0.03;

      // Semi-transparent plane
      const planeGeo = new THREE.PlaneGeometry(8, 8);
      const planeMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: planeOpacity, side: THREE.DoubleSide, depthWrite: false });
      const planeMesh = new THREE.Mesh(planeGeo, planeMat);
      planeMesh.rotation.x = -Math.PI / 2;
      planeMesh.position.y = plane.y;
      s.planeGroup.add(planeMesh);

      // Profile curve
      if (plane.anchors.length >= 3) {
        const curveXZ = sampleClosedBezier(plane.anchors);
        const lineVerts: number[] = [];
        for (let i = 0; i < curveXZ.length; i++) {
          const a = curveXZ[i];
          const b = curveXZ[(i + 1) % curveXZ.length];
          lineVerts.push(a[0], plane.y, a[1], b[0], plane.y, b[1]);
        }
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineVerts, 3));
        const lineMat = new THREE.LineBasicMaterial({ color, opacity: lineOpacity, transparent: true });
        s.planeGroup.add(new THREE.LineSegments(lineGeo, lineMat));

        // Anchor spheres
        const sphereGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const sphereMat = new THREE.MeshBasicMaterial({ color });
        plane.anchors.forEach(([x, z]) => {
          const sphere = new THREE.Mesh(sphereGeo, sphereMat);
          sphere.position.set(x, plane.y, z);
          s.planeGroup.add(sphere);
        });
      }
    });
  }, [planes, showPlanes, selectedPlaneIdx]);

  // Build loft when triggered
  useEffect(() => {
    const s = sceneRef.current;
    if (!s || loftTrigger === 0) return;

    // Clear old loft
    while (s.loftGroup.children.length > 0) {
      const child = s.loftGroup.children[0];
      s.loftGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    const validPlanes = planes.filter(p => p.anchors.length >= 3);
    if (validPlanes.length < 2) {
      onStatsUpdate?.({ faces: 0, edges: 0, vertices: 0 });
      return;
    }

    // Sample all profiles to same point count
    const sampleCount = 48;
    const profiles = validPlanes.map(p => ({
      y: p.y,
      points: sampleClosedBezier(p.anchors, sampleCount),
    }));

    // Ensure all have same length
    const minLen = Math.min(...profiles.map(p => p.points.length));
    profiles.forEach(p => { p.points = p.points.slice(0, minLen); });

    const interpolationSteps = 8;
    const { vertices, normals, indices, quadEdges } = buildLoftMesh(profiles, interpolationSteps, ruled);

    if (vertices.length === 0) return;

    // Surface mesh
    if (showSurface) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geo.setIndex(indices);

      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x4488cc,
        metalness: 0.2,
        roughness: 0.4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      s.loftGroup.add(mesh);
    }

    // Quad wireframe
    if (showWireframe && quadEdges.length > 0) {
      const edgeGeo = new THREE.BufferGeometry();
      edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(quadEdges, 3));
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x88ccff, opacity: 0.6, transparent: true });
      s.loftGroup.add(new THREE.LineSegments(edgeGeo, edgeMat));
    }

    // Stats
    const quadCount = indices.length / 6; // 2 triangles per quad
    onStatsUpdate?.({
      faces: quadCount,
      edges: quadEdges.length / 6, // 2 vertices per edge, 3 components each
      vertices: vertices.length / 3,
    });

  }, [loftTrigger, planes, ruled, showWireframe, showSurface, onStatsUpdate]);

  // Toggle OrbitControls when in edge placement mode
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.controls.enabled = !edgePlacementMode;
    if (edgePlacementMode) {
      s.renderer.domElement.style.cursor = 'crosshair';
    } else {
      s.renderer.domElement.style.cursor = 'grab';
      // Hide preview (persistent objects — disposed on unmount)
      s.previewRing.visible = false;
      s.previewDisc.visible = false;
    }
  }, [edgePlacementMode]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {edgePlacementMode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="bg-black/80 border border-yellow-400/50 rounded-lg px-4 py-2">
            <span className="text-sm text-yellow-300 font-medium">Edge Placement Mode — hover over geometry, click to place</span>
          </div>
        </div>
      )}
    </div>
  );
}
