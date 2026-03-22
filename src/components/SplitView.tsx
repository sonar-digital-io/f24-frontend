import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface SplitViewProps {
  wireframe: boolean;
  width: number;
  height: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  selectedFace: string | null;
  onFaceSelect: (face: string | null) => void;
  facePosition: number;
  selectedVertex: THREE.Vector3 | null;
  onVertexSelect: (vertex: THREE.Vector3 | null, vertexIndex?: number) => void;
  bezierPoints?: THREE.Vector3[] | null;
  onViewZoom?: (view: string) => void;
}

type ViewType = 'top' | 'left' | 'front' | 'perspective';

export function SplitView({
  wireframe,
  width,
  height,
  positionX,
  positionY,
  positionZ,
  selectedFace,
  onFaceSelect,
  facePosition,
  selectedVertex,
  onVertexSelect,
  bezierPoints,
  onViewZoom,
}: SplitViewProps) {
  const topLeftRef = useRef<HTMLDivElement>(null);
  const bottomLeftRef = useRef<HTMLDivElement>(null);
  const topRightRef = useRef<HTMLDivElement>(null);
  const bottomRightRef = useRef<HTMLDivElement>(null);

  const scenesRef = useRef<THREE.Scene[]>([]);
  const camerasRef = useRef<THREE.PerspectiveCamera[]>([]);
  const renderersRef = useRef<THREE.WebGLRenderer[]>([]);
  const controlsRef = useRef<OrbitControls[]>([]);
  const boxRefs = useRef<THREE.Mesh[]>([]);
  const selectedFaceMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const selectedVertexMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const geometriesRef = useRef<THREE.BoxGeometry[]>([]);
  const selectedVertexIndexRef = useRef<number | null>(null);

  useEffect(() => {
    const containers = [topLeftRef, bottomLeftRef, topRightRef, bottomRightRef];
    const viewTypes: ViewType[] = ['top', 'left', 'front', 'perspective'];
    const scenes: THREE.Scene[] = [];
    const cameras: THREE.PerspectiveCamera[] = [];
    const renderers: THREE.WebGLRenderer[] = [];
    const controls: OrbitControls[] = [];
    const boxes: THREE.Mesh[] = [];
    const selectedFaces: (THREE.Mesh | null)[] = [];

    // Sky gradient background
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(0.3, '#2a2a2a');
    gradient.addColorStop(0.6, '#3a3a3a');
    gradient.addColorStop(1, '#2a2a2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const skyTexture = new THREE.CanvasTexture(canvas);

    containers.forEach((containerRef, index) => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const viewType = viewTypes[index];

      // Scene
      const scene = new THREE.Scene();
      scene.background = skyTexture;
      scenes.push(scene);

      // Camera
      const camera = new THREE.PerspectiveCamera(50, containerWidth / containerHeight, 0.1, 1000);
      
      // Set camera position based on view type
      switch (viewType) {
        case 'top':
          camera.position.set(0, 10, 0);
          camera.lookAt(0, 0, 0);
          camera.up.set(0, 0, -1);
          break;
        case 'left':
          camera.position.set(-10, 0, 0);
          camera.lookAt(0, 0, 0);
          break;
        case 'front':
          camera.position.set(0, 0, 10);
          camera.lookAt(0, 0, 0);
          break;
        case 'perspective':
          camera.position.set(5, 5, 5);
          camera.lookAt(0, 0, 0);
          break;
      }
      cameras.push(camera);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(containerWidth, containerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);
      renderers.push(renderer);

      // Controls
      const orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.enableDamping = true;
      orbitControls.dampingFactor = 0.05;
      orbitControls.target.set(0, 0, 0);
      
      // Lock axes for orthographic views
      if (viewType === 'top') {
        orbitControls.maxPolarAngle = Math.PI / 2;
        orbitControls.minPolarAngle = Math.PI / 2;
      } else if (viewType === 'left') {
        orbitControls.enableRotate = false;
        orbitControls.enablePan = true;
      } else if (viewType === 'front') {
        orbitControls.enableRotate = false;
        orbitControls.enablePan = true;
      }
      
      controls.push(orbitControls);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 5);
      scene.add(directionalLight);

      // Create box geometry with subdivision (2 extra edges per edge = 3 segments)
      const geometry = new THREE.BoxGeometry(width, height, width, 3, 3, 3);
      geometriesRef.current.push(geometry);
      const material = new THREE.MeshStandardMaterial({
        color: 0x4a90e2,
        wireframe: wireframe,
        metalness: 0.3,
        roughness: 0.4,
      });

      const box = new THREE.Mesh(geometry, material);
      box.position.set(positionX, positionY, positionZ);
      box.castShadow = true;
      box.receiveShadow = true;
      scene.add(box);
      boxes.push(box);

      // Grid helper
      const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
      gridHelper.position.y = 0;
      scene.add(gridHelper);

      // Raycaster for face and vertex selection
      const raycaster = new THREE.Raycaster();
      
      // Function to find nearest vertex to intersection point
      const findNearestVertex = (intersection: THREE.Intersection, geometry: THREE.BoxGeometry): { vertex: THREE.Vector3; index: number } | null => {
        if (!intersection.face) return null;

        const vertices = geometry.attributes.position;
        const face = intersection.face;
        const point = intersection.point;
        
        // Get the three vertices of the clicked face
        const v1 = new THREE.Vector3().fromBufferAttribute(vertices, face.a);
        const v2 = new THREE.Vector3().fromBufferAttribute(vertices, face.b);
        const v3 = new THREE.Vector3().fromBufferAttribute(vertices, face.c);
        
        // Transform vertices to world space
        box.localToWorld(v1);
        box.localToWorld(v2);
        box.localToWorld(v3);
        
        // Find the closest vertex
        const distances = [
          { vertex: v1, index: face.a, dist: point.distanceTo(v1) },
          { vertex: v2, index: face.b, dist: point.distanceTo(v2) },
          { vertex: v3, index: face.c, dist: point.distanceTo(v3) }
        ];
        
        distances.sort((a, b) => a.dist - b.dist);
        return { vertex: distances[0].vertex, index: distances[0].index };
      };
      
      const onMouseClick = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(box);
        
        if (intersects.length > 0) {
          const intersection = intersects[0];
          if (intersection.face) {
            // Check if Shift or Ctrl is pressed for vertex selection
            if (event.shiftKey || event.ctrlKey) {
              const result = findNearestVertex(intersection, geometry);
              if (result) {
                selectedVertexIndexRef.current = result.index;
                onVertexSelect(result.vertex, result.index);
                onFaceSelect(null); // Clear face selection when selecting vertex
              }
            } else {
              // Normal face selection
              const faceIndex = intersection.faceIndex!;
              const faceMap: string[] = ['right', 'left', 'top', 'bottom', 'front', 'back'];
              const faceName = faceMap[Math.floor(faceIndex / 2)] || null;
              onFaceSelect(faceName);
              onVertexSelect(null); // Clear vertex selection when selecting face
            }
          }
        } else {
          // Click on empty space - unselect everything
          onFaceSelect(null);
          onVertexSelect(null);
          selectedVertexIndexRef.current = null;
        }
      };

      renderer.domElement.addEventListener('click', onMouseClick);
    });

    scenesRef.current = scenes;
    camerasRef.current = cameras;
    renderersRef.current = renderers;
    controlsRef.current = controls;
    boxRefs.current = boxes;
    selectedFaceMeshRefs.current = selectedFaces;
    selectedVertexMeshRefs.current = [];

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      controls.forEach((control) => control.update());
      
      renderers.forEach((renderer, i) => {
        renderer.render(scenes[i], cameras[i]);
      });
    };
    animate();

    // Handle resize
    const onWindowResize = () => {
      containers.forEach((containerRef, index) => {
        if (!containerRef.current) return;
        const newWidth = containerRef.current.clientWidth;
        const newHeight = containerRef.current.clientHeight;
        
        cameras[index].aspect = newWidth / newHeight;
        cameras[index].updateProjectionMatrix();
        renderers[index].setSize(newWidth, newHeight);
      });
    };
    window.addEventListener('resize', onWindowResize);

    return () => {
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(animationFrameId);
      
      renderers.forEach((renderer) => {
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      });
    };
  }, []);

  // Update wireframe
  useEffect(() => {
    boxRefs.current.forEach((box) => {
      if (box.material instanceof THREE.MeshStandardMaterial) {
        box.material.wireframe = wireframe;
      }
    });
  }, [wireframe]);

  // Update box dimensions
  useEffect(() => {
    boxRefs.current.forEach((box, index) => {
      const newGeometry = new THREE.BoxGeometry(width, height, width, 3, 3, 3);
      if (geometriesRef.current[index]) {
        geometriesRef.current[index].dispose();
      }
      geometriesRef.current[index] = newGeometry;
      box.geometry.dispose();
      box.geometry = newGeometry;
    });
  }, [width, height]);

  // Update box position
  useEffect(() => {
    boxRefs.current.forEach((box) => {
      box.position.set(positionX, positionY, positionZ);
    });
  }, [positionX, positionY, positionZ]);

  // Update selected face
  useEffect(() => {
    scenesRef.current.forEach((scene, index) => {
      // Remove existing selected face
      if (selectedFaceMeshRefs.current[index]) {
        scene.remove(selectedFaceMeshRefs.current[index]!);
        selectedFaceMeshRefs.current[index]!.geometry.dispose();
        if (selectedFaceMeshRefs.current[index]!.material instanceof THREE.Material) {
          selectedFaceMeshRefs.current[index]!.material.dispose();
        }
        selectedFaceMeshRefs.current[index] = null;
      }

      // Remove existing selected vertex
      if (selectedVertexMeshRefs.current[index]) {
        scene.remove(selectedVertexMeshRefs.current[index]!);
        selectedVertexMeshRefs.current[index]!.geometry.dispose();
        if (selectedVertexMeshRefs.current[index]!.material instanceof THREE.Material) {
          selectedVertexMeshRefs.current[index]!.material.dispose();
        }
        selectedVertexMeshRefs.current[index] = null;
      }

      // Create new selected face
      if (selectedFace && boxRefs.current[index]) {
        const box = boxRefs.current[index];
        let faceGeometry: THREE.PlaneGeometry;
        let facePos = new THREE.Vector3(positionX, positionY, positionZ);
        let faceRotation = new THREE.Euler(0, 0, 0);
        const offset = 0.01;

        switch (selectedFace) {
          case 'right':
            faceGeometry = new THREE.PlaneGeometry(width, height);
            faceRotation.set(0, -Math.PI / 2, 0);
            facePos.x = positionX + width / 2 + facePosition + offset;
            break;
          case 'left':
            faceGeometry = new THREE.PlaneGeometry(width, height);
            faceRotation.set(0, Math.PI / 2, 0);
            facePos.x = positionX - width / 2 - facePosition - offset;
            break;
          case 'top':
            faceGeometry = new THREE.PlaneGeometry(width, width);
            faceRotation.set(-Math.PI / 2, 0, 0);
            facePos.y = positionY + height / 2 + facePosition + offset;
            break;
          case 'bottom':
            faceGeometry = new THREE.PlaneGeometry(width, width);
            faceRotation.set(Math.PI / 2, 0, 0);
            facePos.y = positionY - height / 2 - facePosition - offset;
            break;
          case 'front':
            faceGeometry = new THREE.PlaneGeometry(width, height);
            faceRotation.set(0, 0, 0);
            facePos.z = positionZ + width / 2 + facePosition + offset;
            break;
          case 'back':
            faceGeometry = new THREE.PlaneGeometry(width, height);
            faceRotation.set(0, Math.PI, 0);
            facePos.z = positionZ - width / 2 - facePosition - offset;
            break;
          default:
            return;
        }

        const faceMaterial = new THREE.MeshStandardMaterial({
          color: 0xff8800,
          side: THREE.DoubleSide,
          metalness: 0.3,
          roughness: 0.4,
        });

        const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
        faceMesh.position.copy(facePos);
        faceMesh.rotation.copy(faceRotation);
        scene.add(faceMesh);
        selectedFaceMeshRefs.current[index] = faceMesh;
      }

      // Create new selected vertex indicator
      if (selectedVertex && boxRefs.current[index]) {
        const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const sphereMaterial = new THREE.MeshStandardMaterial({
          color: 0xff8800, // Orange
          emissive: 0xff8800,
          emissiveIntensity: 0.5,
        });

        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.copy(selectedVertex);
        scene.add(sphere);
        selectedVertexMeshRefs.current[index] = sphere;
      }
    });
  }, [selectedFace, selectedVertex, width, height, positionX, positionY, positionZ, facePosition]);

  // Update geometry when Bézier points change
  useEffect(() => {
    if (!bezierPoints || selectedVertexIndexRef.current === null) return;

    boxRefs.current.forEach((box, index) => {
      if (!box || !geometriesRef.current[index]) return;

      const geometry = geometriesRef.current[index];
      const vertexIndex = selectedVertexIndexRef.current!;
      
      // Get the modified vertex position from Bézier P3
      const modifiedVertex = bezierPoints[3];
      
      // Calculate vertex position in local space
      const worldVertex = modifiedVertex.clone();
      box.worldToLocal(worldVertex);
      
      // Update the vertex position
      const positions = geometry.attributes.position;
      positions.setXYZ(vertexIndex, worldVertex.x, worldVertex.y, worldVertex.z);
      positions.needsUpdate = true;
      
      // Recalculate normals
      geometry.computeVertexNormals();
    });
  }, [bezierPoints]);

  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2">
      {/* Top Left - Top View */}
      <div ref={topLeftRef} className="relative w-full h-full border border-border">
        <div 
          className="absolute bottom-2 right-2 z-10 bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1 text-xs font-semibold cursor-pointer hover:bg-muted"
          onClick={() => onViewZoom?.('top')}
        >
          Top
        </div>
      </div>

      {/* Bottom Left - Left View */}
      <div ref={bottomLeftRef} className="relative w-full h-full border border-border">
        <div 
          className="absolute bottom-2 right-2 z-10 bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1 text-xs font-semibold cursor-pointer hover:bg-muted"
          onClick={() => onViewZoom?.('left')}
        >
          Left
        </div>
      </div>

      {/* Top Right - Front View */}
      <div ref={topRightRef} className="relative w-full h-full border border-border">
        <div 
          className="absolute bottom-2 right-2 z-10 bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1 text-xs font-semibold cursor-pointer hover:bg-muted"
          onClick={() => onViewZoom?.('front')}
        >
          Front
        </div>
      </div>

      {/* Bottom Right - Perspective View */}
      <div ref={bottomRightRef} className="relative w-full h-full border border-border">
        <div 
          className="absolute bottom-2 right-2 z-10 bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1 text-xs font-semibold cursor-pointer hover:bg-muted"
          onClick={() => onViewZoom?.('perspective')}
        >
          Perspective
        </div>
      </div>
    </div>
  );
}
