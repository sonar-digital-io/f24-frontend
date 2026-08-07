/**
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
 * IGES loading + B-Rep → Three.js BufferGeometry tessellation, shared by
 * every viewer that renders an IGES demo file through OpenCascade.js.
 */

import * as THREE from 'three';

// opencascade.js v1.1.1 ships no TypeScript types — the OCC module handle
// stays `any`, but a TopoDS_Shape handle only ever needs `.delete()` called
// on it in this file, so it gets a minimal local type instead of `any`.
export type OccShapeHandle = { delete: () => void };

export async function loadIgesShapes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  url: string,
): Promise<Array<{ shape: OccShapeHandle; color: number; opacity: number }>> {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tessellate(oc: any, shape: OccShapeHandle, color: number, opacity: number): THREE.Mesh | null {
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
