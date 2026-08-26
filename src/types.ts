// Cross-cutting, nem-domain UI-állapot típusok. Domain entitás típusok (Material, Geometry,
// Composition stb.) változatlanul a data/*.ts fájlokban maradnak — nem itt.

// ─── Bezier editor ────────────────────────────────────────────────────────────

export interface ControlPoint {
  x: number; // data units
  y: number; // data units
}

// ─── Table sorting ────────────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string = string> {
  key: K;
  direction: SortDirection;
}

// ─── /calculation ─────────────────────────────────────────────────────────────

/** Sortable columns on the /calculation list page. */
export type CalculationSortKey = 'name' | 'lastUpdated';

// ─── CalculationNew (also imported by the CalculationXTab components) ────────

export type Tab = 'general' | 'composition' | 'configuration' | 'load-group' | 'fatigue-profile';
/** Sortable columns on the Composition tab's picker table. */
export type CalcCompositionSortKey = 'name' | 'last_modified';
/** Sortable columns on the Load group tab's picker table. */
export type CalcLoadGroupSortKey = 'name' | 'last_modified';

// ─── /composition ─────────────────────────────────────────────────────────────

/** Sortable columns on the /composition list page. */
export type CompositionSortKey = 'name' | 'lastUpdated';

// ─── /geometry ────────────────────────────────────────────────────────────────

/** Sortable columns on the /geometry list page. */
export type GeometrySortKey = 'name' | 'lastUpdated';

// ─── /layup ───────────────────────────────────────────────────────────────────

/** Sortable columns on the /layup list page. */
export type LayupSortKey = 'name' | 'lastUpdated';

// ─── /load-group ──────────────────────────────────────────────────────────────

/** Sortable columns on the /load-group list page. */
export type LoadGroupSortKey = 'name' | 'lastUpdated';

// ─── /material ────────────────────────────────────────────────────────────────

/** Sortable columns on the /material list page. */
export type MaterialSortKey = 'name' | 'type' | 'lastUpdated';

// ─── /nurbs ───────────────────────────────────────────────────────────────────

/** The NURBS surface presets `NurbsViewer` knows how to generate control points for. */
export type NurbsGeometryType = 'nurbs-wave' | 'nurbs-dome' | 'nurbs-saddle';

/** Every geometry the /nurbs page can switch to — the NURBS presets plus the loft mode
 *  (rendered by `LoftViewer` instead of `NurbsViewer`). */
export type GeometryType = NurbsGeometryType | 'loft';
