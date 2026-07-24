import type { KeyValuePair } from './common';

export interface MaterialPayload {
  name: string;
  description?: string;
  mechanical_properties: KeyValuePair[];
  fatigue_properties: KeyValuePair[];
}

export interface Material {
  id: number;
  name: string;
  description?: string;
  [key: string]: unknown;
}

export interface MaterialMechanicalPropertiesPayload {
  mechanical_properties: KeyValuePair[];
}

export interface MaterialFatiguePropertiesPayload {
  fatigue_properties: KeyValuePair[];
}
