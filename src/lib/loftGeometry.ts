import * as THREE from 'three';

// Sample a closed cubic Bézier spline through anchor points
export function sampleClosedBezier(anchors: [number, number][], samples = 48): [number, number][] {
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
export function buildLoftMesh(
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
