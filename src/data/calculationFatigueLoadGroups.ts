// ─── Mock fatigue load groups + nested load cases for the Calculation
//     "Load group" and "Fatigue profile" tabs (CalculationNew page). ───────────

export interface FatigueLoadGroup {
  id: string;
  name: string;
  description: string;
  lastUpdated: string;
  createdBy: string;
  profiles: string[];
}

export const FATIGUE_LOAD_GROUPS: FatigueLoadGroup[] = [
  {
    id: 'op-cycle-normal-01',
    name: 'OP-CYCLE-NORMAL-01',
    description:
      'Standard operational duty cycle including transient events. Combines start-up, power production with gust response, and normal shutdown sequences for comprehensive fatigue damage accumulation analysis.',
    lastUpdated: '2026-04-22',
    createdBy: 'J. Szántó',
    profiles: [
      'Power production',
      'Start-up and shutdown',
      'Extreme turbulence',
      'Standby extreme wind',
      'Low-wind operation',
      'High-turbulence burst',
      'Yaw-misaligned prod',
      'Extreme gust sequence',
      'Grid-loss coast-down',
      'Test run',
    ],
  },
  {
    id: 'dlc-13-extreme',
    name: 'DLC-1.3-EXTREME',
    description:
      'Extreme Turbulence Model (ETM). Ultimate limit state (ULS) check for gust-induced loads.',
    lastUpdated: '2026-04-02',
    createdBy: 'M. Kovács',
    profiles: ['Extreme turbulence', 'Power production'],
  },
  {
    id: 'dlc-21-loss-grid',
    name: 'DLC-2.1-LOSS-GRID',
    description:
      'Loss of electrical grid during operation. Simulates sudden pitch maneuvers and transient loads.',
    lastUpdated: '2026-03-30',
    createdBy: 'A. Tóth',
    profiles: ['Grid-loss coast-down', 'Emergency shutdown'],
  },
  {
    id: 'dlc-61-parked-50y',
    name: 'DLC-6.1-PARKED-50Y',
    description:
      'Parked/Standby state with 50-year return period extreme wind speed. Focus on structural survival.',
    lastUpdated: '2026-03-17',
    createdBy: 'J. Szántó',
    profiles: ['Standby extreme wind', 'Parked — 50y wind'],
  },
  {
    id: 'dlc-7i-idling-err',
    name: 'DLC-7I-IDLING-ERR',
    description:
      'Idling state with pitch system error. Analyzes unbalanced aerodynamic loads on the blade.',
    lastUpdated: '2026-03-03',
    createdBy: 'M. Kovács',
    profiles: ['Idling — pitch error', 'Resonance check'],
  },
  {
    id: 'modal-analysis-gr',
    name: 'MODAL-ANALYSIS-GR',
    description:
      'Zero-load group for frequency extraction. Determines eigenfrequencies and mode shapes.',
    lastUpdated: '2026-02-19',
    createdBy: 'A. Tóth',
    profiles: ['Modal sweep — 0 RPM', 'Modal sweep — rated'],
  },
  {
    id: 'offshore-wave-c',
    name: 'OFFSHORE-WAVE-C',
    description:
      'Coupled wind and wave loading group. Focus on base excitation and aerodynamic damping.',
    lastUpdated: '2026-02-08',
    createdBy: 'J. Szántó',
    profiles: ['Wave — aligned', 'Wave — misaligned 30°'],
  },
  {
    id: 'rated-speed-oper',
    name: 'RATED-SPEED-OPER',
    description:
      'Operation at rated wind speed with maximum thrust. Steady-state structural deflection check.',
    lastUpdated: '2026-02-08',
    createdBy: 'M. Kovács',
    profiles: ['Rated — full load', 'Rated — derating'],
  },
  {
    id: 'static-proof-load',
    name: 'STATIC-PROOF-LOAD',
    description:
      'Full-scale static test simulation. Equivalent to extreme flapwise and edgewise bending tests.',
    lastUpdated: '2026-02-01',
    createdBy: 'A. Tóth',
    profiles: ['Flapwise ULS', 'Edgewise ULS'],
  },
  {
    id: 'tip-deflection-max',
    name: 'TIP-DEFLECTION-MAX',
    description:
      'Worst-case operational scenario for tower clearance check. Focus on maximum out-of-plane tip displacement.',
    lastUpdated: '2026-01-20',
    createdBy: 'J. Szántó',
    profiles: ['Max deflection — gust', 'Max deflection — rated'],
  },
];

