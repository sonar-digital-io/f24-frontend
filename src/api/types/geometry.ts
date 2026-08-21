import type { KeyValuePair } from './common';

export interface GeometryPayload {
  name: string;
  created_at: string;
  description?: string;
}

export interface GeometryCreateResponse {
  id: number;
}

export interface Geometry {
  id: number;
  name: string;
  user: string;
  description?: string;
  created_at: string;
  last_modified: string;
  valid: boolean;
}

export interface GeometrySettingsPayload {
  settings: KeyValuePair[];
}

export interface GeometryEdge {
  id: number;
  edge_type: string;
  curve_type: string;
  ymin: number;
  ymax: number;
  curve: BezierControlPoint[];
}

export interface GeometryEdgesPayload {
  edges: GeometryEdge[];
}

/** PUT /geometry/:id/edges/ — write payload; no id, unlike the GET shape. */
export interface GeometryEdgeInput {
  edge_type: string;
  curve_type: string;
  ymin: number;
  ymax: number;
  curve: BezierControlPoint[];
}

export interface GeometryEdgesWritePayload {
  edges: GeometryEdgeInput[];
}

export interface GeometryProfileParameter {
  reference: string;
  value: number | string;
}

export interface GeometryProfile {
  id: number;
  name: string;
  position: number;
  type: string;
  file: string | null;
  parameters: GeometryProfileParameter[];
}

export interface GeometryProfilesPayload {
  profiles: GeometryProfile[];
}

/** PUT /geometry/:id/profiles/ — write payload; no id/file, unlike the GET shape. */
export interface GeometryProfileInput {
  name: string;
  position: number;
  type: string;
  parameters: GeometryProfileParameter[];
}

export interface GeometryProfilesWritePayload {
  profiles: GeometryProfileInput[];
}

/** GET /geometry/:id/ — the list shape plus whatever nested sub-resources the
 * backend includes inline (settings/profiles confirmed; edges/spars not typed
 * here yet — their edge_type/spar shape conventions aren't established). */
export interface GeometryDetail extends Geometry {
  settings?: KeyValuePair[];
  profiles?: GeometryProfile[];
  profile_generator_parameters?: ProfileGeneratorParameters;
  edges?: GeometryEdge[];
}

export interface GeometryProfilePreviewPayload {
  type: string;
  position: number;
  parameters: GeometryProfileParameter[];
}

export interface GeometryProfileQuery {
  resolution?: number;
  standard?: boolean;
}

/**
 * A single spar running between two profiles, each end carrying an
 * upper/lower chordwise position (0 = leading edge, 1 = trailing edge).
 * Field names are a best guess — the backend's exact spar shape isn't
 * documented (see GeometrySparsPayload); adjust here if it turns out
 * different, the rest of the app only depends on this interface.
 */
export interface GeometrySpar {
  id?: number;
  start_profile: number;
  start_upper_position: number;
  start_lower_position: number;
  end_profile: number;
  end_upper_position: number;
  end_lower_position: number;
}

export interface GeometrySparsPayload {
  twist: boolean;
  parallel: boolean;
  spars: GeometrySpar[];
}

export interface GeometryTopView {
  leading_edge: number[][];
  trailing_edge: number[][];
  /** The root and tip cross-sections' vertical boundary lines, each [leadingEdgePoint, trailingEdgePoint]. */
  profiles: [number, number][][];
  nominal_radius: number;
}

export interface BezierControlPoint {
  x: number;
  y: number;
}

export interface ProfileGeneratorCurveParameter {
  reference: string;
  curve_type: string;
  control_points: BezierControlPoint[];
}

export interface ProfileGeneratorParameters {
  type: string;
  start_position: number;
  end_position: number;
  profile_count: number;
  name: string;
  parameters: ProfileGeneratorCurveParameter[];
}

export interface ProfileGeneratorPayload {
  profile_generator_parameters: ProfileGeneratorParameters;
}

export interface GeneratedProfile {
  name: string;
  position: number;
  type: string;
  parameters: GeometryProfileParameter[];
}

export interface ProfileGeneratorResponse {
  profiles: GeneratedProfile[];
}
