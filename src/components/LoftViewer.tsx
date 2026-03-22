import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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

// Sample a closed cubic Bézier spline through anchor points
function sampleClosedBezier(anchors: [number, number][], samples = 48): [number, number][] {
  const n = anchors.length;
  if (n < 3) return anchors;

  const result: [number, number][] = [];
  const samplesPerSeg = Math.max(4, Math.floor(samples / n));

  for (let i = 0; i < n; i++) {
    const p0 = anchors[i];
    const p3 = anchors[(i + 1) % n];
    const prev = anchors[(i - 1 + n) % n];
    const next = anchors[(i + 2) % n];

    const t0x = (p3[0] - prev[0]) * 0.25;
    const t0z = (p3[1] - prev[1]) * 0.25;
    const t3x = (next[0] - p0[0]) * 0.25;
    const t3z = (next[1] - p0[1]) * 0.25;

    const cp1: [number, number] = [p0[0] + t0x, p0[1] + t0z];
    const cp2: [number, number] = [p3[0] - t3x, p3[1] - t3z];

    for (let s = 0; s < samplesPerSeg; s++) {
      const t = s / samplesPerSeg;
      const mt = 1 - t;
      const x = mt * mt * mt * p0[0] + 3 * mt * mt * t * cp1[0] + 3 * mt * t * t * cp2[0] + t * t * t * p3[0];
      const z = mt * mt * mt * p0[1] + 3 * mt * mt * t * cp1[1] + 3 * mt * t * t * cp2[1] + t * t * t * p3[1];
      result.push([x, z]);
    }
  }

  return result;
}

