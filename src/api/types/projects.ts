import type { KeyValuePair } from './common';

export interface ProjectPayload {
  name: string;
  description?: string;
}

export interface ProjectCreateResponse {
  uuid: string;
}

export type ProjectState = 'RUNNING' | 'STOPPED' | (string & {});

export interface Project {
  uuid: string;
  name: string;
  description?: string;
  state: ProjectState;
  created_at: string;
  last_modified: string;
  user: string;
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

export interface ProjectStatePayload {
  state: ProjectState;
}

export interface ProjectLogQuery {
  from?: string;
  limit?: number;
}

export interface ProjectLogEntry {
  level: string;
  logger: string;
  message: string;
  module: string;
  function_name: string;
  line_number: number;
  created: number;
  process: number;
  thread: number;
}

export interface ProjectLogResponse {
  log: ProjectLogEntry[];
}
