import type { SysconfigResponse, SysconfigProjectSettings } from '@/api/types/sysconfig';
import type { FormSection } from '@/data/materialFormFields';

function unitSuffix(sysconfig: SysconfigResponse, unitId: string | undefined): string {
  if (!unitId) return '';
  const unit = sysconfig.units.find((u) => u.id === unitId);
  return unit && unit.group !== 'unitless' && unit.symbol ? ` (${unit.symbol})` : '';
}

/**
 * Builds PropertyFormTab sections from a sysconfig property section (mechanical or
 * fatigue properties). Labels/units/required come straight from the backend's parameter
 * catalog — no more hand-maintained, easily-mismatched labels. `active` is already
 * resolved server-side against the material's current values, so it alone decides which
 * fields show at all (e.g. elastic_modulus_33 only for isotropic types).
 */
export function buildMaterialPropertySections(
  sysconfig: SysconfigResponse,
  section: SysconfigProjectSettings | undefined
): FormSection[] {
  if (!section) return [];
  return section.groups
    .map((group) => ({
      id: group.id,
      label: group.name,
      fields: group.parameters
        .filter((entry) => entry.active)
        .map((entry) => {
          const paramDef = sysconfig.parameters.find((p) => p.id === entry.reference);
          const label = (paramDef?.name ?? entry.reference) + unitSuffix(sysconfig, paramDef?.unit);
          const helper =
            entry.minimum || entry.maximum
              ? `Range: ${entry.minimum ?? '…'} – ${entry.maximum ?? '…'}`
              : undefined;
          return { name: entry.reference, label, required: !entry.optional, helper };
        }),
    }))
    .filter((s) => s.fields.length > 0);
}
