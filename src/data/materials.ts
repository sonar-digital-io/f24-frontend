import { slugify, todayISO, uniqueId } from '@/lib/utils';

export interface Material {
  id: string;
  name: string;
  type: string;
  description: string;
  lastUpdated: string;
}

export const MATERIALS: Material[] = [
  {
    id: 'envalior-tepex-101',
    name: 'Envalior Tepex dynalite 101',
    type: 'Consolidated Ply',
    description: 'Continuous glass fiber reinforced PA6 matrix. High impact resistance; Vf =~ 47%',
    lastUpdated: 'v2026/06',
  },
  {
    id: 'envalior-tepex-202',
    name: 'Envalior Tepex dynalite 202',
    type: 'Consolidated Ply',
    description:
      'Carbon fiber reinforced PA6 matrix. Optimized for high stiffness-to-weight ratio and thermoforming.',
    lastUpdated: 'v2026/05',
  },
  {
    id: 'torayca-t700s',
    name: 'Torayca T700S / Epoxy',
    type: 'UD Carbon Ply',
    description: 'High-strength UD prepreg; Vf =~ 60%. Standard spar cap reinforcement.',
    lastUpdated: 'v2025/12',
  },
  {
    id: 'eglass-1200',
    name: 'E-Glass 1200gsm',
    type: 'Biaxial Ply (±45°)',
    description: 'Non-crimp fabric (NCF); optimized for shear web and skin torsion stiffness.',
    lastUpdated: 'v2025/12',
  },
  {
    id: 'st-carbon-hymod',
    name: 'ST-Carbon-Hymod-01',
    type: 'UD Ply',
    description: 'In-house characterized high-modulus UD. Post-cured at 80°C. Validated fatigue data.',
    lastUpdated: '2026-06-03',
  },
  {
    id: 'airex-r8280',
    name: 'Airex R82.80',
    type: 'Core (PET Foam)',
    description: 'Closed-cell thermoplastic foam; 80 kg/m³ density. Shear-critical applications.',
    lastUpdated: 'v2025/11',
  },
  {
    id: 'st-glass-csm-450',
    name: 'ST-Glass-CSM-450-EP',
    type: 'Random Mat Ply',
    description:
      'E-Glass chopped strand mat (450gsm) with epoxy matrix. Isotropic in-plane behavior for non-structural fill.',
    lastUpdated: '2026-05-19',
  },
  {
    id: 'baltek-sbc100',
    name: '3A Baltek SBC.100',
    type: 'Core (Balsa)',
    description: 'End-grain balsa; high compressive strength-to-weight ratio for shell sandwich.',
    lastUpdated: 'v2025/10',
  },
  {
    id: 'hybrid-ge-cf',
    name: 'Hybrid-GE-CF-2x2',
    type: 'Hybrid Ply',
    description:
      'In-house 2x2 twill (Carbon/Glass hybrid). Balanced weave for transition zones. Vf =~ 52%',
    lastUpdated: '2026-05-22',
  },
  {
    id: 'lep-protective',
    name: 'LEP-Protective-Layer',
    type: 'Surface Ply',
    description:
      'Leading Edge Protection (LEP); high erosion resistance, validated for 15m/s rain impact.',
    lastUpdated: '2026-04-20',
  },

  // --- randomly generated own-source materials ---
  {
    id: 'st-woven-gfrp-200',
    name: 'ST-Woven-GFRP-200',
    type: 'Biaxial Ply (±45°)',
    description: 'In-house woven ±45° glass fiber. 200 gsm areal weight. Validated for skin paneling.',
    lastUpdated: '2025-09-14',
  },
  {
    id: 'ep-cf-ud-300',
    name: 'EP-CF-UD-300',
    type: 'UD Ply',
    description: 'Experimental 300 gsm UD carbon prepreg. Optimized fiber areal weight for thin spar caps.',
    lastUpdated: '2025-09-02',
  },
  {
    id: 'pu-core-60',
    name: 'ST-PU-Core-60',
    type: 'Core (PET Foam)',
    description: 'Polyurethane structural foam, 60 kg/m³. In-house characterized shear modulus.',
    lastUpdated: '2025-08-21',
  },
  {
    id: 'triax-ncf-450',
    name: 'ST-Triax-NCF-450',
    type: 'Random Mat Ply',
    description: '0/±45° triaxial NCF, 450 gsm. Custom stitch angle for root section integration.',
    lastUpdated: '2025-08-05',
  },
  {
    id: 'st-surface-veil',
    name: 'ST-Surface-Veil-25',
    type: 'Surface Ply',
    description: 'Carbon veil surface ply, 25 gsm. Lightning strike protection + cosmetic finish.',
    lastUpdated: '2025-07-30',
  },
  {
    id: 'hybrid-cf-gf-v2',
    name: 'ST-Hybrid-CF-GF-v2',
    type: 'Hybrid Ply',
    description: 'Revised carbon/glass hybrid. Improved interlaminar toughness over v1. Validated via ILSS.',
    lastUpdated: '2025-07-12',
  },
  {
    id: 'cf-prepreg-hm-150',
    name: 'CF-Prepreg-HM-150',
    type: 'UD Carbon Ply',
    description: 'High-modulus UD prepreg, 150 gsm. Developed for tip spar caps — minimizes aeroelastic twist.',
    lastUpdated: '2025-06-28',
  },
  {
    id: 'ep-balsa-alt-120',
    name: 'EP-Balsa-Alt-120',
    type: 'Core (Balsa)',
    description: 'Alternative balsa grade, 120 kg/m³. Sourced from certified plantation; higher shear stiffness.',
    lastUpdated: '2025-06-10',
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
  };
  MATERIALS.unshift(material);
  return material;
}
