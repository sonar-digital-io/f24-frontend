/**
 * True 3D isometric-style view of the layup stack: each ply is a Three.js box
 * mesh, stacked on top of each other (index 0 = top of stack, drawn highest
 * on the Y axis). Plies taper going up the stack (each one a bit narrower in
 * X/Z than the one below).
 *
 * Fiber orientation is modeled literally as a stack of parallel "sheets of
 * paper" running through the ply at the orientation angle, evenly spaced and
 * clipped to the ply's own footprint (real geometry, analytically clipped to
 * the box's X/Z bounds — not a baked 2D texture). Wherever a sheet crosses
 * the cuboid's outer surface — top, bottom, or a side wall — that's exactly
 * where a line becomes visible, so the pattern is automatically continuous
 * and correct on every face with no seams.
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
import type { Ply } from '@/components/layup/LayupBuilder';
import type { Material } from '@/api/types/materials';

const BIAXIAL_TYPES = new Set(['Biaxial Ply (±45°)']);

function isBiaxial(materialName: string, materials: Material[]): boolean {
  const m = materials.find((mat) => mat.name === materialName);
  if (m) return BIAXIAL_TYPES.has(m.type);
  return materialName.toLowerCase().includes('biax');
}

// World units per mm of ply thickness, and the floor for ~0mm plies so they stay visible.
const THICKNESS_SCALE = 0.05;
const MIN_HEIGHT = 0.12;
const BOX_WIDTH = 3; // X
const BOX_DEPTH = 3; // Z
// Taper: up to 5 plies step down by a fixed 0.2 per ply (1x, 0.8x, 0.6x,
// 0.4x, 0.2x, bottom to top). Beyond 5 plies, that fixed step would go
// negative, so sizes are instead spread evenly across the whole 1x–0.2x range.
const TAPER_STEP = 0.2;
const MIN_SCALE = 0.2;
const TAPER_STEP_MAX_PLIES = 5;
// "Paper sheet" spacing/thickness (world units) for the fiber-orientation lines.
const SHEET_SPACING = 0.4;
const SHEET_THICKNESS = 0.035;
const SHEET_COLOR = 0x0f172a;

interface PlyStackVizProps {
  plies: Ply[]; // top of stack = index 0
  materials: Material[];
  className?: string;
}

/** Clips the infinite line { p0 + s*dir } (p0 = perp * offset) against the
 *  rectangle [-hw,hw] x [-hd,hd] in the X/Z plane. Returns the surviving
 *  segment's length and midpoint, or null if the line misses the rectangle. */
function clipLineToBox(
  offset: number,
  dirX: number,
  dirZ: number,
  perpX: number,
  perpZ: number,
  hw: number,
  hd: number
): { length: number; midX: number; midZ: number } | null {
  const p0x = perpX * offset;
  const p0z = perpZ * offset;

  let sMin = -Infinity;
  let sMax = Infinity;

  if (Math.abs(dirX) > 1e-9) {
    let a = (-hw - p0x) / dirX;
    let b = (hw - p0x) / dirX;
    if (a > b) [a, b] = [b, a];
    sMin = Math.max(sMin, a);
    sMax = Math.min(sMax, b);
  } else if (p0x < -hw || p0x > hw) {
    return null;
  }

  if (Math.abs(dirZ) > 1e-9) {
    let a = (-hd - p0z) / dirZ;
    let b = (hd - p0z) / dirZ;
    if (a > b) [a, b] = [b, a];
    sMin = Math.max(sMin, a);
    sMax = Math.min(sMax, b);
  } else if (p0z < -hd || p0z > hd) {
    return null;
  }

  if (sMin >= sMax) return null;

  const sMid = (sMin + sMax) / 2;
  return {
    length: sMax - sMin,
    midX: p0x + dirX * sMid,
    midZ: p0z + dirZ * sMid,
  };
}

/** Builds the parallel "sheet" meshes for one orientation angle, each already
 *  clipped to the ply's hw×hd footprint and positioned/rotated in place
 *  (local Y=0 — caller offsets to the ply's actual center height). */
