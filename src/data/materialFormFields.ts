export interface FormField {
  name: string;
  label: string;
  required?: boolean;
  helper?: string;
}

export interface FormSection {
  id: string;
  label: string;
  fields: FormField[];
}
