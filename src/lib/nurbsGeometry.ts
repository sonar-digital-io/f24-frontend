import * as THREE from 'three';
import { NURBSSurface } from 'three/examples/jsm/curves/NURBSSurface.js';
import type { NurbsGeometryType } from '@/types';

export function generateControlPoints(type: NurbsGeometryType): THREE.Vector4[][] {
  const controlPoints: THREE.Vector4[][] = [];
  const cpRows = 5;
  const cpCols = 5;
  const surfaceSize = 8;

  for (let i = 0; i < cpRows; i++) {
    const row: THREE.Vector4[] = [];
    for (let j = 0; j < cpCols; j++) {
      const x = (i / (cpRows - 1) - 0.5) * surfaceSize;
      const z = (j / (cpCols - 1) - 0.5) * surfaceSize;

      let y = 0;
      switch (type) {
        case 'nurbs-wave':
          y += Math.sin(x * 0.8) * 1.5;
          y += Math.cos(z * 0.6) * 1.2;
          y += Math.sin(x * 0.5 + z * 0.5) * 0.8;
          break;
        case 'nurbs-dome': {
          const dx = x / (surfaceSize * 0.5);
          const dz = z / (surfaceSize * 0.5);
          const dist = Math.sqrt(dx * dx + dz * dz);
          y = Math.max(0, (1 - dist * dist)) * 4;
          break;
        }
        case 'nurbs-saddle':
          y = (x * x - z * z) * 0.1;
          break;
      }

      row.push(new THREE.Vector4(x, y, z, 1));
    }
    controlPoints.push(row);
  }
  return controlPoints;
}

/**
 * Builds the shaded surface mesh + quad-topology wireframe overlay + control
 * point visualization group for a NURBS surface — the rebuildable part of
 * NurbsViewer's scene (everything except renderer/camera/controls/lights,
 * which are long-lived and untouched when subdivisions/geometry change).
 */
