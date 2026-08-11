import type { LoadCase } from '@/api/types/loadGroups';

export type LoadCaseErrors = Partial<Record<keyof LoadCase, string>>;

const RPM_MAX_LIMIT = 2147483647;

function requiredNumber(val: number): string | undefined {
  return Number.isFinite(val) ? undefined : 'Required.';
}

export function validateLoadCase(lc: LoadCase): LoadCaseErrors {
  const errors: LoadCaseErrors = {};

  if (lc.pitch_flag === 'range') {
    if (!(lc.pitch_min >= -180)) errors.pitch_min = 'Must be ≥ -180°.';
    if (lc.pitch_max === null || !Number.isFinite(lc.pitch_max)) {
      errors.pitch_max = 'Required.';
    } else {
      if (!(lc.pitch_max <= 180)) errors.pitch_max = 'Must be ≤ 180°.';
      if (!(lc.pitch_min <= lc.pitch_max)) errors.pitch_min = 'Must be ≤ pitch max.';
    }
  } else {
    errors.pitch_min = requiredNumber(lc.pitch_min);
  }

  if (lc.rpm_flag === 'range') {
    if (!(lc.rpm_min >= 0)) errors.rpm_min = 'Must be ≥ 0.';
    if (lc.rpm_max === null || !Number.isFinite(lc.rpm_max)) {
      errors.rpm_max = 'Required.';
    } else {
      if (!(lc.rpm_max <= RPM_MAX_LIMIT)) errors.rpm_max = `Must be ≤ ${RPM_MAX_LIMIT}.`;
      if (!(lc.rpm_min <= lc.rpm_max)) errors.rpm_min = 'Must be ≤ rpm max.';
    }
  } else {
    errors.rpm_min = requiredNumber(lc.rpm_min);
  }

  errors.altitude = requiredNumber(lc.altitude);
  errors.disa = requiredNumber(lc.disa);
  errors.inflow_velocity = requiredNumber(lc.inflow_velocity);
  errors.inflow_angle = requiredNumber(lc.inflow_angle);
  errors.target_value = requiredNumber(lc.target_value);

  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v !== undefined)) as LoadCaseErrors;
}

export function loadCaseHasErrors(lc: LoadCase): boolean {
  return Object.keys(validateLoadCase(lc)).length > 0;
}
