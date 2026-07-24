import type { KeyValuePair } from './common';

export interface GeometryPayload {
  name: string;
  description?: string;
}

export interface Geometry {
  id: number;
  name: string;
  description?: string;
  [key: string]: unknown;
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
  curve: number[];
}

export interface GeometryEdgesPayload {
  edges: GeometryEdge[];
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

export interface GeometryProfilePreviewPayload {
  type: string;
  position: number;
  parameters: GeometryProfileParameter[];
}

export interface GeometryProfileQuery {
  resolution?: number;
  standard?: boolean;
}

export interface GeometrySparsPayload {
  twist: boolean;
  parallel: boolean;
  spars: unknown[];
}

export interface ProfileGeneratorParameters {
  start_position: number;
  end_position: number;
  profile_count: number;
}

export interface ProfileGeneratorPayload {
  profile_generator_parameters: ProfileGeneratorParameters;
}
