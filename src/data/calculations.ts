import { slugify, uniqueId } from '@/lib/utils';

function minutesAgo(n: number): string {
  const d = new Date(Date.now() - n * 60_000);
  const date = d.toISOString().slice(0, 10);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${date} ${h}:${m}`;
}

export type CalculationStatus = 'Draft' | 'Running' | 'Finished' | 'Failed' | 'Stopped';

export type AnalysisMethod =
  | 'Aero only'
  | 'Modal'
  | 'Modal (RPM)'
  | 'Modal (RPM & Aero)'
  | 'Static structural (RPM)'
  | 'Static structural (RPM & Aero)';

export interface CalculationDetails {
  createdAt: string;
  createdBy: string;
  composition: string;
  loadGroup: string;
  analysisMethod: AnalysisMethod;
}

export interface Calculation {
  id: string;
  name: string;
  description: string;
  timestamp: string;
  status: CalculationStatus;
  details: CalculationDetails;
}

export const CALCULATIONS: Calculation[] = [
  {
    id: 'aero-load-draft',
    name: 'AERO-LOAD-DRAFT',
    description: 'Draft setup for aerodynamic load distribution across the full blade span.',
    timestamp: '',
    status: 'Draft',
    details: {
      createdAt: '2026-06-20 10:12',
      createdBy: 'J. Szántó',
      composition: 'LIGHT-TIP-GEN2',
      loadGroup: 'DLC-1.1-FATIGUE',
      analysisMethod: 'Aero only',
    },
  },
  {
    id: 'torsion-freq-running',
    name: 'TORSION-FREQ-RUNNING',
    description: 'Torsional frequency sweep to detect flutter onset under rated and above-rated wind speeds.',
    timestamp: minutesAgo(23),
    status: 'Running',
    details: {
      createdAt: '2026-06-21 14:30',
      createdBy: 'M. Kovács',
      composition: 'HYBRID-ULTRA-80',
      loadGroup: 'MODAL-ANALYSIS-GR',
      analysisMethod: 'Modal (RPM & Aero)',
    },
  },
  {
    id: 'ply-stress-failed',
    name: 'PLY-STRESS-FAILED',
    description: 'Ply-level stress recovery failed due to missing load case boundary conditions.',
    timestamp: '2026-05-30 14:02',
    status: 'Failed',
    details: {
      createdAt: '2026-05-29 11:00',
      createdBy: 'J. Szántó',
      composition: 'C-SPAR-V01-OPT',
      loadGroup: 'STATIC-PROOF-LOAD',
      analysisMethod: 'Static structural (RPM & Aero)',
    },
  },
  {
    id: 'bending-stiffness-dist',
    name: 'BENDING-STIFFNESS-DIST',
    description:
      'Sectional stiffness calculation (EIx, EIy, GJ) along the blade span for aero-elastic beam modeling.',
    timestamp: '2026-04-13 13:43',
    status: 'Stopped',
    details: {
      createdAt: '2026-04-12 09:00',
      createdBy: 'A. Tóth',
      composition: 'IEA-15MW-REF-STR',
      loadGroup: 'RATED-SPEED-OPER',
      analysisMethod: 'Static structural (RPM)',
    },
  },
  {
    id: 'buckling-stability-v1',
    name: 'BUCKLING-STABILITY-V1',
    description:
      'Non-linear buckling analysis of the shear webs and shell panels under extreme edge-wise loads.',
    timestamp: '2026-04-02 13:43',
    status: 'Stopped',
    details: {
      createdAt: '2026-04-01 16:45',
      createdBy: 'M. Kovács',
      composition: 'G-SPAR-BASELINE',
      loadGroup: 'DLC-1.3-EXTREME',
      analysisMethod: 'Static structural (RPM & Aero)',
    },
  },
  {
    id: 'fatigue-life-estimate',
    name: 'FATIGUE-LIFE-ESTIMATE',
    description:
      'Rainflow counting and Palmgren-Miner damage accumulation based on the 20-year operational profile.',
    timestamp: '2026-03-30 13:43',
    status: 'Finished',
    details: {
      createdAt: '2026-03-28 08:30',
      createdBy: 'J. Szántó',
      composition: 'NREL-5MW-STD-MAP',
      loadGroup: 'DLC-1.1-FATIGUE',
      analysisMethod: 'Modal (RPM & Aero)',
    },
  },
  {
    id: 'flutter-boundary-chk',
    name: 'FLUTTER-BOUNDARY-CHK',
    description:
      'Aero-elastic stability check to identify critical wind speeds where self-excited vibrations occur.',
    timestamp: '2026-03-17 13:43',
    status: 'Finished',
    details: {
      createdAt: '2026-03-16 10:00',
      createdBy: 'A. Tóth',
      composition: 'HYBRID-ULTRA-80',
      loadGroup: 'DLC-7I-IDLING-ERR',
      analysisMethod: 'Aero only',
    },
  },
  {
    id: 'modal-shape-analysis',
    name: 'MODAL-SHAPE-ANALYSIS',
    description:
      'Extraction of natural frequencies and mode shapes (Flap, Edge, Torsion) to avoid tower resonance.',
    timestamp: '2026-03-03 13:43',
    status: 'Finished',
    details: {
      createdAt: '2026-03-02 14:15',
      createdBy: 'M. Kovács',
      composition: 'DE-COUPLE-TEST',
      loadGroup: 'MODAL-ANALYSIS-GR',
      analysisMethod: 'Modal (RPM)',
    },
  },
  {
    id: 'reserve-factor-map',
    name: 'RESERVE-FACTOR-MAP',
    description:
      'Global safety factor calculation across all plies. Identification of the "First Ply Failure" locations.',
    timestamp: '2026-02-19 13:43',
    status: 'Stopped',
    details: {
      createdAt: '2026-02-18 11:30',
      createdBy: 'J. Szántó',
      composition: 'C-SPAR-V01-OPT',
      loadGroup: 'STATIC-PROOF-LOAD',
      analysisMethod: 'Static structural (RPM & Aero)',
    },
  },
  {
    id: 'shear-flow-dist-01',
    name: 'SHEAR-FLOW-DIST-01',
    description:
      'Analysis of shear stress distribution in the adhesive joints and shear webs under torsional loading.',
    timestamp: '2026-02-08 13:43',
    status: 'Stopped',
    details: {
      createdAt: '2026-02-07 09:45',
      createdBy: 'A. Tóth',
      composition: 'LOW-WIND-IIA-CF',
      loadGroup: 'OFFSHORE-WAVE-C',
      analysisMethod: 'Static structural (RPM)',
    },
  },
  {
    id: 'static-deflection-max',
    name: 'STATIC-DEFLECTION-MAX',
    description:
      'Calculation of the maximum out-of-plane tip displacement to verify tower clearance safety.',
    timestamp: '2026-02-08 13:43',
    status: 'Finished',
    details: {
      createdAt: '2026-02-06 15:00',
      createdBy: 'M. Kovács',
      composition: 'STIFF-SHORE-100',
      loadGroup: 'TIP-DEFLECTION-MAX',
      analysisMethod: 'Static structural (RPM & Aero)',
    },
  },
  {
    id: 'tip-loss-aero-corr',
    name: 'TIP-LOSS-AERO-CORR',
    description:
      "Aerodynamic calculation with Prandtl's tip loss correction to refine the lift distribution at the tip.",
    timestamp: '2026-02-01 13:43',
    status: 'Finished',
    details: {
      createdAt: '2026-01-31 10:30',
      createdBy: 'J. Szántó',
      composition: 'LIGHT-TIP-GEN2',
      loadGroup: 'DLC-1.1-FATIGUE',
      analysisMethod: 'Aero only',
    },
  },
  {
    id: 'weight-cog-moment',
    name: 'WEIGHT-COG-MOMENT',
    description:
      'Precise mass property calculation, including center of gravity (CoG) and mass moments of inertia.',
    timestamp: '2026-01-20 13:43',
    status: 'Finished',
    details: {
      createdAt: '2026-01-19 08:00',
      createdBy: 'A. Tóth',
      composition: 'ROOT-FLEX-STUDY',
      loadGroup: 'RATED-SPEED-OPER',
      analysisMethod: 'Static structural (RPM)',
    },
  },
];

function stamp(): string {
  // Local date (toISOString would give the UTC date, i.e. yesterday around
  // midnight) + 24-hour local time, matching the seed data format.
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${date} ${h}:${m}`;
}

/** Parse a 'YYYY-MM-DD HH:MM' timestamp into a comparable number for sorting.
 *  Empty (e.g. a Draft that never ran) sorts oldest. */
export function timestampValue(ts: string): number {
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!m) return 0;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
}

export function createCalculation(input: {
  name: string;
  description: string;
}): Calculation {
  const id = uniqueId(slugify(input.name || 'calculation'), (c) =>
    CALCULATIONS.some((g) => g.id === c)
  );
  const now = stamp();
  const calc: Calculation = {
    id,
    name: input.name.trim() || 'Untitled calculation',
    description: input.description.trim(),
    timestamp: now,
    status: 'Finished',
    details: {
      createdAt: now,
      createdBy: 'J. Szántó',
      composition: '—',
      loadGroup: '—',
      analysisMethod: 'Aero only',
    },
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
