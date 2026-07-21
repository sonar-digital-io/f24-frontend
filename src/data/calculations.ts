import { slugify, uniqueId } from '@/lib/utils';

export type CalculationStatus = 'Finished' | 'Stopped';

export interface Calculation {
  id: string;
  name: string;
  description: string;
  timestamp: string;
  status: CalculationStatus;
}

export const CALCULATIONS: Calculation[] = [
  {
    id: 'bending-stiffness-dist',
    name: 'BENDING-STIFFNESS-DIST',
    description:
      'Sectional stiffness calculation (EIx, EIy, GJ) along the blade span for aero-elastic beam modeling.',
    timestamp: '2026-04-13 1:43 PM',
    status: 'Stopped',
  },
  {
    id: 'buckling-stability-v1',
    name: 'BUCKLING-STABILITY-V1',
    description:
      'Non-linear buckling analysis of the shear webs and shell panels under extreme edge-wise loads.',
    timestamp: '2026-04-02 1:43 PM',
    status: 'Stopped',
  },
  {
    id: 'fatigue-life-estimate',
    name: 'FATIGUE-LIFE-ESTIMATE',
    description:
      'Rainflow counting and Palmgren-Miner damage accumulation based on the 20-year operational profile.',
    timestamp: '2026-03-30 1:43 PM',
    status: 'Finished',
  },
  {
    id: 'flutter-boundary-chk',
    name: 'FLUTTER-BOUNDARY-CHK',
    description:
      'Aero-elastic stability check to identify critical wind speeds where self-excited vibrations occur.',
    timestamp: '2026-03-17 1:43 PM',
    status: 'Finished',
  },
  {
    id: 'modal-shape-analysis',
    name: 'MODAL-SHAPE-ANALYSIS',
    description:
      'Extraction of natural frequencies and mode shapes (Flap, Edge, Torsion) to avoid tower resonance.',
    timestamp: '2026-03-03 1:43 PM',
    status: 'Finished',
  },
  {
    id: 'reserve-factor-map',
    name: 'RESERVE-FACTOR-MAP',
    description:
      'Global safety factor calculation across all plies. Identification of the "First Ply Failure" locations.',
    timestamp: '2026-02-19 1:43 PM',
    status: 'Stopped',
  },
  {
    id: 'shear-flow-dist-01',
    name: 'SHEAR-FLOW-DIST-01',
    description:
      'Analysis of shear stress distribution in the adhesive joints and shear webs under torsional loading.',
    timestamp: '2026-02-08 1:43 PM',
    status: 'Stopped',
  },
  {
    id: 'static-deflection-max',
    name: 'STATIC-DEFLECTION-MAX',
    description:
      'Calculation of the maximum out-of-plane tip displacement to verify tower clearance safety.',
    timestamp: '2026-02-08 1:43 PM',
    status: 'Finished',
  },
  {
    id: 'tip-loss-aero-corr',
    name: 'TIP-LOSS-AERO-CORR',
    description:
      "Aerodynamic calculation with Prandtl's tip loss correction to refine the lift distribution at the tip.",
    timestamp: '2026-02-01 1:43 PM',
    status: 'Finished',
  },
  {
    id: 'weight-cog-moment',
    name: 'WEIGHT-COG-MOMENT',
    description:
      'Precise mass property calculation, including center of gravity (CoG) and mass moments of inertia.',
    timestamp: '2026-01-20 1:43 PM',
    status: 'Finished',
  },
];

function stamp(): string {
  // Local date + local time — mixing toISOString() (UTC) with getHours()
  // (local) would produce timestamps that never existed around midnight.
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const h = now.getHours() % 12 || 12;
  const m = String(now.getMinutes()).padStart(2, '0');
  const ampm = now.getHours() < 12 ? 'AM' : 'PM';
  return `${date} ${h}:${m} ${ampm}`;
}

/** Parse a 'YYYY-MM-DD h:mm AM/PM' timestamp into a comparable number for sorting. */
export function timestampValue(ts: string): number {
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) (AM|PM)$/);
  if (!m) return 0;
  let hours = Number(m[4]) % 12;
  if (m[6] === 'PM') hours += 12;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hours, Number(m[5]));
}

export function createCalculation(input: {
  name: string;
  description: string;
}): Calculation {
  const id = uniqueId(slugify(input.name || 'calculation'), (c) =>
    CALCULATIONS.some((g) => g.id === c)
  );
  const calc: Calculation = {
    id,
    name: input.name.trim() || 'Untitled calculation',
    description: input.description.trim(),
    timestamp: stamp(),
    status: 'Finished',
  };
  CALCULATIONS.unshift(calc);
  return calc;
}

export function updateCalculation(
  id: string,
  changes: Partial<Pick<Calculation, 'name' | 'description' | 'status'>>
): void {
  const idx = CALCULATIONS.findIndex((c) => c.id === id);
  if (idx === -1) return;
  CALCULATIONS[idx] = { ...CALCULATIONS[idx], ...changes, timestamp: stamp() };
}
