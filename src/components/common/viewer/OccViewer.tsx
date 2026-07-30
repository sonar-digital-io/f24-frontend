/**
 * OccViewer — full-bleed Three.js canvas with two independent load pipelines:
 *
 *  - IGES (default): a real IGES file loaded through OpenCascade.js B-Rep →
 *    mesh tessellation. Served from public/fan-object.igs, fetched at
 *    runtime, written into the OCC Emscripten virtual filesystem, parsed with
 *    IGESControl_Reader, and tessellated into a Three.js BufferGeometry.
 *  - STL (when `stlData` is passed): already-triangulated mesh data — e.g.
 *    the backend's generated result, ASCII or binary — parsed directly (see
 *    parseAsciiStl/parseBinaryStl below), not THREE.STLLoader: its
 *    binary/ASCII sniffing heuristic (peeking a face count at byte 80 before
 *    even checking for "solid") can misfire and try to allocate a bogus-huge
 *    typed array. Format is instead detected by checking whether the content
 *    actually starts with "solid". No OCC involved either way. Vertices are
 *    unitless (fractions of the geometry's nominal_radius), so `stlScale`
 *    must be set to rescale it.
 *
 * `stlData` takes over rendering from the IGES pipeline whenever it's set.
 *
 * opencascade.js v1.1.1 API notes (v1.1.1 = OCC 7.5 bindings):
 *   Constructor overloads always use _N suffix (even if only one):
 *     IGESControl_Reader_1()
 *     Message_ProgressRange_1()        — default (no-arg) ctor
 *     TopLoc_Location_1()
 *   Method overloads only use _N when there are multiple overloads:
 *     reader.ReadFile(path)            — single overload → no suffix
 *     reader.TransferRoots()           — single overload, no args → no suffix
 *     reader.OneShape()                — single overload → no suffix
 *     IGESControl_Controller.Init()    — MUST be called before any IGESControl_Reader use!
 *   Other known suffixes:
 *     BRepMesh_IncrementalMesh_2(shape, linDefl, isRel, angDefl, inParallel)
 *     TopExp_Explorer_2(shape, TopAbs_ShapeEnum.TopAbs_FACE, ...)
 *     TopoDS.Face_1(shape)
 *     BRep_Tool.Triangulation(face, loc)     ← static, no suffix
 *     face.Orientation_1().value === TopAbs_Orientation.TopAbs_REVERSED.value
 *
 * Scene: IGES geometry with auto-fit camera + OrbitControls.
 * OrbitControls: left-drag = rotate, right-drag / middle = pan, scroll = zoom.
 *
 * Camera, grid, and shadow ground auto-fit to the loaded geometry's bounding box.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getOcc } from '@/lib/occ-init';

export interface OccViewerProps {
  wireframe?: boolean;
  className?: string;
  /** URL of the IGES file to load (must be served from the same origin). Ignored when `stlData` is set. */
  igesUrl?: string;
  /** Raw STL contents (unitless — see `stlScale`) — takes over rendering from the IGES pipeline when set. */
  stlData?: ArrayBuffer | string;
  /** Uniform scale applied to the STL mesh (e.g. the geometry's nominal_radius in meters, since the
   *  backend exports STL vertices as fractions of it). Defaults to 1 (no rescale). */
  stlScale?: number;
  /** Fires whenever the load status changes — lets callers surface loading/error state of their own. */
  onStatusChange?: (status: 'loading' | 'ready' | 'error') => void;
}

// ---------------------------------------------------------------------------
// IGES loader — returns shape(s) ready for tessellation
// ---------------------------------------------------------------------------

