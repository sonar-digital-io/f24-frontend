import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NURBSSurface } from 'three/examples/jsm/curves/NURBSSurface.js';

type GeometryType = 'nurbs-wave' | 'nurbs-dome' | 'nurbs-saddle';

interface NurbsViewerProps {
  subdivisionsU: number;
  subdivisionsV: number;
  showWireframe: boolean;
  showSurface: boolean;
  showControlPoints: boolean;
  geometryType: GeometryType;
}

function generateControlPoints(type: GeometryType): THREE.Vector4[][] {
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
        case 'nurbs-dome':
          const dx = x / (surfaceSize * 0.5);
          const dz = z / (surfaceSize * 0.5);
          const dist = Math.sqrt(dx * dx + dz * dz);
          y = Math.max(0, (1 - dist * dist)) * 4;
          break;
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

export function NurbsViewer({
  subdivisionsU,
  subdivisionsV,
  showWireframe,
  showSurface,
  showControlPoints,
  geometryType,
}: NurbsViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let width = container.clientWidth;
    let height = container.clientHeight;

    if (width === 0 || height === 0) {
      width = 800;
      height = 600;
    }

    // Scene
    const scene = new THREE.Scene();

    // Dark gradient background
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const skyTexture = new THREE.CanvasTexture(canvas);
    scene.background = skyTexture;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(12, 8, 12);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 50;
    controls.target.set(0, 0, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(15, 20, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-10, 5, -10);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xff8844, 0.2);
    backLight.position.set(0, -5, -15);
    scene.add(backLight);

    // Subtle grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x333355, 0x222244);
    gridHelper.position.y = -3;
    (gridHelper.material as THREE.Material).opacity = 0.4;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    // Axis helper
    const axesHelper = new THREE.AxesHelper(3);
    axesHelper.position.y = -3;
    scene.add(axesHelper);

    // =============================================
    // NURBS Surface Definition
    // =============================================
    const degreeU = 3;
    const degreeV = 3;

    const controlPoints = generateControlPoints(geometryType);
    const cpRows = controlPoints.length;
    const cpCols = controlPoints[0].length;

    // Knot vectors (clamped, degree 3, 5 control points → 9 knots)
    const knotsU = [0, 0, 0, 0, 0.5, 1, 1, 1, 1];
    const knotsV = [0, 0, 0, 0, 0.5, 1, 1, 1, 1];

    // Create NURBS surface
    const nurbsSurface = new NURBSSurface(degreeU, degreeV, knotsU, knotsV, controlPoints);

    // =============================================
    // Generate Quad Mesh from NURBS
    // =============================================
    const segU = subdivisionsU;
    const segV = subdivisionsV;

    // Sample points on the NURBS surface
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

        // Two triangles per quad
        triIndices.push(a, c, b);
        triIndices.push(b, c, d);
      }
    }

    // =============================================
    // Shaded Surface (triangles for GPU)
    // =============================================
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
    scene.add(surfaceMesh);

    // =============================================
    // Wireframe Overlay (TRUE QUAD TOPOLOGY)
    // =============================================
    // Build edge buffer showing QUAD edges, NOT triangle edges
    const edgeVertices: number[] = [];

    for (let i = 0; i < segU; i++) {
      for (let j = 0; j < segV; j++) {
        const a = i * (segV + 1) + j;
        const b = a + 1;
        const c = (i + 1) * (segV + 1) + j;
        const d = c + 1;

        // 4 edges of the quad: a-b, a-c, b-d, c-d
        // Bottom edge (a → b)
        edgeVertices.push(
          vertices[a * 3], vertices[a * 3 + 1], vertices[a * 3 + 2],
          vertices[b * 3], vertices[b * 3 + 1], vertices[b * 3 + 2],
        );
        // Left edge (a → c)
        edgeVertices.push(
          vertices[a * 3], vertices[a * 3 + 1], vertices[a * 3 + 2],
          vertices[c * 3], vertices[c * 3 + 1], vertices[c * 3 + 2],
        );

        // Right edge of last column (b → d)
        if (j === segV - 1) {
          edgeVertices.push(
            vertices[b * 3], vertices[b * 3 + 1], vertices[b * 3 + 2],
            vertices[d * 3], vertices[d * 3 + 1], vertices[d * 3 + 2],
          );
        }

        // Top edge of last row (c → d)
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

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x88ccff,
      opacity: 0.7,
      transparent: true,
    });

    const wireframeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    wireframeLines.visible = showWireframe;
    scene.add(wireframeLines);

    // =============================================
    // Control Points Visualization
    // =============================================
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

    // Control point grid lines
    const cpLineVertices: number[] = [];
    // U direction lines
    for (let i = 0; i < cpRows; i++) {
      for (let j = 0; j < cpCols - 1; j++) {
        const a = controlPoints[i][j];
        const b = controlPoints[i][j + 1];
        cpLineVertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    // V direction lines
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

    scene.add(cpGroup);

    // =============================================
    // Animation
    // =============================================
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const onWindowResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // Reset camera
    const resetCamera = () => {
      camera.position.set(12, 8, 12);
      controls.target.set(0, 0, 0);
      controls.update();
    };
    resetCameraRef.current = resetCamera;

    // Cleanup
    return () => {
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(animationFrameId);
      surfaceGeometry.dispose();
      edgeGeometry.dispose();
      cpSphereGeo.dispose();
      cpLineGeo.dispose();
      surfaceMaterial.dispose();
      edgeMaterial.dispose();
      cpMaterial.dispose();
      cpLineMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      resetCameraRef.current = null;
    };
  }, [subdivisionsU, subdivisionsV, showWireframe, showSurface, showControlPoints, geometryType]);

  return <div ref={containerRef} className="w-full h-full" />;
}
