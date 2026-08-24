/**
 * OccViewer — full-bleed Three.js canvas with three independent load pipelines:
 *
 *  - STL (when `stlData` is passed and doesn't sniff as a zip): parsed
 *    directly via lib/stlParsing.ts, not THREE.STLLoader: its binary/ASCII
 *    sniffing heuristic (peeking a face count at byte 80 before even
 *    checking for "solid") can misfire and try to allocate a bogus-huge
 *    typed array.
 *  - 3MF (when `stlData` is a zip, i.e. starts with the PK\x03\x04 local-file
 *    -header signature): despite the backend's documented "raw STL" contract,
 *    the real /result/ response observed in practice is a zip-based OPC
 *    package (3MF), so it's parsed with THREE.ThreeMFLoader instead.
 *  - IGES (opt-in via `igesUrl`, used only when `stlData` is unset): a real
 *    IGES file loaded through OpenCascade.js B-Rep → mesh tessellation (see
 *    lib/occGeometry.ts), written into the OCC Emscripten virtual filesystem,
 *    parsed with IGESControl_Reader. With no `stlData` and no `igesUrl`, the
 *    viewer just shows the loading ring — it never falls back to demo/mock
 *    geometry.
 *
 * No OCC involved for either STL or 3MF. Vertices/geometry are unitless
 * (fractions of the geometry's nominal_radius), so `stlScale` must be set to
 * rescale them. `stlData` takes priority over `igesUrl` whenever it's set.
 *
 * Scene: IGES geometry with auto-fit camera + OrbitControls.
 * OrbitControls: left-drag = rotate, right-drag / middle = pan, scroll = zoom.
 *
 * Camera and shadow ground auto-fit to the loaded geometry's bounding box.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { getOcc } from '@/lib/occ-init';
import { loadIgesShapes, tessellate } from '@/lib/occGeometry';
import { looksLikeAsciiStl, looksLikeZip, hexDump, parseAsciiStl, parseBinaryStl } from '@/lib/stlParsing';
import { createViewerScene, fitViewerSceneToBounds, updateGroundFade } from '@/lib/viewerScene';
import { createDampedOrbitControls, createWireframeOverlay, disposeSceneObjects } from '@/lib/threeViewerSetup';

export interface OccViewerProps {
  wireframe?: boolean;
  className?: string;
  /** URL of an IGES file to load when there's no `stlData` yet — opt-in only:
   *  with no `igesUrl`, an unset `stlData` just shows the loading ring instead
   *  (no demo/mock geometry). Ignored once `stlData` is set. */
  igesUrl?: string;
  /** Raw STL contents (unitless — see `stlScale`) — takes over rendering from the IGES pipeline when set. */
  stlData?: ArrayBuffer | string;
  /** Uniform scale applied to the STL mesh (e.g. the geometry's nominal_radius in meters, since the
   *  backend exports STL vertices as fractions of it). Defaults to 1 (no rescale). */
  stlScale?: number;
  /** Fires whenever the load status changes — lets callers surface loading/error state of their own. */
  onStatusChange?: (status: 'loading' | 'ready' | 'error') => void;
  /** Show/hide 3MF objects whose name matches /blade/i. Composition preview only — ignored (all visible) when no such object exists. Defaults to true. */
  showBlade?: boolean;
  /** Show/hide every other named 3MF object (layups). Composition preview only. Defaults to true. */
  showLayups?: boolean;
  /** Overlay the mesh's true wireframe (every triangle edge of the actual geometry,
   *  via THREE.WireframeGeometry — the same object, just with no face fill) on top of
   *  the solid object — unlike `wireframe`, this doesn't hide the solid fill underneath
   *  it. Defaults to false. */
  showWebView?: boolean;
}

