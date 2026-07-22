// Cross-cutting, nem-domain UI-állapot típusok. Domain entitás típusok (Material, Geometry,
// Composition stb.) változatlanul a data/*.ts fájlokban maradnak — nem itt.

// ─── Bezier editor ────────────────────────────────────────────────────────────

export interface ControlPoint {
  x: number; // data units
  y: number; // data units
}

// ─── 3D viewer ────────────────────────────────────────────────────────────────

export type RenderMode = 'solid' | 'wireframe';

// ─── List/grid toggle ─────────────────────────────────────────────────────────

export type ViewMode = 'list' | 'grid';

// ─── Table sorting ────────────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string = string> {
  key: K;
  direction: SortDirection;
}

// ─── /calculation ─────────────────────────────────────────────────────────────

/** Sortable columns on the /calculation list page. */
export type CalculationSortKey = 'timestamp' | 'name';

// ─── CalculationNew (also imported by the CalculationXTab components) ────────

export type Tab = 'general' | 'composition' | 'configuration' | 'load-group' | 'fatigue-profile';
export type CompositionSubTab = 'geometries' | 'compositions';
export type ConfigSection = 'aero' | 'debug' | 'modal' | 'structural' | 'postprocessing';
export type CompListSortKey = 'name' | 'lastUpdated' | 'nominalRadius';
export interface CompListSort { key: CompListSortKey; dir: 'asc' | 'desc' }
export type LGSortKey = 'name' | 'lastUpdated' | 'createdBy';
export interface LGSort { key: LGSortKey; dir: 'asc' | 'desc' }

// ─── /composition ─────────────────────────────────────────────────────────────

/** Sortable columns on the /composition list page. */
export type CompositionSortKey = 'name' | 'lastUpdated' | 'nominalRadius';

// ─── /geometry ────────────────────────────────────────────────────────────────

/** Sortable columns on the /geometry list page. */
export type GeometrySortKey = 'name' | 'nominalRadius' | 'lastUpdated';

// ─── /layup ───────────────────────────────────────────────────────────────────

/** Sortable columns on the /layup list page. */
export type LayupSortKey = 'name' | 'lastUpdated';

// ─── /load-group ──────────────────────────────────────────────────────────────

/** Sortable columns on the /load-group list page. */
export type LoadGroupSortKey = 'name' | 'lastUpdated';

// ─── /material ────────────────────────────────────────────────────────────────

/** Sortable columns on the /material list page. */
export type MaterialSortKey = 'name' | 'type' | 'source' | 'lastUpdated';

// ─── /nurbs ───────────────────────────────────────────────────────────────────

/** The NURBS surface presets `NurbsViewer` knows how to generate control points for. */
export type NurbsGeometryType = 'nurbs-wave' | 'nurbs-dome' | 'nurbs-saddle';

/** Every geometry the /nurbs page can switch to — the NURBS presets plus the loft mode
 *  (rendered by `LoftViewer` instead of `NurbsViewer`). */
export type GeometryType = NurbsGeometryType | 'loft';
