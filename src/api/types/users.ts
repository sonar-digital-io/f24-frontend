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
