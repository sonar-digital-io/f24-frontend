import { slugify, todayISO, uniqueId } from '@/lib/utils';

export const BLADE_TYPES = [
  'Wind turbine blade',
  'Gas turbine blade',
  'Aero blade',
  'Hydraulic blade',
] as const;

export type BladeType = (typeof BLADE_TYPES)[number];

export interface Geometry {
  id: string;
  name: string;
  description: string;
  nominalRadius: number;
  type: BladeType;
  lastUpdated: string;
}

export const GEOMETRIES: Geometry[] = [
  {
    id: 'arc-ext-90-v1',
    name: 'ARC-EXT-90-V1',
    description: '90m extended tip geometry. Aero-elastic tailoring study for load shedding.',
    nominalRadius: 90,
    type: 'Wind turbine blade',
    lastUpdated: '2026-03-31',
  },
  {
    id: 'du-demo-25-hyb',
    name: 'DU-DEMO-25-HYB',
    description: '25m Hybrid technology demonstrator. Glass-carbon transition zone validation.',
    nominalRadius: 25,
    type: 'Aero blade',
    lastUpdated: '2026-03-09',
  },
  {
    id: 'iea-15mw-rwt',
    name: 'IEA-15MW-RWT',
    description: '117m Reference Wind Turbine blade. Industry standard for offshore structural validation.',
    nominalRadius: 117,
    type: 'Wind turbine blade',
    lastUpdated: '2026-03-09',
  },
  {
    id: 'l-curve-65-off',
    name: 'L-CURVE-65-OFF',
    description: '65m blade with 5.5 degree out-of-plane tip sweep for passive torque control.',
    nominalRadius: 65,
    type: 'Wind turbine blade',
    lastUpdated: '2026-02-20',
  },
  {
    id: 'nrel-5mw-baseline',
    name: 'NREL-5MW-Baseline',
    description: '61.5m legacy reference blade. Validated aerodynamic and structural baseline.',
    nominalRadius: 61.5,
    type: 'Wind turbine blade',
    lastUpdated: '2026-02-20',
  },
  {
    id: 'seri-8m-testbed',
    name: 'SERI-8m-Testbed',
    description: '8m research blade for wind tunnel testing. High-stiffness glass fiber layup.',
    nominalRadius: 8,
    type: 'Gas turbine blade',
    lastUpdated: '2026-02-20',
  },
  {
    id: 'smart-blade-40',
    name: 'SMART-BLADE-40',
    description: '40m prototype for active flap control. Features embedded sensor cavities and actuators.',
    nominalRadius: 40,
    type: 'Aero blade',
    lastUpdated: '2026-02-01',
  },
  {
    id: 'st-low-noise-55',
    name: 'ST-LOW-NOISE-55',
    description: '55m onshore blade. Optimized trailing edge serrations for acoustic signature reduction.',
    nominalRadius: 55,
    type: 'Wind turbine blade',
    lastUpdated: '2026-01-13',
  },
  {
    id: 'st-root-rein-v2',
    name: 'ST-ROOT-REIN-V2',
    description: '15m structural sub-component model. Focused on root-bolt connection fatigue testing.',
    nominalRadius: 15,
    type: 'Gas turbine blade',
    lastUpdated: '2026-01-13',
  },
  {
    id: 'wtb-75-st1-gen3',
    name: 'WTB-75-ST1-GEN3',
    description: '75m offshore blade. Optimized for carbon spar cap integration and high-lift DU airfoils.',
    nominalRadius: 75,
    type: 'Wind turbine blade',
    lastUpdated: '2025-12-10',
  },
];

/** Update an existing geometry in-place. Mock stand-in for a PATCH. */
export function updateGeometry(
  id: string,
  changes: Partial<Pick<Geometry, 'name' | 'description'>>
): void {
  const idx = GEOMETRIES.findIndex((g) => g.id === id);
  if (idx === -1) return;
  GEOMETRIES[idx] = { ...GEOMETRIES[idx], ...changes, lastUpdated: todayISO() };
}

export function createGeometry(
  name: string,
  description = '',
  type: BladeType = 'Wind turbine blade',
  nominalRadius = 0
): Geometry {
  const id = uniqueId(slugify(name), (candidate) => GEOMETRIES.some((g) => g.id === candidate));
  const geometry: Geometry = {
    id,
    name: name.trim() || 'Untitled geometry',
    description: description.trim(),
    nominalRadius,
    type,
    lastUpdated: todayISO(),
  };
  GEOMETRIES.unshift(geometry);
  return geometry;
}
