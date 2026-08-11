export interface HistoryEntry {
  user: string;
  date: string;
  operation: string;
}

export interface SoftwareVersion {
  version: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role: string;
  level: number;
  company: string;
}

export interface UserSettings {
  parameters: import('./common').KeyValuePair[];
}

export interface UserRolePayload {
  role: string;
}

export interface UserLevelPayload {
  level: number;
}

export interface UserBlockPayload {
  is_active: boolean;
}
