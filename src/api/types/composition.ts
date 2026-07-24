import type { KeyValuePair } from './common';

export interface CompositionPayload {
  name: string;
  description?: string;
}

export interface Composition {
  id: number;
  name: string;
  description?: string;
  [key: string]: unknown;
}

export interface CompositionSettingsPayload {
  settings: KeyValuePair[];
}

export interface CompositionGeometryPayload {
  geometry: number;
}

export interface CompositionLayer {
  name: string;
  thickness: number;
  orientation: number;
  material: number;
}

export interface CompositionLayup {
  name: string;
  layers: CompositionLayer[];
}

export interface CompositionLayupPayload {
  layups: CompositionLayup[];
}

export interface CompositionCoreMaterialPayload {
  core_material: number;
}
