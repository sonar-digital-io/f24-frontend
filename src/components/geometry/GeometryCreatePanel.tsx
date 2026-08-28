import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface GeometryCreatePanelProps {
  isNew: boolean;
  name: string;
  onNameChange: (v: string) => void;
  date: string;
  onDateChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  hasError: boolean;
  /** Fires when focus leaves a field (blur) or the form itself (click-out) — creates the
   *  geometry as soon as Name is filled in while new, autosaves every field afterwards. */
  onBlur: () => void;
  /** Forces every field's error state on regardless of its own touched state — used to
   *  surface missing required fields after the user opts to stay past the exit-confirm warning. */
  forceShowErrors?: boolean;
}

/** Red-border + "This field is required." treatment for one of this panel's own
 *  mandatory fields, tracked per-field (touched on its own blur) or all at once via
 *  `forceShowErrors` — same convention as SysconfigFieldRow's `missingRequired`. */
function useRequiredField(value: string, forceShowErrors?: boolean) {
  const [touched, setTouched] = useState(false);
  const invalid = (touched || forceShowErrors) && !value.trim();
  return { invalid, markTouched: () => setTouched(true) };
}

/** "Project configuration" tab panel — create-new form, or edit-general form when editing.
 *  Autosaves on blur, same as Material's General tab — no explicit Save/Create button. */
export function GeometryCreatePanel({
  isNew,
  name,
  onNameChange,
  date,
  onDateChange,
  description,
  onDescriptionChange,
  hasError,
  onBlur,
  forceShowErrors,
}: GeometryCreatePanelProps) {
  const nameField = useRequiredField(name, forceShowErrors);
  const dateField = useRequiredField(date, forceShowErrors);
  const descriptionField = useRequiredField(description, forceShowErrors);

  return (
    <div
      onBlur={onBlur}
      className="flex flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm"
    >
      <div className="flex flex-col gap-1">
        <p className="text-[16px] font-semibold leading-none text-[#0a0a0a]">
          Project configuration
        </p>
        <p className="text-[13px] leading-5 text-[#6b7280]">
          Your selection defines the starting geometry, which can be fully customized in the next steps.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Name<span className="text-[#dc2626]">*</span>
        </Label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={nameField.markTouched}
          placeholder="Geometry name"
          aria-invalid={nameField.invalid}
          className={`h-9 rounded-md px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] ${
            nameField.invalid ? 'border-[#dc2626] focus-visible:ring-[#dc2626]' : 'border-[#e2e8f0]'
          }`}
        />
        {nameField.invalid && <p className="text-[13px] leading-4 text-[#dc2626]">This field is required.</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Date<span className="text-[#dc2626]">*</span>
        </Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          onBlur={dateField.markTouched}
          aria-invalid={dateField.invalid}
          className={`h-9 rounded-md px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] ${
            dateField.invalid ? 'border-[#dc2626] focus-visible:ring-[#dc2626]' : 'border-[#e2e8f0]'
          }`}
        />
        {dateField.invalid && <p className="text-[13px] leading-4 text-[#dc2626]">This field is required.</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Description<span className="text-[#dc2626]">*</span>
        </Label>
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          onBlur={descriptionField.markTouched}
          placeholder="Describe the geometry"
          rows={2}
          aria-invalid={descriptionField.invalid}
          className={`min-h-[60px] rounded-md px-3 py-2 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] ${
            descriptionField.invalid ? 'border-[#dc2626] focus-visible:ring-[#dc2626]' : 'border-[#e2e8f0]'
          }`}
        />
        {descriptionField.invalid && (
          <p className="text-[13px] leading-4 text-[#dc2626]">This field is required.</p>
        )}
      </div>

      {hasError && (
        <p className="text-[13px] text-[#dc2626]">
          Failed to {isNew ? 'create' : 'update'} geometry. Please try again.
        </p>
      )}
    </div>
  );
}
