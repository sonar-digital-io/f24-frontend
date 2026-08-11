export interface FormField {
  name: string;
  label: string;
  required?: boolean;
  helper?: string;
  min?: string;
  max?: string;
}

export interface FormSection {
  id: string;
  label: string;
  fields: FormField[];
}

/** Empty is fine here (required-ness is a separate check) — only a value that's
 *  actually entered gets checked against the field's min/max. */
export function isFieldInRange(value: string, field: FormField): boolean {
  const trimmed = value.trim();
  if (trimmed === '') return true;
  const num = Number(trimmed);
  if (Number.isNaN(num)) return false;
  if (field.min !== undefined && num < Number(field.min)) return false;
  if (field.max !== undefined && num > Number(field.max)) return false;
  return true;
}

/** True when every required field across `sections` is filled and every filled
 *  field (required or not) is within its min/max — the gate for saving the form. */
export function isFormValid(sections: FormSection[], values: Record<string, string>): boolean {
  return sections.every((section) =>
    section.fields.every((field) => {
      const value = values[field.name] ?? '';
      if (field.required && value.trim() === '') return false;
      return isFieldInRange(value, field);
    })
  );
}
