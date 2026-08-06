import type { LoadLimitRange } from '@/api/types/loadGroups';

// ─── Types ──────────────────────────────────────────────────────────────────

export type LoadGroupTab = 'general' | 'load-cases' | 'limits' | 'fatigue-profiles';
export type LimitsSubTab = 'thrust' | 'torque' | 'power';

// ─── Initial mock data ───────────────────────────────────────────────────────

export const INITIAL_LOAD_LIMITS: Record<LimitsSubTab, LoadLimitRange> = {
  thrust: {
    x_min: -100000,
    x_max: 100000,
    y_min: -100000,
    y_max: 100000,
    curve: [
      { rpm: 0, value: 10000 },
      { rpm: 10000, value: 10000 },
    ],
  },
  torque: {
    x_min: -100000,
    x_max: 100000,
    y_min: -100000,
    y_max: 100000,
    curve: [
      { rpm: 0, value: 10000 },
      { rpm: 10000, value: 10000 },
    ],
  },
  power: {
    x_min: -100000,
    x_max: 100000,
    y_min: -100000,
    y_max: 100000,
    curve: [
      { rpm: 0, value: 10000 },
      { rpm: 10000, value: 10000 },
    ],
  },
};

export const LIMITS_UNITS: Record<LimitsSubTab, string> = {
  thrust: 'N',
  torque: 'Nm',
  power: 'kW',
};
