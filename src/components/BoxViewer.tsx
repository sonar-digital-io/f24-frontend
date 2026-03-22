import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface BoxViewerProps {
  wireframe: boolean;
  width: number;
  height: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  selectedFace: string | null;
  onFaceSelect: (face: string | null) => void;
  facePosition: number;
  viewType?: 'top' | 'left' | 'front' | 'perspective';
  selectedVertex: THREE.Vector3 | null;
  onVertexSelect: (vertex: THREE.Vector3 | null, vertexIndex?: number) => void;
  bezierPoints?: THREE.Vector3[] | null;
}

type FaceName = 'right' | 'left' | 'top' | 'bottom' | 'front' | 'back' | null;

export function BoxViewer({ 
  wireframe, 
  width, 
  height, 
  positionX, 
  positionY, 
  positionZ,
  selectedFace,
  onFaceSelect,
  facePosition,
  viewType = 'perspective',
  selectedVertex,
  onVertexSelect,
  bezierPoints
}: BoxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const boxRef = useRef<THREE.Mesh | null>(null);
  const geometryRef = useRef<THREE.BoxGeometry | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const selectedFaceMeshRef = useRef<THREE.Mesh | null>(null);
  const selectedVertexMeshRef = useRef<THREE.Mesh | null>(null);
  const selectedVertexIndexRef = useRef<number | null>(null);
  const sceneRefForCleanup = useRef<THREE.Scene | null>(null);

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
    sceneRef.current = scene;
    sceneRefForCleanup.current = scene;

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
    scene.background = skyTexture;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    
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
      default:
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);
        break;
    }
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Raycaster for face selection
    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    
    // Lock axes for orthographic views
    if (viewType === 'top') {
      controls.maxPolarAngle = Math.PI / 2;
      controls.minPolarAngle = Math.PI / 2;
    } else if (viewType === 'left' || viewType === 'front') {
      controls.enableRotate = false;
      controls.enablePan = true;
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Create box geometry with subdivision (2 extra edges per edge = 3 segments)
    const geometry = new THREE.BoxGeometry(width, height, width, 3, 3, 3);
    geometryRef.current = geometry;

    // Create material based on wireframe prop
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a90e2,
      wireframe: wireframe,
      metalness: 0.3,
      roughness: 0.4,
    });

    // Create box mesh
    const box = new THREE.Mesh(geometry, material);
    box.position.set(positionX, positionY, positionZ);
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);
    boxRef.current = box;

    // Selected face mesh will be created/updated in useEffect

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Function to get face name from face index
    const getFaceName = (faceIndex: number): FaceName => {
      // BoxGeometry face indices:
      // 0: right (+x), 1: left (-x)
      // 2: top (+y), 3: bottom (-y)
      // 4: front (+z), 5: back (-z)
      const faceMap: FaceName[] = ['right', 'left', 'top', 'bottom', 'front', 'back'];
      return faceMap[Math.floor(faceIndex / 2)] || null;
    };

    // Function to find nearest vertex to intersection point
    const findNearestVertex = (intersection: THREE.Intersection, geometry: THREE.BoxGeometry): { vertex: THREE.Vector3; index: number } | null => {
      if (!intersection.face || !boxRef.current) return null;

      const vertices = geometry.attributes.position;
      const face = intersection.face;
      const point = intersection.point;
      
      // Get the three vertices of the clicked face
      const v1 = new THREE.Vector3().fromBufferAttribute(vertices, face.a);
      const v2 = new THREE.Vector3().fromBufferAttribute(vertices, face.b);
      const v3 = new THREE.Vector3().fromBufferAttribute(vertices, face.c);
      
      // Transform vertices to world space
      boxRef.current.localToWorld(v1);
      boxRef.current.localToWorld(v2);
      boxRef.current.localToWorld(v3);
      
      // Find the closest vertex
      const distances = [
        { vertex: v1, index: face.a, dist: point.distanceTo(v1) },
        { vertex: v2, index: face.b, dist: point.distanceTo(v2) },
        { vertex: v3, index: face.c, dist: point.distanceTo(v3) }
      ];
      
      distances.sort((a, b) => a.dist - b.dist);
      return { vertex: distances[0].vertex, index: distances[0].index };
    };

    // Click handler for face and vertex selection
    const onMouseClick = (event: MouseEvent) => {
      if (!cameraRef.current || !raycasterRef.current || !boxRef.current || !rendererRef.current || !geometryRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouse, cameraRef.current);
      
      const intersects = raycasterRef.current.intersectObject(boxRef.current);
      
      if (intersects.length > 0) {
        const intersection = intersects[0];
        if (intersection.face) {
          // Check if Shift or Ctrl is pressed for vertex selection
          if (event.shiftKey || event.ctrlKey) {
            const result = findNearestVertex(intersection, geometryRef.current);
            if (result) {
              selectedVertexIndexRef.current = result.index;
              onVertexSelect(result.vertex, result.index);
              onFaceSelect(null); // Clear face selection when selecting vertex
            }
          } else {
            // Normal face selection
            const faceIndex = intersection.faceIndex!;
            const faceName = getFaceName(faceIndex);
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

    // Animation
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

    // Cleanup
    return () => {
      window.removeEventListener('resize', onWindowResize);
      renderer.domElement.removeEventListener('click', onMouseClick);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
      material.dispose();
      if (selectedFaceMeshRef.current) {
        if (selectedFaceMeshRef.current.geometry) {
          selectedFaceMeshRef.current.geometry.dispose();
        }
        if (selectedFaceMeshRef.current.material instanceof THREE.Material) {
          selectedFaceMeshRef.current.material.dispose();
        }
      }
      if (selectedVertexMeshRef.current) {
        if (selectedVertexMeshRef.current.geometry) {
          selectedVertexMeshRef.current.geometry.dispose();
        }
        if (selectedVertexMeshRef.current.material instanceof THREE.Material) {
          selectedVertexMeshRef.current.material.dispose();
        }
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [viewType]);

  // Update wireframe when prop changes
  useEffect(() => {
    if (boxRef.current && boxRef.current.material instanceof THREE.MeshStandardMaterial) {
      boxRef.current.material.wireframe = wireframe;
    }
  }, [wireframe]);

  // Update box dimensions when props change
  useEffect(() => {
    if (geometryRef.current && boxRef.current) {
      geometryRef.current.dispose();
      const newGeometry = new THREE.BoxGeometry(width, height, width, 3, 3, 3);
      geometryRef.current = newGeometry;
      boxRef.current.geometry.dispose();
      boxRef.current.geometry = newGeometry;

    }
  }, [width, height]);

  // Update box position when props change
  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.position.set(positionX, positionY, positionZ);
    }
  }, [positionX, positionY, positionZ]);

  // Create/update selected face as separate fragment
  useEffect(() => {
    if (!sceneRefForCleanup.current || !boxRef.current) return;

    const scene = sceneRefForCleanup.current;
    const box = boxRef.current;

    // Remove existing selected face mesh
    if (selectedFaceMeshRef.current) {
      scene.remove(selectedFaceMeshRef.current);
      if (selectedFaceMeshRef.current.geometry) {
        selectedFaceMeshRef.current.geometry.dispose();
      }
      if (selectedFaceMeshRef.current.material instanceof THREE.Material) {
        selectedFaceMeshRef.current.material.dispose();
      }
      selectedFaceMeshRef.current = null;
    }

    // Create new selected face mesh if a face is selected
    if (selectedFace) {
      let faceGeometry: THREE.PlaneGeometry;
      let facePos = new THREE.Vector3(positionX, positionY, positionZ);
      let faceRotation = new THREE.Euler(0, 0, 0);
      const offset = 0.01; // Small offset to separate from box

      switch (selectedFace) {
        case 'right': // +X face
          faceGeometry = new THREE.PlaneGeometry(width, height);
          faceRotation.set(0, -Math.PI / 2, 0);
          facePos.x = positionX + width / 2 + facePosition + offset;
          break;
        case 'left': // -X face
          faceGeometry = new THREE.PlaneGeometry(width, height);
          faceRotation.set(0, Math.PI / 2, 0);
          facePos.x = positionX - width / 2 - facePosition - offset;
          break;
        case 'top': // +Y face
          faceGeometry = new THREE.PlaneGeometry(width, width);
          faceRotation.set(-Math.PI / 2, 0, 0);
          facePos.y = positionY + height / 2 + facePosition + offset;
          break;
        case 'bottom': // -Y face
          faceGeometry = new THREE.PlaneGeometry(width, width);
          faceRotation.set(Math.PI / 2, 0, 0);
          facePos.y = positionY - height / 2 - facePosition - offset;
          break;
        case 'front': // +Z face
          faceGeometry = new THREE.PlaneGeometry(width, height);
          faceRotation.set(0, 0, 0);
          facePos.z = positionZ + width / 2 + facePosition + offset;
          break;
        case 'back': // -Z face
          faceGeometry = new THREE.PlaneGeometry(width, height);
          faceRotation.set(0, Math.PI, 0);
          facePos.z = positionZ - width / 2 - facePosition - offset;
          break;
        default:
          return;
      }

      const faceMaterial = new THREE.MeshStandardMaterial({
        color: 0xff8800, // Orange
        side: THREE.DoubleSide,
        metalness: 0.3,
        roughness: 0.4,
      });

      const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
      faceMesh.position.copy(facePos);
      faceMesh.rotation.copy(faceRotation);
      scene.add(faceMesh);
      selectedFaceMeshRef.current = faceMesh;
    }
  }, [selectedFace, width, height, positionX, positionY, positionZ, facePosition]);

  // Create/update selected vertex indicator
  useEffect(() => {
    if (!sceneRefForCleanup.current) return;

    const scene = sceneRefForCleanup.current;

    // Remove existing vertex indicator
    if (selectedVertexMeshRef.current) {
      scene.remove(selectedVertexMeshRef.current);
      if (selectedVertexMeshRef.current.geometry) {
        selectedVertexMeshRef.current.geometry.dispose();
      }
      if (selectedVertexMeshRef.current.material instanceof THREE.Material) {
        selectedVertexMeshRef.current.material.dispose();
      }
      selectedVertexMeshRef.current = null;
    }

    // Create new vertex indicator if a vertex is selected
    if (selectedVertex) {
      const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 0xff8800, // Orange
        emissive: 0xff8800,
        emissiveIntensity: 0.5,
      });

      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(selectedVertex);
      scene.add(sphere);
      selectedVertexMeshRef.current = sphere;
    }
  }, [selectedVertex]);

  // Update geometry when Bézier points change
  useEffect(() => {
    if (!bezierPoints || !boxRef.current || !geometryRef.current || selectedVertexIndexRef.current === null) return;

    // Get the modified vertex position from Bézier P3
    const modifiedVertex = bezierPoints[3];
    
    // Get geometry vertices
    const positions = geometryRef.current.attributes.position;
    const vertexIndex = selectedVertexIndexRef.current;
    
    // Calculate vertex position in local space
    const worldVertex = modifiedVertex.clone();
    boxRef.current.worldToLocal(worldVertex);
    
    // Update the vertex position
    positions.setXYZ(vertexIndex, worldVertex.x, worldVertex.y, worldVertex.z);
    positions.needsUpdate = true;
    
    // Recalculate normals
    geometryRef.current.computeVertexNormals();
    
    // Update geometry
    boxRef.current.geometry = geometryRef.current;
  }, [bezierPoints]);

  return <div ref={containerRef} className="w-full h-full" />;
}
