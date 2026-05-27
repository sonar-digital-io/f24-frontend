import { slugify, uniqueId } from '@/lib/utils';

export interface MaterialDetails {
  reinforcement: string;
  matrix: string;
  modulusTensile: string;
  density: string;
  tdsRef: string;
}

export interface Material {
  id: string;
  name: string;
  type: string;
  description: string;
  lastUpdated: string;
  details: MaterialDetails;
}

export const MATERIALS: Material[] = [
  {
    id: 'envalior-tepex-101',
    name: 'Envalior Tepex dynalite 101',
    type: 'Consolidated Ply',
    description: 'Continuous glass fiber reinforced PA6 matrix. High impact resistance; Vf =~ 47%',
    lastUpdated: 'v2026/01',
    details: {
      reinforcement: 'Continuous E-Glass',
      matrix: 'PA 6',
      modulusTensile: '26.0 GPa',
      density: '1.80 g/cm³',
      tdsRef: 'Issue 05.2024',
    },
  },
  {
    id: 'envalior-tepex-202',
    name: 'Envalior Tepex dynalite 202',
    type: 'Consolidated Ply',
    description:
      'Carbon fiber reinforced PA6 matrix. Optimized for high stiffness-to-weight ratio and thermoforming.',
    lastUpdated: 'v2026/01',
    details: {
      reinforcement: 'Continuous Carbon',
      matrix: 'PA 6',
      modulusTensile: '70.0 GPa',
      density: '1.50 g/cm³',
      tdsRef: 'Issue 06.2024',
    },
  },
  {
    id: 'torayca-t700s',
    name: 'Torayca T700S / Epoxy',
    type: 'UD Carbon Ply',
    description: 'High-strength UD prepreg; Vf =~ 60%. Standard spar cap reinforcement.',
    lastUpdated: 'v2025/12',
    details: {
      reinforcement: 'T700S Carbon',
      matrix: 'Epoxy',
      modulusTensile: '135.0 GPa',
      density: '1.55 g/cm³',
      tdsRef: 'Issue 11.2023',
    },
  },
  {
    id: 'eglass-1200',
    name: 'E-Glass 1200gsm',
    type: 'Biaxial Ply (±45°)',
    description: 'Non-crimp fabric (NCF); optimized for shear web and skin torsion stiffness.',
    lastUpdated: 'v2025/12',
    details: {
      reinforcement: 'E-Glass NCF',
      matrix: 'Epoxy',
      modulusTensile: '17.0 GPa',
      density: '1.95 g/cm³',
      tdsRef: 'Issue 09.2023',
    },
  },
  {
    id: 'st-carbon-hymod',
    name: 'ST-Carbon-Hymod-01',
    type: 'UD Ply',
    description: 'In-house characterized high-modulus UD. Post-cured at 80°C. Validated fatigue data.',
    lastUpdated: '2025-12-10',
    details: {
      reinforcement: 'HM Carbon',
      matrix: 'Epoxy',
      modulusTensile: '210.0 GPa',
      density: '1.60 g/cm³',
      tdsRef: 'Internal — Lab 04.2025',
    },
  },
  {
    id: 'airex-r8280',
    name: 'Airex R82.80',
    type: 'Core (PET Foam)',
    description: 'Closed-cell thermoplastic foam; 80 kg/m³ density. Shear-critical applications.',
    lastUpdated: 'v2025/11',
    details: {
      reinforcement: '—',
      matrix: 'PET Foam',
      modulusTensile: '0.085 GPa',
      density: '0.08 g/cm³',
      tdsRef: 'Issue 03.2024',
    },
  },
  {
    id: 'st-glass-csm-450',
    name: 'ST-Glass-CSM-450-EP',
    type: 'Random Mat Ply',
    description:
      'E-Glass chopped strand mat (450gsm) with epoxy matrix. Isotropic in-plane behavior for non-structural fill.',
    lastUpdated: '2025-11-19',
    details: {
      reinforcement: 'E-Glass CSM',
      matrix: 'Epoxy',
      modulusTensile: '8.0 GPa',
      density: '1.80 g/cm³',
      tdsRef: 'Internal — Lab 02.2025',
    },
  },
  {
    id: 'baltek-sbc100',
    name: '3A Baltek SBC.100',
    type: 'Core (Balsa)',
    description: 'End-grain balsa; high compressive strength-to-weight ratio for shell sandwich.',
    lastUpdated: 'v2025/10',
    details: {
      reinforcement: '—',
      matrix: 'Balsa wood',
      modulusTensile: '3.5 GPa',
      density: '0.155 g/cm³',
      tdsRef: 'Issue 01.2024',
    },
  },
  {
    id: 'hybrid-ge-cf',
    name: 'Hybrid-GE-CF-2x2',
    type: 'Hybrid Ply',
    description:
      'In-house 2x2 twill (Carbon/Glass hybrid). Balanced weave for transition zones. Vf =~ 52%',
    lastUpdated: '2025-10-22',
    details: {
      reinforcement: 'Carbon/Glass 2x2',
      matrix: 'Epoxy',
      modulusTensile: '60.0 GPa',
      density: '1.70 g/cm³',
      tdsRef: 'Internal — Lab 10.2024',
    },
  },
  {
    id: 'lep-protective',
    name: 'LEP-Protective-Layer',
    type: 'Surface Ply',
    description:
      'Leading Edge Protection (LEP); high erosion resistance, validated for 15m/s rain impact.',
    lastUpdated: '2025-10-20',
    details: {
      reinforcement: 'PU Elastomer',
      matrix: 'PU Elastomer',
      modulusTensile: '0.5 GPa',
      density: '1.10 g/cm³',
      tdsRef: 'Issue 08.2024',
    },
  },
];

/** "Last updated" stamp for new materials, matching the existing vYYYY/MM style. */
function materialStamp(): string {
  const now = new Date();
  return `v${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Create a material, prepend it to the list, return it. Mock stand-in for a POST. */
export function createMaterial(input: {
  name: string;
  type: string;
  description: string;
}): Material {
  const id = uniqueId(slugify(input.name), (candidate) =>
    MATERIALS.some((m) => m.id === candidate)
  );
  const material: Material = {
    id,
    name: input.name.trim() || 'Untitled material',
    type: input.type,
    description: input.description.trim(),
    lastUpdated: materialStamp(),
    details: {
      reinforcement: '—',
      matrix: '—',
      modulusTensile: '—',
      density: '—',
      tdsRef: '—',
    },
  };
  MATERIALS.unshift(material);
  return material;
}
