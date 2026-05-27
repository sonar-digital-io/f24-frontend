import { slugify, todayISO, uniqueId } from '@/lib/utils';

export interface Composition {
  id: string;
  name: string;
  description: string;
  lastUpdated: string;
}

export const COMPOSITIONS: Composition[] = [
  {
    id: 'c-spar-v01-opt',
    name: 'C-SPAR-V01-OPT',
    description:
      'Full carbon-spar configuration. Optimized for 75m+ offshore blades to minimize mass-induced loads.',
    lastUpdated: '2026-04-13',
  },
  {
    id: 'de-couple-test',
    name: 'DE-COUPLE-TEST',
    description:
      'Experimental composition using off-axis plies to evaluate passive aero-elastic bend-twist coupling.',
    lastUpdated: '2026-04-02',
  },
  {
    id: 'g-spar-baseline',
    name: 'G-SPAR-BASELINE',
    description:
      'All-glass structural configuration. Standard baseline for onshore turbines under 3MW.',
    lastUpdated: '2026-03-30',
  },
  {
    id: 'hybrid-ultra-80',
    name: 'HYBRID-ULTRA-80',
    description:
      'High-performance hybrid configuration (Carbon/Glass). Targeted for 80m tip-radius class blades.',
    lastUpdated: '2026-03-17',
  },
  {
    id: 'iea-15mw-ref-str',
    name: 'IEA-15MW-REF-STR',
    description:
      'Structural mapping for the IEA 15MW reference blade. Validated for multi-body simulation tests.',
    lastUpdated: '2026-03-03',
  },
  {
    id: 'light-tip-gen2',
    name: 'LIGHT-TIP-GEN2',
    description:
      'Mass-optimized composition for the outer 30% of the blade. Features thin-ply carbon technology.',
    lastUpdated: '2026-02-19',
  },
  {
    id: 'low-wind-iia-cf',
    name: 'LOW-WIND-IIA-CF',
    description:
      'Specialized composition for Class IIA low-wind sites. High aspect ratio with reinforced spar caps.',
    lastUpdated: '2026-02-08',
  },
  {
    id: 'nrel-5mw-std-map',
    name: 'NREL-5MW-STD-MAP',
    description:
      'Standard structural definition for the NREL 5MW legacy blade. Industry benchmarking baseline.',
    lastUpdated: '2026-02-08',
  },
  {
    id: 'root-flex-study',
    name: 'ROOT-FLEX-STUDY',
    description:
      'Special composition focusing on root-to-airfoil transition stiffness gradients for fatigue reduction.',
    lastUpdated: '2026-02-01',
  },
  {
    id: 'stiff-shore-100',
    name: 'STIFF-SHORE-100',
    description:
      'Ultra-stiff offshore configuration for 100m+ blades. Maximized flapwise and edge-wise stiffness.',
    lastUpdated: '2026-01-20',
  },
];

/** Create a composition, prepend it to the list, return it. Mock stand-in for a POST. */
export function createComposition(name: string, description = ''): Composition {
  const id = uniqueId(slugify(name), (candidate) => COMPOSITIONS.some((c) => c.id === candidate));
  const composition: Composition = {
    id,
    name: name.trim() || 'Untitled composition',
    description: description.trim(),
    lastUpdated: todayISO(),
  };
  COMPOSITIONS.unshift(composition);
  return composition;
}
