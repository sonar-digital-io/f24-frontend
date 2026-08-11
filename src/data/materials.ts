import { slugify, todayISO, uniqueId } from '@/lib/utils';

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
    lastUpdated: 'v2026/06',
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
    lastUpdated: 'v2026/05',
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
    lastUpdated: '2026-06-03',
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
    lastUpdated: '2026-05-19',
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
    lastUpdated: '2026-05-22',
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
    lastUpdated: '2026-04-20',
    details: {
      reinforcement: 'PU Elastomer',
      matrix: 'PU Elastomer',
      modulusTensile: '0.5 GPa',
      density: '1.10 g/cm³',
      tdsRef: 'Issue 08.2024',
    },
  },

  // --- randomly generated own-source materials ---
  {
    id: 'st-woven-gfrp-200',
    name: 'ST-Woven-GFRP-200',
    type: 'Biaxial Ply (±45°)',
    description: 'In-house woven ±45° glass fiber. 200 gsm areal weight. Validated for skin paneling.',
    lastUpdated: '2025-09-14',
    details: {
      reinforcement: 'Woven E-Glass',
      matrix: 'Epoxy',
      modulusTensile: '14.5 GPa',
      density: '1.88 g/cm³',
      tdsRef: 'Internal — Lab 07.2025',
    },
  },
  {
    id: 'ep-cf-ud-300',
    name: 'EP-CF-UD-300',
    type: 'UD Ply',
    description: 'Experimental 300 gsm UD carbon prepreg. Optimized fiber areal weight for thin spar caps.',
    lastUpdated: '2025-09-02',
    details: {
      reinforcement: 'T800 Carbon',
      matrix: 'Epoxy',
      modulusTensile: '155.0 GPa',
      density: '1.58 g/cm³',
      tdsRef: 'Internal — Exp 09.2025',
    },
  },
  {
    id: 'pu-core-60',
    name: 'ST-PU-Core-60',
    type: 'Core (PET Foam)',
    description: 'Polyurethane structural foam, 60 kg/m³. In-house characterized shear modulus.',
    lastUpdated: '2025-08-21',
    details: {
      reinforcement: '—',
      matrix: 'PU Foam',
      modulusTensile: '0.060 GPa',
      density: '0.060 g/cm³',
      tdsRef: 'Internal — Lab 06.2025',
    },
  },
  {
    id: 'triax-ncf-450',
    name: 'ST-Triax-NCF-450',
    type: 'Random Mat Ply',
    description: '0/±45° triaxial NCF, 450 gsm. Custom stitch angle for root section integration.',
    lastUpdated: '2025-08-05',
    details: {
      reinforcement: 'Triaxial E-Glass NCF',
      matrix: 'Epoxy',
      modulusTensile: '19.0 GPa',
      density: '1.90 g/cm³',
      tdsRef: 'Internal — Lab 05.2025',
    },
  },
  {
    id: 'st-surface-veil',
    name: 'ST-Surface-Veil-25',
    type: 'Surface Ply',
    description: 'Carbon veil surface ply, 25 gsm. Lightning strike protection + cosmetic finish.',
    lastUpdated: '2025-07-30',
    details: {
      reinforcement: 'Carbon Veil',
      matrix: 'Epoxy',
      modulusTensile: '8.0 GPa',
      density: '1.30 g/cm³',
      tdsRef: 'Internal — Lab 04.2025',
    },
  },
  {
    id: 'hybrid-cf-gf-v2',
    name: 'ST-Hybrid-CF-GF-v2',
    type: 'Hybrid Ply',
    description: 'Revised carbon/glass hybrid. Improved interlaminar toughness over v1. Validated via ILSS.',
    lastUpdated: '2025-07-12',
    details: {
      reinforcement: 'Carbon/Glass 3x3',
      matrix: 'Epoxy',
      modulusTensile: '55.0 GPa',
      density: '1.68 g/cm³',
      tdsRef: 'Internal — Lab 03.2025',
    },
  },
  {
    id: 'cf-prepreg-hm-150',
    name: 'CF-Prepreg-HM-150',
    type: 'UD Carbon Ply',
    description: 'High-modulus UD prepreg, 150 gsm. Developed for tip spar caps — minimizes aeroelastic twist.',
    lastUpdated: '2025-06-28',
    details: {
      reinforcement: 'HM Carbon 150gsm',
      matrix: 'Epoxy (OOA)',
      modulusTensile: '230.0 GPa',
      density: '1.62 g/cm³',
      tdsRef: 'Internal — Lab 01.2025',
    },
  },
  {
    id: 'ep-balsa-alt-120',
    name: 'EP-Balsa-Alt-120',
    type: 'Core (Balsa)',
    description: 'Alternative balsa grade, 120 kg/m³. Sourced from certified plantation; higher shear stiffness.',
    lastUpdated: '2025-06-10',
    details: {
      reinforcement: '—',
      matrix: 'Balsa wood (120)',
      modulusTensile: '5.2 GPa',
      density: '0.120 g/cm³',
      tdsRef: 'Internal — Lab 12.2024',
    },
  },
];

/** Sort key that makes the two lastUpdated formats (vYYYY/MM and YYYY-MM-DD) comparable. */
export function lastUpdatedSortKey(value: string): string {
  return value.startsWith('v') ? value.slice(1).replace('/', '-') : value;
}

/** Update an existing material in-place. Mock stand-in for a PATCH. */
export function updateMaterial(
  id: string,
  changes: Partial<Pick<Material, 'name' | 'type' | 'description'>>
): void {
  const idx = MATERIALS.findIndex((m) => m.id === id);
  if (idx === -1) return;
  MATERIALS[idx] = {
    ...MATERIALS[idx],
    ...changes,
    lastUpdated: todayISO(),
  };
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
    lastUpdated: todayISO(),
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
