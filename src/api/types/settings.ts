import type { KeyValuePair } from './common';

/** GET/PUT /settings/21/ — a single fixed global settings record (not
 *  per-user, per-project, or otherwise scoped), same
 *  `{ parameters: [{ reference, value }] }` shape geometry settings use. */
export interface SettingsResponse {
  parameters: KeyValuePair[];
}

export interface SettingsPayload {
  parameters: KeyValuePair[];
}
