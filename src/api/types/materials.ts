import type { KeyValuePair } from './common';

export interface MaterialPayload {
  name: string;
  date: string;
  description?: string;
  mechanical_properties: KeyValuePair[];
  fatigue_properties: KeyValuePair[];
}

export interface MaterialCreateResponse {
  id: number;
}

export interface Material {
  id: number;
  user: string;
  last_modified: string;
  name: string;
  date: string;
  description?: string;
}

/** GET /material/:id/ — the list shape plus the per-material property arrays. */
export interface MaterialDetail extends Material {
  mechanical_properties?: KeyValuePair[];
  fatigue_properties?: KeyValuePair[];
}

/** PUT /material/:id/ — general-tab fields only (name/date/description). Type belongs
 * to the mechanical-properties endpoint, and the property arrays to their own endpoints. */
export interface MaterialGeneralPayload {
  name: string;
  date: string;
  description?: string;
}

export interface MaterialMechanicalPropertiesPayload {
  mechanical_properties: KeyValuePair[];
}

export interface MaterialFatiguePropertiesPayload {
  fatigue_properties: KeyValuePair[];
}
