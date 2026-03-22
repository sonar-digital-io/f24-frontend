import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Focus } from 'lucide-react';

export function CadViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);
  const [windSpeed, setWindSpeed] = useState(50);

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
    camera.position.set(25, 15, 30);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 100;
    controls.target.set(0, 12, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.1;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(30, 40, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -10;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-20, 10, -10);
    scene.add(fillLight);

    // Materials
    const towerMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe8e8e8,
      metalness: 0.3,
      roughness: 0.4,
    });

    const nacelleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf0f0f0,
      metalness: 0.4,
      roughness: 0.3,
    });

    const bladeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xfafafa,
      metalness: 0.2,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });

    const hubMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd0d0d0,
      metalness: 0.5,
      roughness: 0.3,
    });

    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x555555,
      metalness: 0.1,
      roughness: 0.8,
    });

    // === BASE / FOUNDATION ===
    const baseGeometry = new THREE.CylinderGeometry(3, 4, 1.5, 8);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.75;
    base.castShadow = true;
    base.receiveShadow = true;

    // === TOWER (tapered) ===
    const towerHeight = 20;
    const towerGeometry = new THREE.CylinderGeometry(0.8, 1.5, towerHeight, 12);
    const tower = new THREE.Mesh(towerGeometry, towerMaterial);
    tower.position.y = 1.5 + towerHeight / 2;
    tower.castShadow = true;
    tower.receiveShadow = true;

    // === NACELLE (housing) ===
    const nacelleLength = 5;
    const nacelleGeometry = new THREE.BoxGeometry(2, 2, nacelleLength, 1, 1, 1);
    const nacelle = new THREE.Mesh(nacelleGeometry, nacelleMaterial);
    nacelle.position.set(0, 1.5 + towerHeight + 1, -1);
    nacelle.castShadow = true;

    // Nacelle back cap (rounded)
    const nacelleCapGeometry = new THREE.SphereGeometry(1, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const nacelleCap = new THREE.Mesh(nacelleCapGeometry, nacelleMaterial);
    nacelleCap.rotation.x = Math.PI / 2;
    nacelleCap.position.set(0, 1.5 + towerHeight + 1, -3.5);

    // === ROTOR GROUP (hub + blades) ===
    const rotorGroup = new THREE.Group();
    rotorGroup.position.set(0, 1.5 + towerHeight + 1, 1.5);

    // Hub (nose cone)
    const hubGeometry = new THREE.ConeGeometry(1, 2.5, 6);
    const hub = new THREE.Mesh(hubGeometry, hubMaterial);
    hub.rotation.x = -Math.PI / 2;
    hub.position.z = 1;
    hub.castShadow = true;
    rotorGroup.add(hub);

    // Hub back plate
    const hubBackGeometry = new THREE.CylinderGeometry(1, 1, 0.5, 6);
    const hubBack = new THREE.Mesh(hubBackGeometry, hubMaterial);
    hubBack.rotation.x = Math.PI / 2;
    hubBack.position.z = -0.25;
    rotorGroup.add(hubBack);

    // === BLADES ===
    const bladeLength = 12;
    const bladeWidth = 1.2;

    const createBlade = (length: number, width: number, material: THREE.Material): THREE.Group => {
      const bladeGroup = new THREE.Group();

      // Create blade shape using a custom geometry
      const shape = new THREE.Shape();

      // Blade profile (airfoil-like)
      shape.moveTo(0, 0);
      shape.lineTo(width * 0.3, length * 0.1);
      shape.lineTo(width * 0.2, length * 0.5);
      shape.lineTo(width * 0.1, length * 0.8);
      shape.lineTo(0, length);
      shape.lineTo(-width * 0.1, length * 0.8);
      shape.lineTo(-width * 0.15, length * 0.5);
      shape.lineTo(-width * 0.1, length * 0.1);
      shape.closePath();

      const extrudeSettings = {
        steps: 1,
        depth: 0.15,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 2,
      };

      const bladeGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const blade = new THREE.Mesh(bladeGeometry, material);

      // Position and rotate blade
      blade.position.set(0, 1.2, -0.075);
      blade.rotation.x = 0.15; // Blade pitch
      blade.castShadow = true;
      blade.receiveShadow = true;

      bladeGroup.add(blade);

      // Blade root (connection to hub)
      const rootGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 6);
      const root = new THREE.Mesh(rootGeometry, material);
      root.position.y = 0.6;
      root.castShadow = true;
      bladeGroup.add(root);

      return bladeGroup;
    };

    for (let i = 0; i < 3; i++) {
      const blade = createBlade(bladeLength, bladeWidth, bladeMaterial);
      blade.rotation.z = (i * Math.PI * 2) / 3;
      rotorGroup.add(blade);
    }

    const turbine = new THREE.Group();
    turbine.add(base);
    turbine.add(tower);
    turbine.add(nacelle);
    turbine.add(nacelleCap);
    turbine.add(rotorGroup);
    scene.add(turbine);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x2d5016,
      metalness: 0,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // Add some low-poly hills
    const createHill = (x: number, z: number, height: number, radius: number) => {
      const hillGeometry = new THREE.ConeGeometry(radius, height, 8);
      const hillMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x3d6b1e,
        metalness: 0,
        roughness: 0.95,
        flatShading: true,
      });
      const hill = new THREE.Mesh(hillGeometry, hillMaterial);
      hill.position.set(x, height / 2, z);
      hill.receiveShadow = true;
      hill.castShadow = true;
      scene.add(hill);
    };

    createHill(-30, -20, 4, 8);
    createHill(40, -15, 3, 6);
    createHill(-20, 30, 5, 10);
    createHill(25, 35, 2.5, 5);

    // Grid on ground (subtle)
    const gridHelper = new THREE.GridHelper(200, 40, 0x1a3d0a, 0x1a3d0a);
    gridHelper.position.y = 0.01;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    // Animation
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate the blades based on wind speed
      const rotationSpeed = (windSpeed / 100) * 0.08;
      rotorGroup.rotation.z += rotationSpeed;

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

    // Reset camera function
    const resetCamera = () => {
      camera.position.set(25, 15, 30);
      controls.target.set(0, 12, 0);
      controls.update();
    };

    // Store reset function in ref
    resetCameraRef.current = resetCamera;

    // Cleanup
    return () => {
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      resetCameraRef.current = null;
    };
  }, [windSpeed]);

  const handleResetCamera = () => {
    resetCameraRef.current?.();
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Controls Panel */}
      <div className="absolute top-4 left-4 z-50">
        <Card className="bg-background/90 backdrop-blur-sm border border-border min-w-[200px]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5 mb-4 text-base font-semibold">
              <span>Wind Turbine</span>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                Wind Speed
              </label>
              <div className="flex items-center gap-2 mb-2">
                <Slider
                  value={[windSpeed]}
                  onValueChange={(value) => setWindSpeed(value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
              </div>
              <span className="block text-center text-2xl font-bold">{windSpeed}%</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetCamera}
              className="absolute top-2 right-2"
            >
              <Focus className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Turbine Info */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        <div className="flex justify-between items-center gap-5 px-4 py-2.5 bg-background/85 backdrop-blur-sm border border-border rounded-lg">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Tower Height</span>
          <span className="text-base font-semibold">20m</span>
        </div>
        <div className="flex justify-between items-center gap-5 px-4 py-2.5 bg-background/85 backdrop-blur-sm border border-border rounded-lg">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Blade Length</span>
          <span className="text-base font-semibold">12m</span>
        </div>
        <div className="flex justify-between items-center gap-5 px-4 py-2.5 bg-background/85 backdrop-blur-sm border border-border rounded-lg">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Rotor Diameter</span>
          <span className="text-base font-semibold">24m</span>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Info Panel */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <Card className="bg-background/85 backdrop-blur-sm border border-border">
          <CardContent className="px-5 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Drag to rotate • Scroll to zoom • Right-click to pan</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