export const FATIGUE_PAGE_SIZE = 10;

// ─── Fatigue profile nested load-case data ───────────────────────────────────

export interface FatigueLoadCaseDetail {
  pitchFlag: string; rpmFlag: string; disa: number | string; targetType: string;
  pitchMin: number | string; rpmMin: number | string; inflowVelocity: number | string; targetValue: number | string;
  pitchMax: number | string; rpmMax: number | string; inflowAngle: number | string; altitude: number | string;
}

export interface FatigueLoadCase {
  id: string; name: string; loadCase: string;
  minScale: number | string; maxScale: number | string; time: number | string; cycles: number | string;
  detail: FatigueLoadCaseDetail;
}

export const FATIGUE_LOAD_CASES: Record<string, FatigueLoadCase[]> = {
  'op-cycle-normal-01::Power production': [
    { id: 'pp-startup', name: 'Start up', loadCase: 'Start-up', minScale: 0, maxScale: 40, time: 60, cycles: '—', detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 0, targetType: 'Thrust', pitchMin: 15, rpmMin: 2, inflowVelocity: 4, targetValue: 50, pitchMax: '—', rpmMax: '—', inflowAngle: 0, altitude: 120 } },
    { id: 'pp-steady', name: 'Steady state', loadCase: 'Normal power production', minScale: 40, maxScale: 85, time: 600, cycles: '—', detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 0, targetType: 'Thrust', pitchMin: 5, rpmMin: 5, inflowVelocity: 8, targetValue: 1200, pitchMax: '—', rpmMax: '—', inflowAngle: 0, altitude: 0 } },
    { id: 'pp-gust', name: 'Wind gust event', loadCase: 'Normal wind gust', minScale: 60, maxScale: 100, time: '—', cycles: 2, detail: { pitchFlag: 'Free', rpmFlag: 'Free', disa: 5, targetType: 'Power', pitchMin: '—', rpmMin: '—', inflowVelocity: 12, targetValue: 2000, pitchMax: 90, rpmMax: 15, inflowAngle: 2, altitude: 0 } },
    { id: 'pp-recovery', name: 'Recovery and steady state', loadCase: 'Normal power production', minScale: 40, maxScale: 85, time: 300, cycles: '—', detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 0, targetType: 'Thrust', pitchMin: 5, rpmMin: 5, inflowVelocity: 8, targetValue: 1200, pitchMax: '—', rpmMax: '—', inflowAngle: 0, altitude: 0 } },
    { id: 'pp-shutdown', name: 'Shutdown', loadCase: 'Normal shutdown', minScale: 0, maxScale: 85, time: 60, cycles: '—', detail: { pitchFlag: 'Free', rpmFlag: 'Free', disa: 0, targetType: 'Speed', pitchMin: 0, rpmMin: 0, inflowVelocity: 8, targetValue: 0, pitchMax: 90, rpmMax: 15, inflowAngle: 0, altitude: 0 } },
  ],
  'op-cycle-normal-01::Start-up and shutdown': [
    { id: 'susd-cold', name: 'Cold start', loadCase: 'Start-up', minScale: 0, maxScale: 30, time: 90, cycles: '—', detail: { pitchFlag: 'Free', rpmFlag: 'Free', disa: 0, targetType: 'Speed', pitchMin: 0, rpmMin: 0, inflowVelocity: 6, targetValue: 8, pitchMax: 90, rpmMax: 12, inflowAngle: 0, altitude: 0 } },
    { id: 'susd-normal-stop', name: 'Normal shutdown', loadCase: 'Normal shutdown', minScale: 0, maxScale: 85, time: 60, cycles: '—', detail: { pitchFlag: 'Free', rpmFlag: 'Free', disa: 0, targetType: 'Speed', pitchMin: 0, rpmMin: 0, inflowVelocity: 8, targetValue: 0, pitchMax: 90, rpmMax: 15, inflowAngle: 0, altitude: 0 } },
    { id: 'susd-restart', name: 'Restart after fault', loadCase: 'Emergency shutdown', minScale: 0, maxScale: 20, time: 45, cycles: '—', detail: { pitchFlag: 'Free', rpmFlag: 'Fix', disa: 2, targetType: 'Speed', pitchMin: 0, rpmMin: 0, inflowVelocity: 5, targetValue: 6, pitchMax: 90, rpmMax: 10, inflowAngle: 0, altitude: 0 } },
  ],
  'op-cycle-normal-01::Extreme turbulence': [
    { id: 'et-full', name: 'Full-load turbulence', loadCase: 'Extreme turbulence', minScale: 50, maxScale: 100, time: 600, cycles: '—', detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 10, targetType: 'Power', pitchMin: 3, rpmMin: 8, inflowVelocity: 14, targetValue: 2500, pitchMax: '—', rpmMax: '—', inflowAngle: 3, altitude: 0 } },
    { id: 'et-partial', name: 'Partial-load turbulence', loadCase: 'Extreme turbulence', minScale: 20, maxScale: 60, time: 300, cycles: '—', detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 8, targetType: 'Power', pitchMin: 5, rpmMin: 6, inflowVelocity: 10, targetValue: 1500, pitchMax: '—', rpmMax: '—', inflowAngle: 2, altitude: 0 } },
  ],
  'op-cycle-normal-01::Standby extreme wind': [
    { id: 'sew-idling', name: 'Idling — extreme wind', loadCase: 'Standby extreme wind', minScale: 0, maxScale: 10, time: '—', cycles: 1, detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 0, targetType: 'Torque', pitchMin: 85, rpmMin: 0, inflowVelocity: 25, targetValue: 0, pitchMax: 90, rpmMax: 1, inflowAngle: 0, altitude: 0 } },
  ],
  'op-cycle-normal-01::Grid-loss coast-down': [
    { id: 'glcd-main', name: 'Grid loss — rated speed', loadCase: 'Grid-loss coast-down', minScale: 85, maxScale: 100, time: 30, cycles: '—', detail: { pitchFlag: 'Free', rpmFlag: 'Free', disa: 0, targetType: 'Speed', pitchMin: '—', rpmMin: '—', inflowVelocity: 11, targetValue: 0, pitchMax: 90, rpmMax: 15, inflowAngle: 0, altitude: 0 } },
  ],
  'dlc-13-extreme::Extreme turbulence': [
    { id: 'dlc13-et-rated', name: 'ETM at rated wind', loadCase: 'Extreme turbulence', minScale: 80, maxScale: 100, time: 600, cycles: '—', detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 12, targetType: 'Power', pitchMin: 2, rpmMin: 9, inflowVelocity: 11, targetValue: 3000, pitchMax: '—', rpmMax: '—', inflowAngle: 3, altitude: 0 } },
  ],
  'dlc-13-extreme::Power production': [
    { id: 'dlc13-pp-steady', name: 'Rated power steady state', loadCase: 'Normal power production', minScale: 40, maxScale: 85, time: 600, cycles: '—', detail: { pitchFlag: 'Fix', rpmFlag: 'Fix', disa: 0, targetType: 'Power', pitchMin: 5, rpmMin: 9, inflowVelocity: 11, targetValue: 3000, pitchMax: '—', rpmMax: '—', inflowAngle: 0, altitude: 0 } },
  ],
  'dlc-21-loss-grid::Grid-loss coast-down': [
    { id: 'dlc21-gl-rated', name: 'Grid loss — rated', loadCase: 'Grid-loss coast-down', minScale: 80, maxScale: 100, time: 30, cycles: '—', detail: { pitchFlag: 'Free', rpmFlag: 'Free', disa: 0, targetType: 'Speed', pitchMin: '—', rpmMin: '—', inflowVelocity: 11, targetValue: 0, pitchMax: 90, rpmMax: 15, inflowAngle: 0, altitude: 0 } },
  ],
  'dlc-21-loss-grid::Emergency shutdown': [
    { id: 'dlc21-emsd', name: 'Emergency stop — grid fault', loadCase: 'Emergency shutdown', minScale: 0, maxScale: 100, time: 20, cycles: '—', detail: { pitchFlag: 'Free', rpmFlag: 'Free', disa: 0, targetType: 'Speed', pitchMin: 0, rpmMin: 0, inflowVelocity: 11, targetValue: 0, pitchMax: 90, rpmMax: 0, inflowAngle: 0, altitude: 0 } },
  ],
};
