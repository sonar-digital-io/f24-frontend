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

/**
 * Interpolates the raw anchor (control) points between the two planes
 * surrounding a given world-space Y — used both to preview an edge-placement
 * click (sampled into a curve for the dashed preview ring) and to seed a new
 * plane's editable anchors when the click is confirmed.
 */
export function interpolateAnchorsAtY(
  planes: { y: number; anchors: [number, number][] }[],
  hitY: number,
): { clampedY: number; anchors: [number, number][] } | null {
  const sorted = planes.filter((p) => p.anchors.length >= 3).sort((a, b) => a.y - b.y);
  if (sorted.length < 2) return null;

  const minY = sorted[0].y;
  const maxY = sorted[sorted.length - 1].y;
  const clampedY = Math.max(minY, Math.min(maxY, hitY));

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

  const anchors: [number, number][] = [];
  for (let i = 0; i < anchorCount; i++) {
    anchors.push([
      below.anchors[i][0] + (above.anchors[i][0] - below.anchors[i][0]) * t,
      below.anchors[i][1] + (above.anchors[i][1] - below.anchors[i][1]) * t,
    ]);
  }

  return { clampedY, anchors };
}

/**
 * Preview variant of `interpolateAnchorsAtY` — same interpolation, sampled
 * into a curve for the dashed edge-placement preview ring instead of raw
 * anchors.
 */
export function interpolateProfileAtY(
  planes: { y: number; anchors: [number, number][] }[],
  hitY: number,
  samples = 48,
): { clampedY: number; curveXZ: [number, number][] } | null {
  const interpolated = interpolateAnchorsAtY(planes, hitY);
  if (!interpolated) return null;
  return { clampedY: interpolated.clampedY, curveXZ: sampleClosedBezier(interpolated.anchors, samples) };
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