// opencascade.js v1.1.1 ships no TypeScript types — the OCC handle stays `any`.
/* eslint-disable @typescript-eslint/no-explicit-any */
async function loadIgesShapes(
  oc: any,
  url: string,
): Promise<Array<{ shape: any; color: number; opacity: number }>> {
  // 1. Fetch the IGES file
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`IGES fetch failed: HTTP ${response.status} — ${url}`);
  }
  const buffer = await response.arrayBuffer();

  // 2. Write into the OCC Emscripten virtual filesystem.
  //    ⚠️  opencascade.js v1.1.1 WASM bug: ReadFile silently fails (RetError)
  //    for virtual-FS paths longer than 10 characters total (incl. slash + ext).
  //    Stem must be ≤ 5 chars: "/fan.igs" (8) ✓  "/fanobj.igs" (11) ✗
  const tmpPath = '/fan.igs';
  oc.FS.writeFile(tmpPath, new Uint8Array(buffer));

  try {
    // 3. IGES session must be initialised before any read (registers protocol)
    oc.IGESControl_Controller.Init();

    // 4. Create reader and parse — Emscripten heap object, must be freed
    const reader = new oc.IGESControl_Reader_1();
    try {
      const retStatus = reader.ReadFile(tmpPath);

      const RetDone = oc.IFSelect_ReturnStatus.IFSelect_RetDone;
      if (retStatus.value !== RetDone.value) {
        throw new Error(`IGESControl_Reader.ReadFile returned status ${retStatus.value}`);
      }

      // 5. Transfer all root entities to B-Rep shapes
      //    Single overload, no args → no suffix
      reader.TransferRoots();

      // 6. Compound all transferred shapes into one
      //    (OneShape returns its own TopoDS handle — the reader can be freed after)
      const shape = reader.OneShape();

      return [{ shape, color: 0x94a3b8, opacity: 1 }];
    } finally {
      reader.delete();
    }
  } finally {
    try { oc.FS.unlink(tmpPath); } catch { /* virtual-FS cleanup */ }
  }
}

// ---------------------------------------------------------------------------
// ASCII + binary STL parsers — deliberately not THREE.STLLoader: its
// binary/ASCII auto-detection heuristic (peeking a "triangle count" at byte
// 80, before even checking for a "solid" prefix) can misfire and try to
// allocate a bogus-huge typed array. Detect the format by sniffing whether
// the content actually starts with "solid" instead, and sanity-check a
// binary header's face count against the real byte length before trusting it.
// ---------------------------------------------------------------------------

const STL_VERTEX_RE = /vertex\s+([+-]?[\d.eE+-]+)\s+([+-]?[\d.eE+-]+)\s+([+-]?[\d.eE+-]+)/g;

function looksLikeAsciiStl(buffer: ArrayBuffer): boolean {
  // Anchoring on "starts with solid" is too strict — a stray leading byte
  // (BOM variant, whitespace the decoder doesn't normalize, etc.) makes a
  // real ASCII file look binary. Instead just check that both STL keywords
  // show up as readable text near the start of the file.
  const head = new Uint8Array(buffer, 0, Math.min(4096, buffer.byteLength));
  const text = new TextDecoder().decode(head);
  return /\bsolid\b/i.test(text) && /\bfacet\b/i.test(text);
}

