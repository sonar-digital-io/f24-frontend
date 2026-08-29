import type { FormSection } from '@/data/materialFormFields';
import { SysconfigFieldRow } from '@/components/common/form/SysconfigFieldRow';

interface GeometryGlobalPropertiesPanelProps {
  sections: FormSection[];
  values: Record<string, string>;
  onFieldChange: (name: string, value: string) => void;
  /** Fires when focus leaves a field (blur) or the panel itself (click-out) — triggers autosave. */
  onBlur: () => void;
  /** Forces every field's error state on regardless of its own touched state — used to
   *  surface missing required fields after the user opts to stay past the exit-confirm warning. */
  forceShowErrors?: boolean;
  loading: boolean;
  loadError: boolean;
}

export function GeometryGlobalPropertiesPanel({
  sections,
  values,
  onFieldChange,
  onBlur,
  forceShowErrors,
  loading,
  loadError,
}: GeometryGlobalPropertiesPanelProps) {
  return (
    <div
      onBlur={onBlur}
      className="flex max-h-[calc(100vh_-_72px)] flex-col gap-4 overflow-y-auto rounded-[14px] border border-[#e5e7eb] bg-white/95 p-4 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm"
    >
      {loading && <p className="text-[14px] text-[#6b7280]">Loading…</p>}
      {loadError && <p className="text-[14px] text-[#dc2626]">Failed to load form settings.</p>}
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-4">
          {section.fields.map((field) => (
            <SysconfigFieldRow
              key={field.name}
              field={field}
              value={values[field.name] ?? ''}
              onChange={(v) => onFieldChange(field.name, v)}
              helperAsTooltip
              hideRequiredMarker
              forceShowErrors={forceShowErrors}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
