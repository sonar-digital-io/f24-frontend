import type { ControlPoint } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export type LoadGroupTab = 'general' | 'load-cases' | 'limits' | 'fatigue-profiles';
export type LimitsSubTab = 'thrust' | 'torque' | 'power';
export type PitchRpmFlag = 'Range' | 'Fixed';
export type TargetType = 'torque' | 'thrust' | 'power';

export interface LoadCase {
  id: string;
  name: string;
  pitchFlag: PitchRpmFlag;
  pitchMin: number;
  pitchMax: number;
  rpmFlag: PitchRpmFlag;
  rpmMin: number;
  rpmMax: number;
  altitude: number;
  disa: number;
  inflowVelocity: number;
  inflowAngle: number;
  targetType: TargetType;
  targetValue: number;
}

export interface FatigueCase {
  id: string;
  name: string;
  loadCase: string;
  minScale: number;
  maxScale: number;
  time: number | null;
  cycles: number | null;
}

export interface FatigueProfile {
  id: string;
  name: string;
  open: boolean;
  cases: FatigueCase[];
}

// ─── Initial mock data ───────────────────────────────────────────────────────

export function makeId() {
  return Math.random().toString(36).slice(2, 8);
}

export const EXISTING_LOAD_CASES: LoadCase[] = [
  {
    id: makeId(),
    name: 'Start up',
    pitchFlag: 'Range',
    pitchMin: 0,
    pitchMax: 15,
    rpmFlag: 'Range',
    rpmMin: 0,
    rpmMax: 7,
    altitude: 80,
    disa: 0,
    inflowVelocity: 8,
    inflowAngle: 0,
    targetType: 'power',
    targetValue: 1500,
  },
  {
    id: makeId(),
    name: 'Normal power production',
    pitchFlag: 'Range',
    pitchMin: 2,
    pitchMax: 20,
    rpmFlag: 'Range',
    rpmMin: 6,
    rpmMax: 12,
    altitude: 80,
    disa: 0,
    inflowVelocity: 12,
    inflowAngle: 3,
    targetType: 'power',
    targetValue: 8000,
  },
  {
    id: makeId(),
    name: 'Normal wind gust',
    pitchFlag: 'Range',
    pitchMin: 5,
    pitchMax: 45,
    rpmFlag: 'Range',
    rpmMin: 4,
    rpmMax: 13,
    altitude: 80,
    disa: 5,
    inflowVelocity: 18,
    inflowAngle: 8,
    targetType: 'thrust',
    targetValue: 950,
  },
  {
    id: makeId(),
    name: 'Normal shutdown',
    pitchFlag: 'Range',
    pitchMin: 20,
    pitchMax: 90,
    rpmFlag: 'Range',
    rpmMin: 0,
    rpmMax: 12,
    altitude: 80,
    disa: 0,
    inflowVelocity: 10,
    inflowAngle: 0,
    targetType: 'power',
    targetValue: 0,
  },
  {
    id: makeId(),
    name: 'Extreme turbulence',
    pitchFlag: 'Range',
    pitchMin: 5,
    pitchMax: 90,
    rpmFlag: 'Range',
    rpmMin: 2,
    rpmMax: 15,
    altitude: 80,
    disa: 15,
    inflowVelocity: 25,
    inflowAngle: 15,
    targetType: 'thrust',
    targetValue: 1200,
  },
];

export const PLACEHOLDER_LOAD_CASE: Omit<LoadCase, 'id'> = {
  name: '',
  pitchFlag: 'Range',
  pitchMin: 0,
  pitchMax: 25,
  rpmFlag: 'Range',
  rpmMin: 0,
  rpmMax: 15,
  altitude: 0,
  disa: 0,
  inflowVelocity: 10,
  inflowAngle: 0,
  targetType: 'power',
  targetValue: 0,
};

// ControlPoint x = RPM (0–20), y = value in physical units
export const INITIAL_LIMIT_POINTS: Record<LimitsSubTab, ControlPoint[]> = {
  thrust: [
    { x: 0, y: 1200 },
    { x: 8, y: 1100 },
    { x: 14, y: 900 },
    { x: 20, y: 700 },
  ],
  torque: [
    { x: 0, y: 4000 },
    { x: 8, y: 6800 },
    { x: 14, y: 5400 },
    { x: 20, y: 4000 },
  ],
  power: [
    { x: 0, y: 1500 },
    { x: 8, y: 6000 },
    { x: 14, y: 8000 },
    { x: 20, y: 8000 },
  ],
};

export const LIMITS_Y_MAX: Record<LimitsSubTab, number> = {
  thrust: 1500,
  torque: 10000,
  power: 10000,
};

export const LIMITS_Y_STEP: Record<LimitsSubTab, number> = {
  thrust: 300,
  torque: 2000,
  power: 2000,
};

export const LIMITS_UNITS: Record<LimitsSubTab, string> = {
  thrust: 'N',
  torque: 'Nm',
  power: 'kW',
};

export const EXISTING_FATIGUE_PROFILES: FatigueProfile[] = [
  {
    id: makeId(),
    name: 'Power production',
    open: true,
    cases: [
      {
        id: makeId(),
        name: 'Start up',
        loadCase: 'Start up',
        minScale: 0,
        maxScale: 40,
        time: 60,
        cycles: null,
      },
      {
        id: makeId(),
        name: 'Steady state',
        loadCase: 'Normal power production',
        minScale: 40,
        maxScale: 85,
        time: 600,
        cycles: null,
      },
      {
        id: makeId(),
        name: 'Wind gust event',
        loadCase: 'Normal wind gust',
        minScale: 60,
        maxScale: 100,
        time: null,
        cycles: 2,
      },
      {
        id: makeId(),
        name: 'Recovery and steady state',
        loadCase: 'Normal power production',
        minScale: 40,
        maxScale: 85,
        time: 300,
        cycles: null,
      },
      {
        id: makeId(),
        name: 'Shutdown',
        loadCase: 'Normal shutdown',
        minScale: 0,
        maxScale: 85,
        time: 60,
        cycles: null,
      },
    ],
  },
  {
    id: makeId(),
    name: 'Start-up and shutdown',
    open: false,
    cases: [
      {
        id: makeId(),
        name: 'Start up sequence',
        loadCase: 'Normal power production',
        minScale: 0,
        maxScale: 30,
        time: 90,
        cycles: null,
      },
    ],
  },
];

export const NEW_FATIGUE_PROFILES_PLACEHOLDER: FatigueProfile[] = [
  {
    id: makeId(),
    name: 'Fatigue profile',
    open: true,
    cases: [
      {
        id: makeId(),
        name: 'Placeholder',
        loadCase: '',
        minScale: 0,
        maxScale: 100,
        time: null,
        cycles: null,
      },
    ],
  },
];
