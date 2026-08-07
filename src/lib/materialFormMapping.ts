import type { KeyValuePair } from '@/api/types/common';

/** Type isn't its own field on the material — it's a mechanical property, sent/read
 * as the "mech_prop_type" entry in mechanical_properties. */
export const MECH_PROP_TYPE_REFERENCE = 'mech_prop_type';

export function toKeyValueList(values: Record<string, string>) {
  return Object.entries(values)
    .filter(([, value]) => value.trim() !== '')
    .map(([reference, value]) => ({ reference, value }));
}

export function toValueMap(list?: KeyValuePair[]): Record<string, string> {
  const map: Record<string, string> = {};
  (list ?? []).forEach((kv) => {
    map[kv.reference] = String(kv.value);
  });
  return map;
}

/** Order-independent signature of a values record, for change detection. */
export function keyValueSignature(values: Record<string, string>): string {
  return JSON.stringify(
    toKeyValueList(values).sort((a, b) => a.reference.localeCompare(b.reference))
  );
}
