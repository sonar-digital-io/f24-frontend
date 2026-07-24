import type { KeyValuePair } from './common';

export interface MaterialPayload {
  name: string;
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
  type: string;
}

export interface MaterialMechanicalPropertiesPayload {
  mechanical_properties: KeyValuePair[];
}

export interface MaterialFatiguePropertiesPayload {
  fatigue_properties: KeyValuePair[];
}