function buildFiberSheets(hw: number, hd: number, height: number, orientationDeg: number): THREE.Mesh[] {
  const angleRad = (orientationDeg * Math.PI) / 180;
  const dirX = Math.cos(angleRad);
  const dirZ = Math.sin(angleRad);
  const perpX = -Math.sin(angleRad);
  const perpZ = Math.cos(angleRad);
  const maxPerp = Math.hypot(hw, hd);

  // Sheets are clipped to land exactly flush with the ply box's own surface,
  // so they're coplanar with it there — coplanar triangles z-fight (a
  // flickering surface). polygonOffset biases the sheet's depth values so it
  // wins that tie deterministically, without inflating the geometry itself
  // (which would visibly poke out past the cuboid's body).
  const material = new THREE.MeshBasicMaterial({
    color: SHEET_COLOR,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const sheets: THREE.Mesh[] = [];
  for (let offset = -maxPerp; offset <= maxPerp; offset += SHEET_SPACING) {
    const clip = clipLineToBox(offset, dirX, dirZ, perpX, perpZ, hw, hd);
    if (!clip || clip.length < 1e-3) continue;
    const geometry = new THREE.BoxGeometry(clip.length, height, SHEET_THICKNESS);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(clip.midX, 0, clip.midZ);
    // Rotating by -angleRad around Y maps local +X to world (cosθ, 0, sinθ) = dir.
    mesh.rotation.y = -angleRad;
    sheets.push(mesh);
  }
  return sheets;
}

/** Frees an object's own GPU resources (geometry/material/texture), used both
 *  on unmount (`scene.traverse`) and on every ply rebuild ("clear previous
 *  meshes"). `ArrowHelper`'s `line`/`cone` share one static geometry across
 *  every `ArrowHelper` instance in the whole app (see three's own
 *  ArrowHelper source) — disposing it here would corrupt any other arrow
 *  helper alive elsewhere, so only its per-instance materials are freed, and
 *  its children are skipped entirely (they're not independently owned). */
function disposeObject3D(obj: THREE.Object3D) {
  if (obj instanceof THREE.ArrowHelper) {
    (Array.isArray(obj.line.material) ? obj.line.material : [obj.line.material]).forEach((m) => m.dispose());
    (Array.isArray(obj.cone.material) ? obj.cone.material : [obj.cone.material]).forEach((m) => m.dispose());
    return;
  }
  if (obj.parent instanceof THREE.ArrowHelper) return;
  if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
    obj.geometry.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((mat) => {
      Object.values(mat).forEach((v) => {
        if (v instanceof THREE.Texture) v.dispose();
      });
      mat.dispose();
    });
  }
  if (obj instanceof THREE.Sprite) {
    obj.material.map?.dispose();
    obj.material.dispose();
  }
}

function createLabelSprite(text: string): THREE.Sprite {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.font = 'bold 48px sans-serif';
  ctx.fillStyle = '#0a0a0a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.9, 0.9, 1);
  return sprite;
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

    // Clear previous meshes
    [...group.children].forEach((child) => {
      group.remove(child);
      disposeObject3D(child);
    });

    const heights = plies.map((ply) => Math.max(MIN_HEIGHT, ply.thickness * THICKNESS_SCALE));

    // Taper: the bottom-most ply is full size, each one going up is smaller —
    // index 0 is the top of the stack, so its "distance from the bottom" is
    // (plies.length - 1 - idx). Up to 5 plies: fixed 0.2 step (1, 0.8, 0.6,
    // 0.4, 0.2). Beyond that a fixed step would go negative, so sizes are
    // instead spread evenly across the whole 1x–0.2x range.
    const n = plies.length;
    const scales = plies.map((_, idx) => {
      const distanceFromBottom = n - 1 - idx;
      if (n <= TAPER_STEP_MAX_PLIES) {
        return Math.max(MIN_SCALE, 1 - TAPER_STEP * distanceFromBottom);
      }
      return 1 - (1 - MIN_SCALE) * (distanceFromBottom / (n - 1));
    });

    // Cumulative bottom-up: last ply (bottom of stack) starts at y=0, index 0
    // (top of stack) ends up highest.
    const yStarts = new Array<number>(plies.length);
    let cursor = 0;
    for (let i = plies.length - 1; i >= 0; i--) {
      yStarts[i] = cursor;
      cursor += heights[i];
    }

    plies.forEach((ply, idx) => {
      const height = heights[idx];
      const scale = scales[idx];
      const width = BOX_WIDTH * scale;
      const depth = BOX_DEPTH * scale;
      const centerY = yStarts[idx] + height / 2;
      const biaxial = isBiaxial(ply.material, materials);

      const material = new THREE.MeshStandardMaterial({ color: ply.color, roughness: 0.6, metalness: 0.05 });
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, centerY, 0);
      group.add(mesh);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0x0f172a, opacity: 1, transparent: false })
      );
      edges.position.copy(mesh.position);
      group.add(edges);

      // "Sheets of paper" running through the ply at the fiber angle — where
      // a sheet crosses the outer surface (top, bottom, or a side wall) is
      // exactly where a line shows up, on every face, with no seams.
      const sheets = buildFiberSheets(width / 2, depth / 2, height, ply.orientation);
      sheets.forEach((sheet) => {
        sheet.position.y = centerY;
        group.add(sheet);
      });
      if (biaxial) {
        const crossSheets = buildFiberSheets(width / 2, depth / 2, height, ply.orientation + 90);
        crossSheets.forEach((sheet) => {
          sheet.position.y = centerY;
          group.add(sheet);
        });
      }
    });

    // 0° reference marker on the topmost ply, parallel to its cover
    if (plies.length > 0) {
      const topY = yStarts[0] + heights[0];
      const arrowLen = (BOX_WIDTH * scales[0]) / 2 + 0.6;
      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, topY + 0.02, 0),
        arrowLen,
        0x0a0a0a,
        0.25,
        0.15
      );
      group.add(arrow);

      const label = createLabelSprite('0°');
      label.position.set(arrowLen + 0.5, topY + 0.1, 0);
      group.add(label);
    }

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
