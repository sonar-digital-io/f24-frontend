export interface Layup {
  id: string;
  name: string;
  description: string;
  lastUpdated: string;
}

export const LAYUPS: Layup[] = [
  {
    id: 'biax-skin-04',
    name: 'BIAX-SKIN-04',
    description:
      'Lightweight ±45° glass fiber skin for outboard regions. 4-ply sequence.',
    lastUpdated: '2026-04-17',
  },
  {
    id: 'biax-skin-08',
    name: 'BIAX-SKIN-08',
    description:
      'Reinforced ±45° glass fiber skin for mid-span torsion control. 8-ply sequence.',
    lastUpdated: '2026-04-16',
  },
  {
    id: 'hyb-trans-12',
    name: 'HYB-TRANS-12',
    description:
      'Hybrid transition zone layup. Interleaved carbon/glass plies for stress smoothing.',
    lastUpdated: '2026-03-31',
  },
  {
    id: 'le-rein-06',
    name: 'LE-REIN-06',
    description:
      'Leading edge reinforcement. Multi-directional layup for impact and erosion resistance.',
    lastUpdated: '2026-03-31',
  },
  {
    id: 'root-heavy-64',
    name: 'ROOT-HEAVY-64',
    description:
      'Extra thick root layup. Heavy-duty triaxial glass NCF for bolt-connection load transfer.',
    lastUpdated: '2026-03-16',
  },
  {
    id: 'spar-cap-c48',
    name: 'SPAR-CAP-C48',
    description:
      'Primary spar cap layup. 48 plies of high-modulus UD carbon for maximum flapwise stiffness.',
    lastUpdated: '2026-03-12',
  },
  {
    id: 'spar-cap-g40',
    name: 'SPAR-CAP-G40',
    description:
      'Secondary glass fiber spar cap for low-load testing or smaller blade variants.',
    lastUpdated: '2026-03-01',
  },
  {
    id: 'sw-biax-10',
    name: 'SW-BIAX-10',
    description:
      'Shear web layup. ±45° biaxial glass optimized for buckling stability and shear transfer.',
    lastUpdated: '2026-02-19',
  },
  {
    id: 'te-reinf-05',
    name: 'TE-REINF-05',
    description:
      'Trailing edge reinforcement strip. Designed to prevent edge splitting and buckling.',
    lastUpdated: '2026-02-18',
  },
  {
    id: 'triax-bond-04',
    name: 'TRIAX-BOND-04',
    description:
      'Triple-axial (0/±45) bonding layup for shell-to-web structural adhesive joints.',
    lastUpdated: '2026-02-10',
  },
];
