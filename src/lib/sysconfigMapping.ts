import type { SysconfigParameter, SysconfigParamEntry, SysconfigResponse, SysconfigProjectSettings } from '@/api/types/sysconfig';
import type { FormField, FormSection } from '@/data/materialFormFields';

/** The "mech_prop_type" parameter — its `name` is the Type dropdown's label, its
 *  `options` are the real id/name values the dropdown must store, straight from the backend. */
export function getMechPropTypeParameter(sysconfig: SysconfigResponse): SysconfigParameter | undefined {
  return sysconfig.parameters.find((p) => p.id === 'mech_prop_type');
}

/** The "mech_prop_type" entry's own state for this material — `fixed` disables the
 *  Type dropdown, same as any other backend-locked field. */
export function getMechPropTypeEntry(sysconfig: SysconfigResponse): SysconfigParamEntry | undefined {
  return sysconfig.configuration.mechanical_properties?.parameters?.find((p) => p.reference === 'mech_prop_type');
}

function unitSuffix(sysconfig: SysconfigResponse, unitId: string | undefined): string {
  if (!unitId) return '';
  const unit = sysconfig.units.find((u) => u.id === unitId);
  return unit && unit.group !== 'unitless' && unit.symbol ? ` (${unit.symbol})` : '';
}

function buildField(sysconfig: SysconfigResponse, entry: SysconfigParamEntry): FormField {
  const paramDef = sysconfig.parameters.find((p) => p.id === entry.reference);
  const label = (paramDef?.name ?? entry.reference) + unitSuffix(sysconfig, paramDef?.unit);
  const helper =
    entry.minimum !== undefined && entry.maximum !== undefined
      ? `Value must be between ${entry.minimum} and ${entry.maximum}.`
      : entry.minimum !== undefined
        ? `Value must be larger than ${entry.minimum}.`
        : entry.maximum !== undefined
          ? `Value must be smaller than ${entry.maximum}.`
          : undefined;
  return {
    name: entry.reference,
    label,
    required: !entry.optional,
    helper,
    min: entry.minimum,
    max: entry.maximum,
    type: paramDef?.type,
    fixed: entry.fixed,
    value: entry.value,
    options: paramDef?.options,
  };
}

/**
 * Restricts a values map to just the fields `sections` currently lists as active.
 * A dependency can drop a field to `active: false` — per the config's own contract that
 * means "gone", not "disabled": the frontend must never resubmit that field's now-stale
 * value once it happens (e.g. a Mechanical property that only applied to the ply type the
 * material just switched away from).
 */
export function pickActiveFields(
  values: Record<string, string>,
  sections: FormSection[]
): Record<string, string> {
  const activeNames = new Set(sections.flatMap((s) => s.fields.map((f) => f.name)));
  return Object.fromEntries(Object.entries(values).filter(([name]) => activeNames.has(name)));
}

/**
 * Builds PropertyFormTab sections from a sysconfig property section (mechanical/fatigue
 * properties, geometry settings, …). Labels/units/required come straight from the backend's
 * parameter catalog — no more hand-maintained, easily-mismatched labels. `active` is already
 * resolved server-side against the entity's current values, so it alone decides which
 * fields show at all (e.g. elastic_modulus_33 only for isotropic material types).
 */
export function buildSysconfigSections(
  sysconfig: SysconfigResponse,
  section: SysconfigProjectSettings | undefined,
  exclude?: Set<string>
): FormSection[] {
  if (!section) return [];
  return (section.groups ?? [])
    .map((group) => ({
      id: group.id,
      label: group.name,
      fields: (group.parameters ?? [])
        .filter((entry) => entry.active && !exclude?.has(entry.reference))
        .map((entry) => buildField(sysconfig, entry)),
    }))
    .filter((s) => s.fields.length > 0);
}

/**
 * Pulls a single parameter reference out of a sysconfig section — wherever it happens to
 * live there, grouped or ungrouped — into its own standalone `FormSection`. For fields the
 * UI wants pinned to a fixed spot regardless of how the backend groups them (e.g. the
 * Configuration tab's Debug switch, always its own group at the bottom).
 */
export function buildStandaloneGroup(
  sysconfig: SysconfigResponse,
  section: SysconfigProjectSettings | undefined,
  reference: string,
  label: string
): FormSection[] {
  const entry = [...(section?.parameters ?? []), ...(section?.groups ?? []).flatMap((g) => g.parameters ?? [])].find(
    (e) => e.reference === reference
  );
  if (!entry || !entry.active) return [];
  return [{ id: reference, label, fields: [buildField(sysconfig, entry)] }];
}