function hexDump(buffer: ArrayBuffer, length = 64): string {
  return Array.from(new Uint8Array(buffer, 0, Math.min(length, buffer.byteLength)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
}

function parseAsciiStl(text: string): Float32Array {
  const vertices: number[] = [];
  let m: RegExpExecArray | null;
  STL_VERTEX_RE.lastIndex = 0;
  while ((m = STL_VERTEX_RE.exec(text)) !== null) {
    vertices.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  }
  return new Float32Array(vertices);
}

function parseBinaryStl(buffer: ArrayBuffer): Float32Array {
  const HEADER_SIZE = 84; // 80-byte header + uint32 face count
  const FACE_SIZE    = 50; // 12 floats (normal + 3 vertices) + uint16 attribute count
  if (buffer.byteLength < HEADER_SIZE) {
    throw new Error(`Binary STL too short to contain a header (${buffer.byteLength} bytes)`);
  }
  const reader = new DataView(buffer);
  const faces = reader.getUint32(80, true);
  const expected = HEADER_SIZE + faces * FACE_SIZE;
  if (expected !== buffer.byteLength) {
    throw new Error(
      `Binary STL face count doesn't match its byte length (header says ${faces} faces, ` +
        `expected ${expected} bytes, got ${buffer.byteLength}) — likely misdetected as binary. ` +
        `First bytes: ${hexDump(buffer)}`
    );
  }

  const positions = new Float32Array(faces * 3 * 3);
  let offset = HEADER_SIZE;
  let vi = 0;
  for (let f = 0; f < faces; f++) {
    offset += 12; // skip the facet normal — recomputed later via computeVertexNormals
    for (let v = 0; v < 3; v++) {
      positions[vi++] = reader.getFloat32(offset, true); offset += 4;
      positions[vi++] = reader.getFloat32(offset, true); offset += 4;
      positions[vi++] = reader.getFloat32(offset, true); offset += 4;
    }
    offset += 2; // attribute byte count
  }
  return positions;
}

// ---------------------------------------------------------------------------
// Tessellation: B-Rep → Three.js BufferGeometry (v1.1.1 API)
// ---------------------------------------------------------------------------

function tessellate(oc: any, shape: any, color: number, opacity: number): THREE.Mesh | null {
  const FACE     = oc.TopAbs_ShapeEnum.TopAbs_FACE;
  const TOPSHAPE = oc.TopAbs_ShapeEnum.TopAbs_SHAPE;
  const REVERSED = oc.TopAbs_Orientation.TopAbs_REVERSED;

  // Meshing happens in the ctor — the mesher object itself can be freed afterwards
  const mesher = new oc.BRepMesh_IncrementalMesh_2(shape, 0.05, false, 0.3, false);

  const vertices: number[] = [];
  const indices:  number[] = [];
  let offset = 0;

  const exp = new oc.TopExp_Explorer_2(shape, FACE, TOPSHAPE);
  const loc = new oc.TopLoc_Location_1();

  // Every oc.* instance below is an Emscripten heap object → .delete() when done.
  // The extracted coordinates are copied into plain JS arrays, so nothing here
  // needs to outlive this function.
  try {
    while (exp.More()) {
      const cur  = exp.Current();
      const face = oc.TopoDS.Face_1(cur);
      const poly = oc.BRep_Tool.Triangulation(face, loc);

      try {
        if (!poly.IsNull()) {
          // poly.get() is a raw pointer owned by the handle — do NOT delete it
          const p  = poly.get();
          const nb = p.NbNodes();
          const nt = p.NbTriangles();

          for (let i = 1; i <= nb; i++) {
            const pt = p.Node(i);
            vertices.push(pt.X(), pt.Y(), pt.Z());
            pt.delete();
          }

          const rev = face.Orientation_1().value === REVERSED.value;
          for (let i = 1; i <= nt; i++) {
            const tri = p.Triangle(i);
            const a = tri.Value(1) - 1 + offset;
            const b = tri.Value(2) - 1 + offset;
            const c = tri.Value(3) - 1 + offset;
            if (rev) indices.push(a, c, b);
            else indices.push(a, b, c);
            tri.delete();
          }
          offset += nb;
        }
      } finally {
        poly.delete();
        face.delete();
        cur.delete();
      }
      exp.Next();
    }
  } finally {
    loc.delete();
    exp.delete();
    mesher.delete();
  }

  if (vertices.length === 0) return null;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.3,
    roughness: 0.4,
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
  igesUrl   = '/fan-object.igs',
  stlData,
  stlScale = 1,
  onStatusChange,
}: OccViewerProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const meshesRef     = useRef<THREE.Mesh[]>([]);
  const wireLineRef   = useRef<THREE.LineSegments[]>([]);
  const wireframeRef  = useRef(wireframe);
  const [status, setStatusState] = useState<'loading' | 'ready' | 'error'>('loading');
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;
  function setStatus(next: 'loading' | 'ready' | 'error') {
    setStatusState(next);
    onStatusChangeRef.current?.(next);
  }

  // Wireframe toggle without scene re-creation
  useEffect(() => {
    wireframeRef.current = wireframe; // async OCC load reads the latest value from here
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
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 5000);
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
    controls.minDistance   = 0.1;
    controls.maxDistance   = 5000;
    controls.target.set(0, 0, 0);

    // ── Lights ─────────────────────────────────────────────────────────────
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

    // ── Grid + ground shadow ────────────────────────────────────────────────
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

    // ── Load + build the scene's mesh(es) ───────────────────────────────────
    // Two independent pipelines: STL (pre-triangulated, no OCC involved — used
    // for the backend's generated result, which ships unitless vertices scaled
    // by stlScale) and IGES (B-Rep loaded + tessellated via OpenCascade.js —
    // used for the static demo geometry).
    let disposed = false;
    setStatus('loading');

    async function loadStl(): Promise<{ newMeshes: THREE.Mesh[]; newLines: THREE.LineSegments[] }> {
      let positions: Float32Array;
      if (typeof stlData === 'string') {
        positions = parseAsciiStl(stlData);
      } else {
        const buf = stlData as ArrayBuffer;
        positions = looksLikeAsciiStl(buf) ? parseAsciiStl(new TextDecoder().decode(buf)) : parseBinaryStl(buf);
      }
      if (positions.length === 0) {
        const diag = typeof stlData === 'string' ? stlData.slice(0, 200) : hexDump(stlData as ArrayBuffer, 128);
        throw new Error(`No vertices found in STL — empty or unrecognized file. First bytes: ${diag}`);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.computeVertexNormals();

      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x94a3b8,
        metalness: 0.3,
        roughness: 0.4,
        side: THREE.DoubleSide,
      });
      mat.userData.baseOpacity = 1;
      if (wireframeRef.current) mat.opacity = 0;

      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.setScalar(stlScale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const edgeGeo = new THREE.EdgesGeometry(geo, 15);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x475569, opacity: 0.55, transparent: true });
      const lines = new THREE.LineSegments(edgeGeo, edgeMat);
      lines.scale.setScalar(stlScale);
      lines.visible = wireframeRef.current;
      scene.add(lines);

      return { newMeshes: [mesh], newLines: [lines] };
    }

    async function loadIges(): Promise<{ newMeshes: THREE.Mesh[]; newLines: THREE.LineSegments[] }> {
      const oc = await getOcc();

      // Load IGES file
      const occShapes = await loadIgesShapes(oc as any, igesUrl);

      // Tessellate shapes
      const newMeshes: THREE.Mesh[]         = [];
      const newLines:  THREE.LineSegments[] = [];

      for (const { shape, color, opacity } of occShapes) {
        try {

          const mesh = tessellate(oc as any, shape, color, opacity);
          if (!mesh) continue;
          (mesh.material as THREE.MeshPhysicalMaterial).userData.baseOpacity = opacity;
          if (wireframeRef.current) (mesh.material as THREE.MeshPhysicalMaterial).opacity = 0;
          scene.add(mesh);
          newMeshes.push(mesh);

          // Edge overlay for wireframe mode
          const edgeGeo = new THREE.EdgesGeometry(mesh.geometry, 15);
          const edgeMat = new THREE.LineBasicMaterial({
            color: 0x475569,
            opacity: 0.55,
            transparent: true,
          });
          const lines = new THREE.LineSegments(edgeGeo, edgeMat);
          lines.visible = wireframeRef.current;
          scene.add(lines);
          newLines.push(lines);
        } catch (err) {
          console.warn('[OccViewer] tessellation failed for one shape:', err);
        } finally {
          // Mesh data lives in the BufferGeometry now — the OCC shape can go
          shape.delete();
        }
      }

      return { newMeshes, newLines };
    }

    (stlData !== undefined ? loadStl() : loadIges())
      .then(({ newMeshes, newLines }) => {
        if (disposed) return;

        // ── Auto-fit camera + grid to loaded geometry ───────────────────────
        if (newMeshes.length > 0) {
          const box = new THREE.Box3();
          newMeshes.forEach((m) => box.expandByObject(m));

          if (!box.isEmpty()) {
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

            // Snap grid + shadow ground to the bottom of the geometry
            const groundY = box.min.y - maxDim * 0.015;
            grid.position.y   = groundY;
            ground.position.y = groundY;
            // Scale grid to match geometry footprint
            const footprint = Math.max(size.x, size.z) * 3;
            grid.scale.setScalar(footprint / 200);
          }
        }

        meshesRef.current   = newMeshes;
        wireLineRef.current = newLines;

        scene.remove(ring);
        ringGeo.dispose();
        ringMat.dispose();

        if (!disposed) setStatus('ready');
      })
      .catch((err) => {
        if (!disposed) {
          console.error('[OccViewer] mesh load failed:', err);
          setStatus('error');
        }
      });

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      disposed = true;
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
      controls.dispose();
      // scene.clear() alone does not free GPU resources — dispose every
      // geometry/material/texture still in the scene (IGES meshes, edge lines,
      // grid, shadow ground, loading ring)
      scene.traverse((obj) => {
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
      });
      (scene.background as THREE.Texture).dispose();
      scene.clear();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      meshesRef.current   = [];
      wireLineRef.current = [];
    };
     
  }, [igesUrl, stlData, stlScale]);

  return (
    <div ref={containerRef} className={className}>
      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-start p-4">
          <span className="rounded-md bg-white/80 px-2.5 py-1 text-[12px] font-medium text-[#6b7280] backdrop-blur-sm">
            Loading geometry…
          </span>
        </div>
      )}
      {status === 'error' && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-start p-4">
          <span className="rounded-md bg-white/80 px-2.5 py-1 text-[12px] font-medium text-[#dc2626] backdrop-blur-sm">
            Geometry load failed — check console
          </span>
        </div>
      )}
    </div>
  );
}
