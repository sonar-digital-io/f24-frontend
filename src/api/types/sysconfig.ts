export interface SysconfigUnit {
  id: string;
  symbol: string;
  name: string;
  group: string;
  base_unit: boolean;
  conversion_factor?: number;
  conversion_offset?: number;
}

export interface SysconfigParameterOption {
  id: string;
  name: string;
}

export interface SysconfigParameter {
  id: string;
  type: string;
  name: string;
  unit?: string;
  symbol?: string;
  description?: string;
  options?: SysconfigParameterOption[];
}

export interface SysconfigQuantity {
  id: string;
  name: string;
  unit_group: string;
}

/** One field's current state for this project, within a `project_settings` group or top-level. */
export interface SysconfigParamEntry {
  reference: string;
  fixed: boolean;
  value?: string;
  optional: boolean;
  active: boolean;
  minimum?: string;
  maximum?: string;
  /** Informational — the backend has already resolved these into `active`/`fixed`/`value` below. */
  dependencies?: string[];
}

export interface SysconfigParamGroup {
  id: string;
  name: string;
  parameters: SysconfigParamEntry[];
}

/** Same shape as `project_settings` — reused for any top-level config section
 *  (project_settings, mechanical_properties, fatigue_properties, …). */
export interface SysconfigProjectSettings {
  parameters: SysconfigParamEntry[];
  groups: SysconfigParamGroup[];
}

export interface SysconfigConfiguration {
  project_settings: SysconfigProjectSettings;
  mechanical_properties?: SysconfigProjectSettings;
  fatigue_properties?: SysconfigProjectSettings;
  /** engine_settings, etc. — other pages' sections, not modeled here. */
  [key: string]: unknown;
}

export interface SysconfigResponse {
  units: SysconfigUnit[];
  parameters: SysconfigParameter[];
  quantities: SysconfigQuantity[];
  configuration: SysconfigConfiguration;
}
