import type { KeyValuePair } from './common';

export interface ProjectPayload {
  name: string;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}

export interface ProjectSettingsPayload {
  settings: KeyValuePair[];
}

export interface ProjectCompositionPayload {
  composition: number;
}

export interface ProjectGeometryPayload {
  geometry: number;
}

export interface ProjectLoadPayload {
  load_group: number;
}

export interface ProjectFatiguePayload {
  fatigue_profile: number;
}

export type ProjectState = 'RUNNING' | 'STOPPED';

export interface ProjectStatePayload {
  state: ProjectState;
}

export interface ProjectLogQuery {
  from?: string;
  limit?: number;
}
