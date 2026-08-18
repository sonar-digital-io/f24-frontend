import type { FormField, FormSection } from '@/data/materialFormFields';

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

/** True when every filled field (required or not) is within its min/max — ignores
 *  whether required fields are actually filled. Gates autosave: partial/incomplete
 *  data is fine to save, out-of-range data isn't. */
export function isFormRangeValid(sections: FormSection[], values: Record<string, string>): boolean {
  return sections.every((section) =>
    section.fields.every((field) => isFieldInRange(values[field.name] ?? '', field))
  );
}

/** True when every required field across `sections` is filled AND every filled
 *  field is within its min/max — the gate for moving on to the next tab. */
export function isFormValid(sections: FormSection[], values: Record<string, string>): boolean {
  return sections.every((section) =>
    section.fields.every((field) => {
      const value = values[field.name] ?? '';
      if (field.required && value.trim() === '') return false;
      return isFieldInRange(value, field);
    })
  );
}
