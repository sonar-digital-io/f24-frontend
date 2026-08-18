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
}

export interface FormSection {
  id: string;
  label: string;
  fields: FormField[];
}