export function OccViewer({
  wireframe = false,
  className = 'absolute inset-0 w-full h-full',
  igesUrl,
  stlData,
  stlScale = 1,
  onStatusChange,
  showBlade = true,
  showLayups = true,
  showWebView = false,
}: OccViewerProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const meshesRef     = useRef<THREE.Mesh[]>([]);
  const wireLineRef   = useRef<THREE.LineSegments[]>([]);
  const webLineRef    = useRef<THREE.LineSegments[]>([]);
  const wireframeRef  = useRef(wireframe);
  const showWebViewRef = useRef(showWebView);
  const bladeObjectsRef  = useRef<THREE.Object3D[]>([]);
  const layupObjectsRef  = useRef<THREE.Object3D[]>([]);
  const showBladeRef  = useRef(showBlade);
  const showLayupsRef = useRef(showLayups);

  useEffect(() => {
    showBladeRef.current = showBlade;
    bladeObjectsRef.current.forEach((o) => { o.visible = showBlade; });
  }, [showBlade]);

  useEffect(() => {
    showLayupsRef.current = showLayups;
    layupObjectsRef.current.forEach((o) => { o.visible = showLayups; });
  }, [showLayups]);
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

  // Web view toggle — the structural wireframe overlay on top of the still-solid
  // object. Independent of `wireframe` above (which hides the solid fill instead);
  // never touches mesh opacity.
  useEffect(() => {
    showWebViewRef.current = showWebView;
    webLineRef.current.forEach((l) => { l.visible = showWebView; });
  }, [showWebView]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const w = container.clientWidth  || 800;
    const h = container.clientHeight || 600;

    // ── Scene / camera / renderer / lights / ground / loading ring ──────────
    const { scene, camera, renderer, ground, groundMat, ring, ringGeo, ringMat } =
      createViewerScene(w, h);
    container.appendChild(renderer.domElement);
    const baseGroundOpacity = groundMat.opacity;
    // Set by fitViewerSceneToBounds once the mesh loads — null until then, so the
    // fade has nothing to size itself against yet (see updateGroundFade).
    let fitMaxDim: number | null = null;

    // ── OrbitControls ──────────────────────────────────────────────────────
    const controls = createDampedOrbitControls(camera, renderer);
    controls.minDistance = 0.1;
    controls.maxDistance = 5000;
    controls.target.set(0, 0, 0);

    // ── Animate ─────────────────────────────────────────────────────────────
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      ring.rotation.y += 0.008;
      if (fitMaxDim !== null) {
        updateGroundFade(camera, controls.target, ground, groundMat, fitMaxDim, baseGroundOpacity);
      }
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
    // Three independent pipelines: STL (pre-triangulated, no OCC involved —
    // used for the backend's generated result, which ships unitless vertices
    // scaled by stlScale), 3MF (composition preview) and IGES (B-Rep loaded +
    // tessellated via OpenCascade.js — used for the static demo geometry).
    let disposed = false;
    setStatus('loading');
    bladeObjectsRef.current = [];
    layupObjectsRef.current = [];

    // `roots`: top-level objects to auto-fit the camera against. For STL/IGES
    // this is just the meshes themselves (direct children of the scene); for
    // 3MF it's the parsed group, since Box3.expandByObject must be called on
    // an object whose own world matrix it can (re)compute — calling it on a
    // deeply-nested child directly would use its parent's possibly-stale
    // matrixWorld instead of freshly computing it top-down.
    async function loadStl(): Promise<{ newMeshes: THREE.Mesh[]; newLines: THREE.LineSegments[]; newWebLines: THREE.LineSegments[]; roots: THREE.Object3D[] }> {
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

      const webLines = createWireframeOverlay(geo);
      webLines.scale.setScalar(stlScale);
      webLines.visible = showWebViewRef.current;
      scene.add(webLines);

      return { newMeshes: [mesh], newLines: [lines], newWebLines: [webLines], roots: [mesh] };
    }

    async function loadIges(url: string): Promise<{ newMeshes: THREE.Mesh[]; newLines: THREE.LineSegments[]; newWebLines: THREE.LineSegments[]; roots: THREE.Object3D[] }> {
      const oc = await getOcc();

      // Load IGES file
      const occShapes = await loadIgesShapes(oc, url);

      // Tessellate shapes
      const newMeshes: THREE.Mesh[]         = [];
      const newLines:  THREE.LineSegments[] = [];
      const newWebLines: THREE.LineSegments[] = [];

      for (const { shape, color, opacity } of occShapes) {
        try {

          const mesh = tessellate(oc, shape, color, opacity);
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

          const webLines = createWireframeOverlay(mesh.geometry);
          webLines.visible = showWebViewRef.current;
          scene.add(webLines);
          newWebLines.push(webLines);
        } catch (err) {
          console.warn('[OccViewer] tessellation failed for one shape:', err);
        } finally {
          // Mesh data lives in the BufferGeometry now — the OCC shape can go
          shape.delete();
        }
      }

      return { newMeshes, newLines, newWebLines, roots: newMeshes };
    }

    async function load3mf(): Promise<{ newMeshes: THREE.Mesh[]; newLines: THREE.LineSegments[]; newWebLines: THREE.LineSegments[]; roots: THREE.Object3D[] }> {
      const loader = new ThreeMFLoader();
      const group = loader.parse(stlData as ArrayBuffer);
      group.scale.setScalar(stlScale);
      scene.add(group);

      const newMeshes: THREE.Mesh[] = [];
      const newLines:  THREE.LineSegments[] = [];
      const newWebLines: THREE.LineSegments[] = [];

      group.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;

        // The 3MF file doesn't carry its own vertex normals, and ThreeMFLoader
        // doesn't compute them — leaving each triangle lit by its own flat face
        // normal. On a coarse structural mesh that shows up as a visible facet
        // grid under directional/specular lighting, even though the surface
        // itself is one continuous, fully-filled shell. Smooth normals across
        // the shared vertices instead so the shading reads as a real curved solid.
        obj.geometry.computeVertexNormals();

        // Composition preview 3MF packages name each object (e.g. "Blade",
        // per-layup names) — group by that so callers can toggle visibility,
        // and so layups render in a visibly different color from the blade
        // shell they're mapped onto instead of blending into it.
        const isBlade = /blade/i.test(obj.name);

        const mat = new THREE.MeshPhysicalMaterial({
          color: isBlade ? 0x94a3b8 : 0xf59e0b,
          metalness: 0.3,
          roughness: 0.4,
          side: THREE.DoubleSide,
        });
        mat.userData.baseOpacity = 1;
        if (wireframeRef.current) mat.opacity = 0;

        // Dispose the loader-built material (and any texture it holds) before
        // replacing it — otherwise it's simply orphaned, leaking GPU memory on
        // every regenerate since the whole scene is rebuilt each time.
        const oldMat = obj.material as THREE.Material | THREE.Material[];
        (Array.isArray(oldMat) ? oldMat : [oldMat]).forEach((m) => {
          Object.values(m).forEach((v) => { if (v instanceof THREE.Texture) v.dispose(); });
          m.dispose();
        });
        obj.material = mat;
        obj.castShadow = true;
        obj.receiveShadow = true;
        newMeshes.push(obj);

        (isBlade ? bladeObjectsRef : layupObjectsRef).current.push(obj);
        obj.visible = isBlade ? showBladeRef.current : showLayupsRef.current;

        // Parented to the mesh itself so it inherits the mesh's own local
        // transform automatically (3MF build items can each carry their own).
        const edgeGeo = new THREE.EdgesGeometry(obj.geometry, 15);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x475569, opacity: 0.55, transparent: true });
        const lines = new THREE.LineSegments(edgeGeo, edgeMat);
        lines.visible = wireframeRef.current;
        obj.add(lines);
        newLines.push(lines);

        // Sibling of `obj`, not a child of it — a child would inherit `obj.visible`
        // (see the showBlade/showLayups line above) and disappear along with the
        // solid mesh, even though the wireframe should stay visible on its own.
        const webLines = createWireframeOverlay(obj.geometry);
        webLines.visible = showWebViewRef.current;
        webLines.position.copy(obj.position);
        webLines.quaternion.copy(obj.quaternion);
        webLines.scale.copy(obj.scale);
        (obj.parent ?? group).add(webLines);
        newWebLines.push(webLines);
      });

      return { newMeshes, newLines, newWebLines, roots: [group] };
    }

    // No backend result yet — keep the loading ring spinning instead of
    // falling back to demo geometry, unless the caller explicitly opted into
    // an IGES demo file via `igesUrl`. The effect re-runs (and tries again)
    // once `stlData` actually arrives.
    const loadPromise =
      stlData !== undefined
        ? (typeof stlData !== 'string' && looksLikeZip(stlData) ? load3mf() : loadStl())
        : igesUrl
          ? loadIges(igesUrl)
          : null;

    if (loadPromise) {
      loadPromise
        .then(({ newMeshes, newLines, newWebLines, roots }) => {
          if (disposed) return;

          // ── Auto-fit camera + ground to loaded geometry ─────────────────────
          fitMaxDim = fitViewerSceneToBounds(roots, camera, controls, ground);

          meshesRef.current   = newMeshes;
          wireLineRef.current = newLines;
          webLineRef.current  = newWebLines;

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
    }

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      disposed = true;
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
      controls.dispose();
      // scene.clear() alone does not free GPU resources — dispose every
      // geometry/material/texture still in the scene (IGES meshes, edge lines,
      // shadow ground, loading ring)
      disposeSceneObjects(scene);
      (scene.background as THREE.Texture).dispose();
      scene.clear();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      meshesRef.current   = [];
      wireLineRef.current = [];
      webLineRef.current  = [];
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
