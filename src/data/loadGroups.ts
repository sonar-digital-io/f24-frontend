import { slugify, uniqueId } from '@/lib/utils';

export interface LoadGroup {
  id: string;
  name: string;
  description: string;
  lastUpdated: string;
}

export const LOAD_GROUPS: LoadGroup[] = [
  {
    id: 'dlc-11-fatigue',
    name: 'DLC-1.1-FATIGUE',
    description:
      'Normal power production — full lifetime fatigue damage accumulation. Wöhler SN curves, Miner-Palmgren damage.',
    lastUpdated: '2026-04-18',
  },
  {
    id: 'dlc-13-extreme',
    name: 'DLC-1.3-EXTREME',
    description:
      'Extreme turbulence model during power production. Return period 50 years, IEC class I-A.',
    lastUpdated: '2026-04-02',
  },
  {
    id: 'dlc-21-loss-grid',
    name: 'DLC-2.1-LOSS-GRID',
    description:
      'Grid loss transient during normal power production. Emergency stop followed by idling.',
    lastUpdated: '2026-03-30',
  },
  {
    id: 'dlc-61-parked-50y',
    name: 'DLC-6.1-PARKED-50Y',
    description:
      'Parked turbine in 50-year extreme wind. Stand-still with pitch at feather, rotor locked.',
    lastUpdated: '2026-03-17',
  },
  {
    id: 'dlc-7i-idling-err',
    name: 'DLC-7I-IDLING-ERR',
    description:
      'Idling with one pitch actuator failure. Aerodynamic imbalance during loss-of-grid scenario.',
    lastUpdated: '2026-03-03',
  },
  {
    id: 'modal-analysis-gr',
    name: 'MODAL-ANALYSIS-GR',
    description:
      'Gravitational and centrifugal load group for Campbell diagram modal analysis. RPM sweep 0–20.',
    lastUpdated: '2026-02-19',
  },
  {
    id: 'offshore-wave-c',
    name: 'OFFSHORE-WAVE-C',
    description:
      'Combined wind-wave offshore load set. Misalignment angle ±30°, Hs=8m, Tp=14s.',
    lastUpdated: '2026-02-08',
  },
  {
    id: 'rated-speed-oper',
    name: 'RATED-SPEED-OPER',
    description:
      'Rated wind speed operational cases. Pitch angle schedule validation, power curve verification.',
    lastUpdated: '2026-02-08',
  },
  {
    id: 'static-proof-load',
    name: 'STATIC-PROOF-LOAD',
    description:
      'Static proof load case set for certification. 1.35 × ultimate design load at root and mid-span.',
    lastUpdated: '2026-02-01',
  },
  {
    id: 'tip-deflection-max',
    name: 'TIP-DEFLECTION-MAX',
    description:
      'Maximum tip deflection envelope from combined gust and power production. Tower clearance check.',
    lastUpdated: '2026-01-20',
  },
];

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createLoadGroup(input: { name: string; description: string }): LoadGroup {
  const id = uniqueId(slugify(input.name || 'load-group'), (c) =>
    LOAD_GROUPS.some((g) => g.id === c)
  );
  const lg: LoadGroup = {
    id,
    name: input.name.trim() || 'Untitled load group',
    description: input.description.trim(),
    lastUpdated: stamp(),
  };
  LOAD_GROUPS.unshift(lg);
  return lg;
}

export function updateLoadGroup(
  id: string,
  changes: Partial<Pick<LoadGroup, 'name' | 'description'>>
): void {
  const idx = LOAD_GROUPS.findIndex((g) => g.id === id);
  if (idx === -1) return;
  LOAD_GROUPS[idx] = { ...LOAD_GROUPS[idx], ...changes, lastUpdated: stamp() };
}
