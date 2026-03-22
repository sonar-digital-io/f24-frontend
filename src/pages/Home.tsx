import { Link } from 'react-router-dom';
import { useState } from 'react';
import * as THREE from 'three';
import { BoxViewer } from '@/components/BoxViewer';
import { SplitView } from '@/components/SplitView';
import { BezierPanel } from '@/components/BezierPanel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

export function Home() {
  const [viewMode, setViewMode] = useState<'surface' | 'wireframe'>('surface');
  const [layoutMode, setLayoutMode] = useState<'perspective' | 'separate'>('perspective');
  const [zoomedView, setZoomedView] = useState<'top' | 'left' | 'front' | 'perspective' | null>(null);
  const [width, setWidth] = useState<number>(2);
  const [height, setHeight] = useState<number>(2);
  const [positionX, setPositionX] = useState<number>(0);
  const [positionY, setPositionY] = useState<number>(0);
  const [positionZ, setPositionZ] = useState<number>(0);
  const [selectedFace, setSelectedFace] = useState<string | null>(null);
  const [facePosition, setFacePosition] = useState<number>(0);
  const [selectedVertex, setSelectedVertex] = useState<THREE.Vector3 | null>(null);
  const [bezierPoints, setBezierPoints] = useState<THREE.Vector3[] | null>(null);

  // Reset face position when selection changes
  const handleFaceSelect = (face: string | null) => {
    setSelectedFace(face);
    setFacePosition(0);
  };

  const handleVertexSelect = (vertex: THREE.Vector3 | null) => {
    setSelectedVertex(vertex);
  };

  // Handle vertex update from Bézier panel
  const handleVertexUpdate = (vertex: THREE.Vector3) => {
    setSelectedVertex(vertex);
  };

  const handleViewZoom = (view: 'top' | 'left' | 'front' | 'perspective') => {
    if (zoomedView === view) {
      // If clicking the same view, return to split view
      setZoomedView(null);
      setLayoutMode('separate');
    } else {
      // Zoom to selected view
      setZoomedView(view);
      setLayoutMode('separate');
    }
  };

  const commonProps = {
    wireframe: viewMode === 'wireframe',
    width,
    height,
    positionX,
    positionY,
    positionZ,
    selectedFace,
    onFaceSelect: handleFaceSelect,
    facePosition,
    selectedVertex,
    onVertexSelect: handleVertexSelect,
    bezierPoints,
  };

  return (
    <div className="threed-container fixed inset-0 w-screen h-screen">
      {layoutMode === 'perspective' ? (
        <BoxViewer {...commonProps} />
      ) : zoomedView ? (
        <div className="relative w-full h-full">
          <BoxViewer {...commonProps} viewType={zoomedView} />
          <div 
            className="absolute bottom-2 right-2 z-10 bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1 text-xs font-semibold cursor-pointer hover:bg-muted"
            onClick={() => setZoomedView(null)}
          >
            {zoomedView.charAt(0).toUpperCase() + zoomedView.slice(1)}
          </div>
        </div>
      ) : (
        <SplitView {...commonProps} onViewZoom={handleViewZoom} />
      )}
      
      {/* View Mode Switcher - Top Center */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-[100]">
        <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-0.5 shadow-lg">
          <Tabs 
            value={layoutMode} 
            onValueChange={(value) => {
              setLayoutMode(value as 'perspective' | 'separate');
              setZoomedView(null);
            }}
          >
            <TabsList>
              <TabsTrigger value="perspective">Perspective</TabsTrigger>
              <TabsTrigger value="separate">Separate</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Bézier Panel - Left Side */}
      {selectedVertex && (
        <div className="absolute top-4 left-4 z-[100] w-64">
          <BezierPanel 
            selectedVertex={selectedVertex} 
            onVertexUpdate={handleVertexUpdate}
            onBezierChange={setBezierPoints}
          />
        </div>
      )}

      {/* Small Menu */}
      <div className={`absolute top-4 ${selectedVertex ? 'left-[280px]' : 'left-4'} z-[100] flex flex-col gap-1.5`}>
        <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-1 shadow-lg">
          <nav className="flex gap-1">
            <Link
              to="/"
              className="px-1.5 py-0.5 text-xs font-medium text-foreground bg-muted rounded"
            >
              Home
            </Link>
            <Link
              to="/game"
              className="px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded"
            >
              Game
            </Link>
          </nav>
        </div>

        {/* Cube Parameters Section */}
        <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
          <h3 className="text-xs font-semibold mb-1.5 text-foreground">Cube Parameters</h3>
          <div className="space-y-1.5">
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">
                Width (units)
              </label>
              <Input
                type="number"
                value={width}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    setWidth(value);
                  }
                }}
                min="0.1"
                step="0.1"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">
                Height (units)
              </label>
              <Input
                type="number"
                value={height}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    setHeight(value);
                  }
                }}
                min="0.1"
                step="0.1"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Position Section */}
        <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
          <h3 className="text-xs font-semibold mb-1.5 text-foreground">Position</h3>
          <div className="space-y-1.5">
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">
                X (units)
              </label>
              <Input
                type="number"
                value={positionX}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    setPositionX(value);
                  }
                }}
                step="0.1"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">
                Y (units)
              </label>
              <Input
                type="number"
                value={positionY}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    setPositionY(value);
                  }
                }}
                step="0.1"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">
                Z (units)
              </label>
              <Input
                type="number"
                value={positionZ}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    setPositionZ(value);
                  }
                }}
                step="0.1"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Selected Face Display */}
        {selectedFace && (
          <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
            <h3 className="text-xs font-semibold mb-1.5 text-foreground">Selected Face</h3>
            <p className="text-xs text-muted-foreground capitalize mb-1.5">{selectedFace}</p>
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">
                Position (units)
              </label>
              <Input
                type="number"
                value={facePosition}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    setFacePosition(value);
                  }
                }}
                step="0.1"
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Selected Vertex Display */}
        {selectedVertex && (
          <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
            <h3 className="text-xs font-semibold mb-1.5 text-foreground">Selected Vertex</h3>
            <div className="space-y-1">
              <div>
                <label className="block text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">
                  X (units)
                </label>
                <p className="text-xs text-foreground">{selectedVertex.x.toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">
                  Y (units)
                </label>
                <p className="text-xs text-foreground">{selectedVertex.y.toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">
                  Z (units)
                </label>
                <p className="text-xs text-foreground">{selectedVertex.z.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Surface/Wireframe Switcher */}
      <div className="absolute top-2 right-2 z-[100]">
        <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-0.5 shadow-lg">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'surface' | 'wireframe')}>
            <TabsList>
              <TabsTrigger value="surface">Surface</TabsTrigger>
              <TabsTrigger value="wireframe">Wireframe</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
