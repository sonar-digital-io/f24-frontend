import type { LoadLimitRange } from '@/api/types/loadGroups';

// ─── Types ──────────────────────────────────────────────────────────────────

export type LoadGroupTab = 'general' | 'load-cases' | 'limits' | 'fatigue-profiles';
export type LimitsSubTab = 'thrust' | 'torque' | 'power';

// ─── Initial mock data ───────────────────────────────────────────────────────

// thrust/torque/power all start from the same flat 2-point curve — a fresh
// object per key so no two sub-tabs' state accidentally alias the same array.
function defaultLimitRange(): LoadLimitRange {
  return {
    x_min: -20000,
    x_max: 20000,
    y_min: 0,
    y_max: 20000,
    curve_type: 'bezier',
    curve: [
      { rpm: 0, value: 10000 },
      { rpm: 10000, value: 10000 },
    ],
  };
}

export const INITIAL_LOAD_LIMITS: Record<LimitsSubTab, LoadLimitRange> = {
  thrust: defaultLimitRange(),
  torque: defaultLimitRange(),
  power: defaultLimitRange(),
};

export const LIMITS_UNITS: Record<LimitsSubTab, string> = {
  thrust: 'N',
  torque: 'Nm',
  power: 'kW',
};
