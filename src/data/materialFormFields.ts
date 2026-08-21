export interface FormField {
  name: string;
  label: string;
  required?: boolean;
  helper?: string;
  min?: string;
  max?: string;
  /** The backend parameter's type (e.g. "float", "integer", "selection") — "float"/
   *  "integer" fields reject letters as they're typed. */
  type?: string;
  /** Backend-locked — the field renders read-only. */
  fixed?: boolean;
  /** The backend's current/default value for this field, straight from sysconfig — the
   *  only source for a `fixed` field's value before it's ever appeared in the entity's
   *  own saved data (e.g. a brand new geometry's settings). */
  value?: string;
  /** Present when `type === 'selection'` — the field renders as a dropdown of these. */
  options?: { id: string; name: string }[];
}

export interface FormSection {
  id: string;
  label: string;
  fields: FormField[];
}
