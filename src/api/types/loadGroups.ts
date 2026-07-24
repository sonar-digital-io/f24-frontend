export interface LoadGroupPayload {
  name: string;
  description?: string;
}

export interface LoadGroup {
  id: number;
  name: string;
  description?: string;
  [key: string]: unknown;
}

export interface LoadLimitRange {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
}

export interface LoadGroupLimitsPayload {
  rpm_thrust_limit: LoadLimitRange;
  rpm_torque_limit: LoadLimitRange;
  rpm_power_limit: LoadLimitRange;
}

export interface LoadCase {
  id: number;
  name: string;
  pitch_flag: string;
  pitch_min: number;
  pitch_max: number;
  rpm_flag: string;
  rpm_min: number;
  rpm_max: number;
}

export interface LoadCasesPayload {
  load_cases: LoadCase[];
}
