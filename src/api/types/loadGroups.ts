export interface LoadGroupPayload {
  name: string;
  description?: string;
  created_at: string;
}

export interface LoadGroup {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  last_modified?: string;
  user?: string;
  rpm_thrust_limit?: LoadLimitRange;
  rpm_torque_limit?: LoadLimitRange;
  rpm_power_limit?: LoadLimitRange;
  [key: string]: unknown;
}

export interface LoadLimitCurvePoint {
  rpm: number;
  value: number;
}

export interface LoadLimitRange {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  curve: LoadLimitCurvePoint[];
}

export interface LoadGroupLimitsPayload {
  rpm_thrust_limit: LoadLimitRange;
  rpm_torque_limit: LoadLimitRange;
  rpm_power_limit: LoadLimitRange;
}

export type LoadCaseFlag = 'fix' | 'range';
export type LoadCaseTargetType = 'thrust' | 'torque' | 'power';

export interface LoadCase {
  /** Client-side identity key — sent on write, not part of the read shape. */
  __KEY__: string;
  /** Backend id — present once hydrated from GET, absent for a brand-new unsaved row. */
  id?: number;
  name: string;
  pitch_flag: LoadCaseFlag;
  pitch_min: number;
  /** Only meaningful (non-null) when pitch_flag is 'range'. */
  pitch_max: number | null;
  rpm_flag: LoadCaseFlag;
  rpm_min: number;
  /** Only meaningful (non-null) when rpm_flag is 'range'. */
  rpm_max: number | null;
  altitude: number;
  disa: number;
  inflow_velocity: number;
  inflow_angle: number;
  target_type: LoadCaseTargetType;
  target_value: number;
}

export interface LoadCasesPayload {
  load_cases: LoadCase[];
}

export interface FatigueCase {
  /** Client-side identity key. */
  __KEY__: string;
  /** Backend id — present once hydrated from GET, absent for a brand-new unsaved row. */
  id?: number;
  /** References a load case's backend id — null until one's been picked. */
  load_case: number | null;
  min_scale: number;
  max_scale: number;
  /** In hours. Mutually exclusive with cycles — only one may be set. */
  time: number | null;
  /** Mutually exclusive with time — only one may be set. */
  cycles: number | null;
  name: string;
}

export interface FatigueProfile {
  /** Client-side identity key. */
  __KEY__: string;
  /** Backend id — present once hydrated from GET, absent for a brand-new unsaved row. */
  id?: number;
  name: string;
  fatigue_cases: FatigueCase[];
}

/** PUT /load/:id/fatigue-profiles/ — sent as a raw array, not wrapped. */
export type FatigueProfilesPayload = FatigueProfile[];

/** Fatigue-case edit callbacks passed down through `LoadGroupFatigueProfilesTab` →
 *  `FatigueProfileAccordionItem` → `FatigueCaseTable` unchanged — shared here so
 *  each layer doesn't redeclare the same signatures. */
export interface FatigueCaseCallbacks {
  onAddFatigueCase: (profileKey: string) => void;
  onDeleteFatigueCase: (profileKey: string, caseKey: string) => void;
  onUpdateFatigueCase: <K extends keyof FatigueCase>(
    profileKey: string,
    caseKey: string,
    field: K,
    val: FatigueCase[K]
  ) => void;
  onPickLoadCase: (profileKey: string, caseKey: string) => void;
}