export function buildNurbsSurfaceObjects(
  geometryType: NurbsGeometryType,
  subdivisionsU: number,
  subdivisionsV: number,
  showSurface: boolean,
  showWireframe: boolean,
  showControlPoints: boolean,
) {
  const degreeU = 3;
  const degreeV = 3;

  const controlPoints = generateControlPoints(geometryType);
  const cpRows = controlPoints.length;
  const cpCols = controlPoints[0].length;

  // Knot vectors (clamped, degree 3, 5 control points → 9 knots)
  const knotsU = [0, 0, 0, 0, 0.5, 1, 1, 1, 1];
  const knotsV = [0, 0, 0, 0, 0.5, 1, 1, 1, 1];

  const nurbsSurface = new NURBSSurface(degreeU, degreeV, knotsU, knotsV, controlPoints);

  // Sample points on the NURBS surface
  const segU = subdivisionsU;
  const segV = subdivisionsV;
  const vertices: number[] = [];
  const normals: number[] = [];
  const target = new THREE.Vector3();

  for (let i = 0; i <= segU; i++) {
    for (let j = 0; j <= segV; j++) {
      const u = i / segU;
      const v = j / segV;
      nurbsSurface.getPoint(u, v, target);
      vertices.push(target.x, target.y, target.z);
    }
  }

  // Compute normals per vertex (from cross product of tangent vectors)
  const tangentU = new THREE.Vector3();
  const tangentV = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const pU = new THREE.Vector3();
  const pV = new THREE.Vector3();
  const pCenter = new THREE.Vector3();

  for (let i = 0; i <= segU; i++) {
    for (let j = 0; j <= segV; j++) {
      const u = i / segU;
      const v = j / segV;
      const du = 0.001;
      const dv = 0.001;

      nurbsSurface.getPoint(u, v, pCenter);
      nurbsSurface.getPoint(Math.min(u + du, 1), v, pU);
      nurbsSurface.getPoint(u, Math.min(v + dv, 1), pV);

      tangentU.subVectors(pU, pCenter).normalize();
      tangentV.subVectors(pV, pCenter).normalize();
      normal.crossVectors(tangentU, tangentV).normalize();

      normals.push(normal.x, normal.y, normal.z);
    }
  }

  // Build triangle indices (each quad = 2 triangles, but visually quads)
  const triIndices: number[] = [];
  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segV; j++) {
      const a = i * (segV + 1) + j;
      const b = a + 1;
      const c = (i + 1) * (segV + 1) + j;
      const d = c + 1;
      triIndices.push(a, c, b);
      triIndices.push(b, c, d);
    }
  }

  // ── Shaded surface (triangles for GPU) ─────────────────────────────────
  const surfaceGeometry = new THREE.BufferGeometry();
  surfaceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  surfaceGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  surfaceGeometry.setIndex(triIndices);

  const surfaceMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x4488cc,
    metalness: 0.2,
    roughness: 0.4,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: showSurface ? 0.85 : 0,
  });

  const surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
  surfaceMesh.castShadow = true;
  surfaceMesh.receiveShadow = true;

  // ── Wireframe overlay (true quad topology, not triangle edges) ─────────
  const edgeVertices: number[] = [];
  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segV; j++) {
      const a = i * (segV + 1) + j;
      const b = a + 1;
      const c = (i + 1) * (segV + 1) + j;
      const d = c + 1;

      edgeVertices.push(
        vertices[a * 3], vertices[a * 3 + 1], vertices[a * 3 + 2],
        vertices[b * 3], vertices[b * 3 + 1], vertices[b * 3 + 2],
      );
      edgeVertices.push(
        vertices[a * 3], vertices[a * 3 + 1], vertices[a * 3 + 2],
        vertices[c * 3], vertices[c * 3 + 1], vertices[c * 3 + 2],
      );
      if (j === segV - 1) {
        edgeVertices.push(
          vertices[b * 3], vertices[b * 3 + 1], vertices[b * 3 + 2],
          vertices[d * 3], vertices[d * 3 + 1], vertices[d * 3 + 2],
        );
      }
      if (i === segU - 1) {
        edgeVertices.push(
          vertices[c * 3], vertices[c * 3 + 1], vertices[c * 3 + 2],
          vertices[d * 3], vertices[d * 3 + 1], vertices[d * 3 + 2],
        );
      }
    }
  }

  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgeVertices, 3));
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x88ccff, opacity: 0.7, transparent: true });
  const wireframeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  wireframeLines.visible = showWireframe;

  // ── Control points visualization ────────────────────────────────────────
  const cpGroup = new THREE.Group();
  cpGroup.visible = showControlPoints;

  const cpSphereGeo = new THREE.SphereGeometry(0.12, 12, 12);
  const cpMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444 });

  for (let i = 0; i < cpRows; i++) {
    for (let j = 0; j < cpCols; j++) {
      const cp = controlPoints[i][j];
      const sphere = new THREE.Mesh(cpSphereGeo, cpMaterial);
      sphere.position.set(cp.x, cp.y, cp.z);
      cpGroup.add(sphere);
    }
  }

  const cpLineVertices: number[] = [];
  for (let i = 0; i < cpRows; i++) {
    for (let j = 0; j < cpCols - 1; j++) {
      const a = controlPoints[i][j];
      const b = controlPoints[i][j + 1];
      cpLineVertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  for (let j = 0; j < cpCols; j++) {
    for (let i = 0; i < cpRows - 1; i++) {
      const a = controlPoints[i][j];
      const b = controlPoints[i + 1][j];
      cpLineVertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  const cpLineGeo = new THREE.BufferGeometry();
  cpLineGeo.setAttribute('position', new THREE.Float32BufferAttribute(cpLineVertices, 3));
  const cpLineMat = new THREE.LineBasicMaterial({ color: 0xff6666, opacity: 0.5, transparent: true });
  cpGroup.add(new THREE.LineSegments(cpLineGeo, cpLineMat));

  return { surfaceMesh, wireframeLines, cpGroup };
}