// Build lofted mesh between profiles (pure Three.js)
function buildLoftMesh(
  profiles: { y: number; points: [number, number][] }[],
  interpolationSteps: number,
  ruled: boolean
): { vertices: number[]; normals: number[]; indices: number[]; quadEdges: number[] } {
  if (profiles.length < 2) return { vertices: [], normals: [], indices: [], quadEdges: [] };

  // Sort profiles by Y
  const sorted = [...profiles].sort((a, b) => a.y - b.y);

  // Ensure all profiles have the same number of points
  const pointCount = sorted[0].points.length;

  // Build ring layers: original profiles + interpolated rings between them
  const rings: THREE.Vector3[][] = [];

  for (let p = 0; p < sorted.length - 1; p++) {
    const profA = sorted[p];
    const profB = sorted[p + 1];
    const steps = ruled ? 1 : interpolationSteps;

    for (let s = 0; s <= (p === sorted.length - 2 ? steps : steps - 1); s++) {
      const t = s / steps;
      const ring: THREE.Vector3[] = [];
      const y = profA.y + (profB.y - profA.y) * t;

      for (let i = 0; i < pointCount; i++) {
        const ax = profA.points[i][0];
        const az = profA.points[i][1];
        const bx = profB.points[i % profB.points.length][0];
        const bz = profB.points[i % profB.points.length][1];

        // Smooth interpolation (cubic hermite) or linear (ruled)
        let ft: number;
        if (ruled) {
          ft = t;
        } else {
          ft = t * t * (3 - 2 * t); // smoothstep
        }

        const x = ax + (bx - ax) * ft;
        const z = az + (bz - az) * ft;
        ring.push(new THREE.Vector3(x, y, z));
      }
      rings.push(ring);
    }
  }

  // Build mesh from rings
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const quadEdges: number[] = [];

  const ringCount = rings.length;

  // Add vertices
  for (const ring of rings) {
    for (const v of ring) {
      vertices.push(v.x, v.y, v.z);
    }
  }

  // Add quads (as 2 triangles each) + track quad edges
  for (let r = 0; r < ringCount - 1; r++) {
    for (let i = 0; i < pointCount; i++) {
      const ni = (i + 1) % pointCount;

      const a = r * pointCount + i;
      const b = r * pointCount + ni;
      const c = (r + 1) * pointCount + ni;
      const d = (r + 1) * pointCount + i;

      // Two triangles for the quad
      indices.push(a, b, c);
      indices.push(a, c, d);

      // Quad edges (for topology wireframe)
      const va = rings[r][i];
      const vb = rings[r][ni];
      const vc = rings[r + 1][ni];
      const vd = rings[r + 1][i];

      // 4 edges of the quad
      quadEdges.push(va.x, va.y, va.z, vb.x, vb.y, vb.z); // top
      quadEdges.push(vb.x, vb.y, vb.z, vc.x, vc.y, vc.z); // right
      quadEdges.push(vc.x, vc.y, vc.z, vd.x, vd.y, vd.z); // bottom
      quadEdges.push(vd.x, vd.y, vd.z, va.x, va.y, va.z); // left
    }
  }

  // Compute normals
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const normalAttr = geo.getAttribute('normal');
  for (let i = 0; i < normalAttr.count; i++) {
    normals.push(normalAttr.getX(i), normalAttr.getY(i), normalAttr.getZ(i));
  }
  geo.dispose();

  return { vertices, normals, indices, quadEdges };
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
    let width = container.clientWidth || 800;
    let height = container.clientHeight || 600;

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

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
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

    // Raycaster for edge placement
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Invisible horizontal plane for raycasting Y position
    const rayPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // will be oriented per-frame

    const onMouseMove = (event: MouseEvent) => {
      if (!edgeModeRef.current) {
        // Clear preview when not in edge mode
        while (previewGroup.children.length > 0) {
          const c = previewGroup.children[0];
          previewGroup.remove(c);
          if (c instanceof THREE.LineLoop || c instanceof THREE.Mesh) {
            c.geometry.dispose();
            (c.material as THREE.Material).dispose();
          }
        }
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast against the loft mesh
      raycaster.setFromCamera(mouse, camera);
      const loftMeshes = loftGroup.children.filter(c => c instanceof THREE.Mesh);
      const intersects = raycaster.intersectObjects(loftMeshes, false);

      // Clear old preview
      while (previewGroup.children.length > 0) {
        const c = previewGroup.children[0];
        previewGroup.remove(c);
        if (c instanceof THREE.LineLoop || c instanceof THREE.Mesh) {
          c.geometry.dispose();
          (c.material as THREE.Material).dispose();
        }
      }

      if (intersects.length > 0) {
        const hitY = intersects[0].point.y;
        const currentPlanes = planesRef.current;
        const sorted = [...currentPlanes].filter(p => p.anchors.length >= 3).sort((a, b) => a.y - b.y);

        if (sorted.length >= 2) {
          const minY = sorted[0].y;
          const maxY = sorted[sorted.length - 1].y;

          // Clamp Y to between min and max planes
          const clampedY = Math.max(minY, Math.min(maxY, hitY));

          // Find the two surrounding planes and interpolate
          let below = sorted[0];
          let above = sorted[sorted.length - 1];
          for (let i = 0; i < sorted.length - 1; i++) {
            if (clampedY >= sorted[i].y && clampedY <= sorted[i + 1].y) {
              below = sorted[i];
              above = sorted[i + 1];
              break;
            }
          }

          const t = above.y === below.y ? 0.5 : (clampedY - below.y) / (above.y - below.y);
          const anchorCount = Math.min(below.anchors.length, above.anchors.length);

          // Interpolate profile and sample Bézier
          const interpAnchors: [number, number][] = [];
          for (let i = 0; i < anchorCount; i++) {
            interpAnchors.push([
              below.anchors[i][0] + (above.anchors[i][0] - below.anchors[i][0]) * t,
              below.anchors[i][1] + (above.anchors[i][1] - below.anchors[i][1]) * t,
            ]);
          }

          const curveXZ = sampleClosedBezier(interpAnchors, 48);
          const pts = curveXZ.map(([x, z]) => new THREE.Vector3(x, clampedY, z));

          // Preview ring (dashed line)
          const ringGeo = new THREE.BufferGeometry().setFromPoints([...pts, pts[0]]);
          const ringMat = new THREE.LineDashedMaterial({
            color: 0xffcc00,
            dashSize: 0.15,
            gapSize: 0.08,
            linewidth: 1,
          });
          const ring = new THREE.LineLoop(ringGeo, ringMat);
          ring.computeLineDistances();
          previewGroup.add(ring);

          // Semi-transparent disc
          const discGeo = new THREE.PlaneGeometry(8, 8);
          const discMat = new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            transparent: true,
            opacity: 0.04,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const disc = new THREE.Mesh(discGeo, discMat);
          disc.rotation.x = -Math.PI / 2;
          disc.position.y = clampedY;
          previewGroup.add(disc);

          // Store Y for click handler
          previewGroup.userData.pendingY = clampedY;
        }

        renderer.domElement.style.cursor = 'crosshair';
      } else {
        renderer.domElement.style.cursor = edgeModeRef.current ? 'crosshair' : 'grab';
        previewGroup.userData.pendingY = null;
      }
    };

    const onClick = (event: MouseEvent) => {
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

    sceneRef.current = { scene, camera, renderer, controls, loftGroup, planeGroup, previewGroup, animId };

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

  }, [loftTrigger, planes, ruled, showWireframe, showSurface]);

  // Toggle OrbitControls when in edge placement mode
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.controls.enabled = !edgePlacementMode;
    if (edgePlacementMode) {
      s.renderer.domElement.style.cursor = 'crosshair';
    } else {
      s.renderer.domElement.style.cursor = 'grab';
      // Clear preview
      while (s.previewGroup.children.length > 0) {
        const c = s.previewGroup.children[0];
        s.previewGroup.remove(c);
        if (c instanceof THREE.LineLoop || c instanceof THREE.Mesh) {
          c.geometry.dispose();
          (c.material as THREE.Material).dispose();
        }
      }
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
