import type { KeyValuePair } from './common';

export interface CompositionPayload {
  name: string;
  created_at: string;
  description: string;
}

export interface Composition {
  id: number;
  name: string;
  description?: string;
  last_modified?: string;
  settings?: KeyValuePair[];
  geometry?: number | null;
  /** Inline on the composition detail response — no separate GET endpoint for this. */
  layups?: CompositionLayupDetail[];
  longitudinal_mapping?: CompositionLongitudinalMapping;
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

/** Read shape — the backend assigns an id once a layer/layup is saved; the
 *  write payloads above never need to send one. */
export interface CompositionLayerDetail extends CompositionLayer {
  id: number;
}

export interface CompositionLayupDetail extends Omit<CompositionLayup, 'layers'> {
  id: number;
  layers: CompositionLayerDetail[];
}

/** Response of PUT /composition/:id/layup/ — returns each saved layup with
 *  its (possibly newly-assigned) backend id, the same shape as the
 *  composition detail's own `layups` field. */
export interface CompositionLayupSaveResponse {
  layups: CompositionLayupDetail[];
}

export interface CompositionCoreMaterialPayload {
  core_material: number;
}

export interface LongitudinalMappingPoint {
  longitudinal_position: number;
  transversal_position: number;
}

/** PUT /composition/:id/mapping/longitudinal/ entry shape — no id, whether
 *  creating a new row or updating an existing one. */
export interface LongitudinalMappingEntry {
  name: string;
  layup: number;
  mappings: LongitudinalMappingPoint[];
}

/** Read shape — the composition detail response includes each row's backend id. */
export interface LongitudinalMappingEntryDetail extends LongitudinalMappingEntry {
  id: number;
}

export interface CompositionLongitudinalMapping {
  upper_side: LongitudinalMappingEntryDetail[];
  lower_side: LongitudinalMappingEntryDetail[];
}

/** PUT /composition/:id/mapping/longitudinal/ — sent flat (unlike the
 *  composition detail response, which nests this under `longitudinal_mapping`),
 *  and its entries never carry an id, whether creating or updating a row. */
export interface CompositionMappingLongitudinalPayload {
  upper_side: LongitudinalMappingEntry[];
  lower_side: LongitudinalMappingEntry[];
}

export interface TransversalMappingEntry {
  id: number | null;
  name: string;
  /** Perimeter fraction along the profile's cross-section outline, 0..1. */
  start_position: number;
  start_locked_to: number;
  end_position: number;
  end_locked_to: number;
  layup: number;
  group_id: string;
  read_only: boolean;
}

export interface TransversalMappingProfile {
  profile_name: string;
  profile_id: number;
  mappings: TransversalMappingEntry[];
}

export interface CompositionMappingTransversalResponse {
  transversal_mapping: TransversalMappingProfile[];
}

export interface CompositionIntersection {
  id: number;
  position: number;
  type: 'edge' | 'mapping';
  spar_id: number | null;
  longitudinal_mapping_id: number | null;
  longitudinal_mapping_name: string | null;
  index: number | null;
  side: 'upper' | 'lower' | null;
}

export interface CompositionProfileIntersections {
  profile_id: number;
  intersections: CompositionIntersection[];
}
