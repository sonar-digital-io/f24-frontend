// Dynamic OpenCascade type
type OpenCascadeInstance = any;

// Declare global for dynamic module loading
declare global {
  interface Window {
    opencascade?: any;
  }
}

class OpenCascadeService {
  private oc: OpenCascadeInstance | null = null;
  private isLoading = false;
  private isReady = false;
  private error: string | null = null;

  async initialize(): Promise<OpenCascadeInstance> {
    if (this.oc) {
      return this.oc;
    }

    this.isLoading = true;
    this.error = null;

    try {
      // Load the script that exposes window.opencascade
      await this.loadScript('/opencascade.wasm.js');

      if (!window.opencascade) {
        throw new Error('OpenCascade module not found on window');
      }

      this.oc = await window.opencascade({
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return '/opencascade.wasm.wasm';
          }
          return path;
        },
      });

      this.isReady = true;
      this.isLoading = false;
      console.log('OpenCascade.js initialized successfully');
      return this.oc;
    } catch (err) {
      console.error('OpenCascade initialization error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to initialize OpenCascade';
      this.error = errorMessage;
      this.isLoading = false;
      throw err;
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.opencascade) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  getOC(): OpenCascadeInstance | null {
    return this.oc;
  }

  // Create a simple box shape
  createBox(width: number, height: number, depth: number) {
    if (!this.oc) throw new Error('OpenCascade not initialized');
    const box = new this.oc.BRepPrimAPI_MakeBox_1(width, height, depth);
    return box.Shape();
  }

  // Create a sphere shape
  createSphere(radius: number) {
    if (!this.oc) throw new Error('OpenCascade not initialized');
    const sphere = new this.oc.BRepPrimAPI_MakeSphere_1(radius);
    return sphere.Shape();
  }

  // Create a cylinder shape
  createCylinder(radius: number, height: number) {
    if (!this.oc) throw new Error('OpenCascade not initialized');
    const cylinder = new this.oc.BRepPrimAPI_MakeCylinder_1(radius, height);
    return cylinder.Shape();
  }

  // Create a torus shape
  createTorus(majorRadius: number, minorRadius: number) {
    if (!this.oc) throw new Error('OpenCascade not initialized');
    const torus = new this.oc.BRepPrimAPI_MakeTorus_1(majorRadius, minorRadius);
    return torus.Shape();
  }

  // Create a cone shape
  createCone(bottomRadius: number, topRadius: number, height: number) {
    if (!this.oc) throw new Error('OpenCascade not initialized');
    const cone = new this.oc.BRepPrimAPI_MakeCone_2(bottomRadius, topRadius, height);
    return cone.Shape();
  }

  // Convert OpenCascade shape to triangulation data for Three.js
  tessellate(shape: any, linearDeflection = 0.1, angularDeflection = 0.5) {
    if (!this.oc) throw new Error('OpenCascade not initialized');

    const oc = this.oc;

    // Perform meshing
    new oc.BRepMesh_IncrementalMesh_2(shape, linearDeflection, false, angularDeflection, false);

    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    const explorer = new oc.TopExp_Explorer_2(
      shape,
      oc.TopAbs_ShapeEnum.TopAbs_FACE,
      oc.TopAbs_ShapeEnum.TopAbs_SHAPE
    );

    let indexOffset = 0;

    while (explorer.More()) {
      const face = oc.TopoDS.Face_1(explorer.Current());
      const location = new oc.TopLoc_Location_1();
      let triangulation: any;
      try {
        triangulation = oc.BRep_Tool.Triangulation(face, location);
      } catch {
        triangulation = oc.BRep_Tool.Triangulation(face, location, 0);
      }

      if (!triangulation.IsNull()) {
        const tri = triangulation.get();
        const nbNodes = tri.NbNodes();
        const nbTriangles = tri.NbTriangles();
        const transformation = location.Transformation();

        // Get vertices
        for (let i = 1; i <= nbNodes; i++) {
          const node = tri.Node(i);
          const transformedNode = node.Transformed(transformation);
          vertices.push(transformedNode.X(), transformedNode.Y(), transformedNode.Z());
        }

        // Get triangles and normals
        const orientation = face.Orientation_1();
        for (let i = 1; i <= nbTriangles; i++) {
          const triangle = tri.Triangle(i);
          let n1 = triangle.Value(1);
          let n2 = triangle.Value(2);
          let n3 = triangle.Value(3);

          // Reverse triangle orientation if face is reversed
          if (orientation === oc.TopAbs_Orientation.TopAbs_REVERSED) {
            [n2, n3] = [n3, n2];
          }

          indices.push(indexOffset + n1 - 1, indexOffset + n2 - 1, indexOffset + n3 - 1);
        }

        // Calculate normals
        for (let i = 1; i <= nbNodes; i++) {
          const normal = tri.Normal(i);
          const transformedNormal = normal.Transformed(transformation);
          let nx = transformedNormal.X();
          let ny = transformedNormal.Y();
          let nz = transformedNormal.Z();
          if (orientation === oc.TopAbs_Orientation.TopAbs_REVERSED) {
            nx = -nx;
            ny = -ny;
            nz = -nz;
          }
          normals.push(nx, ny, nz);
        }

        indexOffset += nbNodes;
      }

      explorer.Next();
    }

    return { vertices, indices, normals };
  }

  // Create a closed wire from 3D points
  createWireFromPoints(points: [number, number, number][], closed = true) {
    if (!this.oc) throw new Error('OpenCascade not initialized');
    const oc = this.oc;

    const wireBuilder = new oc.BRepBuilderAPI_MakeWire_1();

    const allPoints = closed ? [...points, points[0]] : points;

    for (let i = 0; i < allPoints.length - 1; i++) {
      const p1 = new oc.gp_Pnt_3(allPoints[i][0], allPoints[i][1], allPoints[i][2]);
      const p2 = new oc.gp_Pnt_3(allPoints[i + 1][0], allPoints[i + 1][1], allPoints[i + 1][2]);
      const edge = new oc.BRepBuilderAPI_MakeEdge_3(p1, p2);
      wireBuilder.Add_1(edge.Edge());
    }

    return wireBuilder.Wire();
  }

  // Create a loft through multiple wire profiles
  createLoft(wires: any[], solid = true, ruled = false) {
    if (!this.oc) throw new Error('OpenCascade not initialized');
    const oc = this.oc;

    const loftBuilder = new oc.BRepOffsetAPI_ThruSections(solid, ruled, 1.0e-6);

    for (const wire of wires) {
      loftBuilder.AddWire(wire);
    }

    loftBuilder.CheckCompatibility(false);
    return loftBuilder.Shape();
  }

  // Extract B-Rep edges as polylines for wireframe display
  getEdges(shape: any, deflection = 0.1): number[][] {
    if (!this.oc) throw new Error('OpenCascade not initialized');
    const oc = this.oc;

    // Ensure the shape is tessellated
    new oc.BRepMesh_IncrementalMesh_2(shape, deflection, false, 0.5, false);

    const edges: number[][] = [];
    const explorer = new oc.TopExp_Explorer_2(
      shape,
      oc.TopAbs_ShapeEnum.TopAbs_EDGE,
      oc.TopAbs_ShapeEnum.TopAbs_SHAPE
    );

    while (explorer.More()) {
      const edge = oc.TopoDS.Edge_1(explorer.Current());
      const location = new oc.TopLoc_Location_1();
      const poly = oc.BRep_Tool.Polygon3D(edge, location);

      if (!poly.IsNull()) {
        const polyData = poly.get();
        const nbNodes = polyData.NbNodes();
        const transformation = location.Transformation();
        const edgePoints: number[] = [];

        for (let i = 1; i <= nbNodes; i++) {
          const node = polyData.Nodes().Value(i);
          const transformed = node.Transformed(transformation);
          edgePoints.push(transformed.X(), transformed.Y(), transformed.Z());
        }
        edges.push(edgePoints);
      } else {
        // Fallback: sample the curve adapter
        try {
          const adaptor = new oc.BRepAdaptor_Curve_2(edge);
          const first = adaptor.FirstParameter();
          const last = adaptor.LastParameter();
          const nbSamples = 20;
          const edgePoints: number[] = [];

          for (let i = 0; i <= nbSamples; i++) {
            const t = first + (i / nbSamples) * (last - first);
            const pt = adaptor.Value(t);
            edgePoints.push(pt.X(), pt.Y(), pt.Z());
          }
          edges.push(edgePoints);
        } catch {
          // Skip edges we can't sample
        }
      }

      explorer.Next();
    }

    return edges;
  }

  // Create a wire from cubic Bézier segments (closed curve)
  // controlPoints: array of [x,y,z] anchor points, each pair connected by a cubic Bézier
  // The Bézier handles are auto-generated for smooth continuity
  createBezierWire(anchorPoints: [number, number, number][], y: number) {
    if (!this.oc) throw new Error('OpenCascade not initialized');
    const oc = this.oc;

    const n = anchorPoints.length;
    if (n < 3) throw new Error('Need at least 3 anchor points for a closed Bézier profile');

    const wireBuilder = new oc.BRepBuilderAPI_MakeWire_1();

    // Sample each Bézier segment into line edges (OCC Bézier edges are complex, line approximation works well)
    const samplesPerSegment = 12;

    for (let i = 0; i < n; i++) {
      const p0 = anchorPoints[i];
      const p3 = anchorPoints[(i + 1) % n];

      // Auto-generate smooth handles
      const prev = anchorPoints[(i - 1 + n) % n];
      const next = anchorPoints[(i + 2) % n];

      // Tangent at p0: direction from prev to p3
      const t0x = (p3[0] - prev[0]) * 0.25;
      const t0z = (p3[2] - prev[2]) * 0.25;
      // Tangent at p3: direction from p0 to next
      const t3x = (next[0] - p0[0]) * 0.25;
      const t3z = (next[2] - p0[2]) * 0.25;

      const cp1: [number, number, number] = [p0[0] + t0x, y, p0[2] + t0z];
      const cp2: [number, number, number] = [p3[0] - t3x, y, p3[2] - t3z];

      // Sample the cubic Bézier
      const segmentPoints: [number, number, number][] = [];
      for (let s = 0; s <= samplesPerSegment; s++) {
        const t = s / samplesPerSegment;
        const mt = 1 - t;
        const x = mt * mt * mt * p0[0] + 3 * mt * mt * t * cp1[0] + 3 * mt * t * t * cp2[0] + t * t * t * p3[0];
        const z = mt * mt * mt * p0[2] + 3 * mt * mt * t * cp1[2] + 3 * mt * t * t * cp2[2] + t * t * t * p3[2];
        segmentPoints.push([x, y, z]);
      }

      // Add edges for this segment
      for (let s = 0; s < segmentPoints.length - 1; s++) {
        const a = segmentPoints[s];
        const b = segmentPoints[s + 1];
        const gp1 = new oc.gp_Pnt_3(a[0], a[1], a[2]);
        const gp2 = new oc.gp_Pnt_3(b[0], b[1], b[2]);
        const edge = new oc.BRepBuilderAPI_MakeEdge_3(gp1, gp2);
        wireBuilder.Add_1(edge.Edge());
      }
    }

    return wireBuilder.Wire();
  }

  // Generate a circular profile as points on a plane
  static circleProfile(radius: number, y: number, segments = 24): [number, number, number][] {
    const points: [number, number, number][] = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
    }
    return points;
  }

  // Generate a square profile as points on a plane
  static squareProfile(size: number, y: number): [number, number, number][] {
    const h = size / 2;
    return [
      [-h, y, -h], [h, y, -h], [h, y, h], [-h, y, h],
    ];
  }

  // Generate a star profile
  static starProfile(outerR: number, innerR: number, y: number, points = 5): [number, number, number][] {
    const result: [number, number, number][] = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      result.push([Math.cos(angle) * r, y, Math.sin(angle) * r]);
    }
    return result;
  }
}

export const openCascadeService = new OpenCascadeService();
