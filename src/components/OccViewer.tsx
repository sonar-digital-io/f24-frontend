/**
 * OccViewer — full-bleed Three.js canvas backed by real OpenCascade.js B-Rep geometry.
 *
 * opencascade.js v1.1.1 API notes (all suffixed overloads discovered by runtime testing):
 *   BRepPrimAPI_MakeSphere_1(R)
 *   BRepPrimAPI_MakeTorus_1(R1, R2)
 *   BRepPrimAPI_MakeBox_2(gp_Pnt_3, dx, dy, dz)
 *   BRepMesh_IncrementalMesh_2(shape, linDefl, isRel, angDefl, inParallel)
 *   TopExp_Explorer_2(shape, TopAbs_ShapeEnum.TopAbs_FACE, TopAbs_ShapeEnum.TopAbs_SHAPE)
 *   TopoDS.Face_1(shape)
 *   TopLoc_Location_1()
 *   BRep_Tool.Triangulation(face, loc)     ← static, no suffix
 *   face.Orientation_1().value === TopAbs_Orientation.TopAbs_REVERSED.value
 *   gp_Pnt_3(x,y,z) · gp_Dir_4(x,y,z) · gp_Vec_4(x,y,z)
 *   gp_Ax1_2(pnt, dir) · gp_Trsf_1()
 *   trsf.SetRotation_1(ax1, angleRad) · trsf.SetTranslation_1(vec)
 *   BRepBuilderAPI_Transform_2(shape, trsf, copy)
 *
 * Scene: hub sphere + rotor torus + 3 blade boxes at 0°/120°/240° around Z.
 * OrbitControls: left-drag = rotate, right-drag / middle = pan, scroll = zoom.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getOcc } from '@/lib/occ-init';

export interface OccViewerProps {
  wireframe?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// B-Rep construction (v1.1.1 API)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildShapes(oc: any): Array<{ shape: any; color: number; opacity: number }> {
  const FACE  = oc.TopAbs_ShapeEnum.TopAbs_FACE;
  const SHAPE = oc.TopAbs_ShapeEnum.TopAbs_SHAPE;
  // Keep refs to avoid GC-ing constants we pass to constructors
  void FACE; void SHAPE;

  const hub   = new oc.BRepPrimAPI_MakeSphere_1(1.0);
  const torus = new oc.BRepPrimAPI_MakeTorus_1(5.2, 0.35);

  // Blade: box from (0.9, -0.25, -0.4) sized 4.2 × 0.5 × 0.8
  const bladeOp = new oc.BRepPrimAPI_MakeBox_2(
    new oc.gp_Pnt_3(0.9, -0.25, -0.4),
    4.2, 0.5, 0.8,
  );
  const bladeBase = bladeOp.Shape();

  // Rotation axis: Z at origin
  const zDir = new oc.gp_Dir_4(0, 0, 1);
  const zPnt = new oc.gp_Pnt_3(0, 0, 0);
  const zAx1 = new oc.gp_Ax1_2(zPnt, zDir);

  const bladeShapes = [0, 120, 240].map((deg) => {
    if (deg === 0) return bladeBase;
    const t = new oc.gp_Trsf_1();
    t.SetRotation_1(zAx1, (deg * Math.PI) / 180);
    return new oc.BRepBuilderAPI_Transform_2(bladeBase, t, true).Shape();
  });

  return [
    { shape: hub.Shape(),   color: 0x94a3b8, opacity: 1    },
    { shape: torus.Shape(), color: 0x3b82f6, opacity: 0.9  },
    ...bladeShapes.map((s) => ({ shape: s, color: 0x475569, opacity: 1 })),
  ];
}

// ---------------------------------------------------------------------------
// Tessellation: B-Rep → Three.js BufferGeometry (v1.1.1 API)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tessellate(oc: any, shape: any, color: number, opacity: number): THREE.Mesh | null {
  const FACE     = oc.TopAbs_ShapeEnum.TopAbs_FACE;
  const TOPSHAPE = oc.TopAbs_ShapeEnum.TopAbs_SHAPE;
  const REVERSED = oc.TopAbs_Orientation.TopAbs_REVERSED;

  new oc.BRepMesh_IncrementalMesh_2(shape, 0.1, false, 0.5, false);

  const vertices: number[] = [];
  const indices:  number[] = [];
  let offset = 0;

  const exp = new oc.TopExp_Explorer_2(shape, FACE, TOPSHAPE);
  const loc = new oc.TopLoc_Location_1();

  while (exp.More()) {
    const face = oc.TopoDS.Face_1(exp.Current());
    const poly = oc.BRep_Tool.Triangulation(face, loc);

    if (!poly.IsNull()) {
      const p   = poly.get();
      const nb  = p.NbNodes();
      const nt  = p.NbTriangles();

      for (let i = 1; i <= nb; i++) {
        const pt = p.Node(i);
        vertices.push(pt.X(), pt.Y(), pt.Z());
      }

      const rev = face.Orientation_1().value === REVERSED.value;
      for (let i = 1; i <= nt; i++) {
        const tri = p.Triangle(i);
        const a = tri.Value(1) - 1 + offset;
        const b = tri.Value(2) - 1 + offset;
        const c = tri.Value(3) - 1 + offset;
        rev ? indices.push(a, c, b) : indices.push(a, b, c);
      }
      offset += nb;
    }
    exp.Next();
  }

  if (vertices.length === 0) return null;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.25,
    roughness: 0.45,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow    = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OccViewer({
  wireframe = false,
  className = 'absolute inset-0 w-full h-full',
}: OccViewerProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const meshesRef     = useRef<THREE.Mesh[]>([]);
  const wireLineRef   = useRef<THREE.LineSegments[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Wireframe toggle without scene re-creation
  useEffect(() => {
    meshesRef.current.forEach((m) => {
      const mat = m.material as THREE.MeshPhysicalMaterial;
      mat.opacity = wireframe ? 0 : (mat.userData.baseOpacity as number ?? 1);
      mat.needsUpdate = true;
    });
    wireLineRef.current.forEach((l) => { l.visible = wireframe; });
  }, [wireframe]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const w = container.clientWidth  || 800;
    const h = container.clientHeight || 600;

    // ── Scene ──────────────────────────────────────────────────────────────
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

    // ── Camera ─────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
    camera.position.set(12, 7, 16);

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // ── OrbitControls ──────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance   = 3;
    controls.maxDistance   = 80;
    controls.target.set(0, 0, 0);

    // ── Lights ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(12, 18, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left   = -12;
    keyLight.shadow.camera.right  = 12;
    keyLight.shadow.camera.top    = 12;
    keyLight.shadow.camera.bottom = -12;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xc8d8e8, 0.35);
    fillLight.position.set(-8, 4, -8);
    scene.add(fillLight);

    // ── Grid + ground shadow ────────────────────────────────────────────────
    const grid = new THREE.GridHelper(30, 30, 0xc0ccd8, 0xd4dde6);
    grid.position.y = -2;
    (grid.material as THREE.Material).opacity = 0.5;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.08 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ── Loading placeholder (spinning ring) ─────────────────────────────────
    const ringGeo = new THREE.TorusGeometry(2, 0.15, 16, 60);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xcbd5e1, wireframe: true });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    scene.add(ring);

    // ── Animate ─────────────────────────────────────────────────────────────
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      ring.rotation.y += 0.008;
      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ──────────────────────────────────────────────────────────────
    const onResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    window.addEventListener('resize', onResize);

    // ── OCC async: build + tessellate B-Rep ─────────────────────────────────
    let disposed = false;

    getOcc()
      .then((oc) => {
        if (disposed) return;

        let occShapes: Array<{ shape: any; color: number; opacity: number }>;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          occShapes = buildShapes(oc as any);
        } catch (err) {
          console.error('[OccViewer] B-Rep build failed:', err);
          setStatus('error');
          return;
        }

        const newMeshes: THREE.Mesh[]          = [];
        const newLines:  THREE.LineSegments[]  = [];

        for (const { shape, color, opacity } of occShapes) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mesh = tessellate(oc as any, shape, color, opacity);
            if (!mesh) continue;
            (mesh.material as THREE.MeshPhysicalMaterial).userData.baseOpacity = opacity;
            if (wireframe) (mesh.material as THREE.MeshPhysicalMaterial).opacity = 0;
            scene.add(mesh);
            newMeshes.push(mesh);

            // Edge overlay for wireframe mode
            const edgeGeo = new THREE.EdgesGeometry(mesh.geometry, 20);
            const edgeMat = new THREE.LineBasicMaterial({
              color: 0x475569,
              opacity: 0.65,
              transparent: true,
            });
            const lines = new THREE.LineSegments(edgeGeo, edgeMat);
            lines.visible = wireframe;
            scene.add(lines);
            newLines.push(lines);
          } catch (err) {
            console.warn('[OccViewer] tessellation failed for one shape:', err);
          }
        }

        meshesRef.current   = newMeshes;
        wireLineRef.current = newLines;

        scene.remove(ring);
        ringGeo.dispose();
        ringMat.dispose();

        setStatus('ready');
      })
      .catch((err) => {
        console.error('[OccViewer] OCC init failed:', err);
        setStatus('error');
      });

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      disposed = true;
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
      scene.clear();
      groundGeo.dispose();
      groundMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      meshesRef.current   = [];
      wireLineRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-start p-4">
          <span className="rounded-md bg-white/80 px-2.5 py-1 text-[12px] font-medium text-[#6b7280] backdrop-blur-sm">
            Loading OpenCascade…
          </span>
        </div>
      )}
      {status === 'error' && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-start p-4">
          <span className="rounded-md bg-white/80 px-2.5 py-1 text-[12px] font-medium text-[#dc2626] backdrop-blur-sm">
            OpenCascade init failed — check console
          </span>
        </div>
      )}
    </div>
  );
}
