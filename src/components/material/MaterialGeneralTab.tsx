import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownSelect as Select } from '@/components/common/form/DropdownSelect';

/** Fallback shown before GET /sysconfig/?material=:id has loaded (or for a brand new,
 *  not-yet-created material) — the real options once loaded come from its
 *  `mech_prop_type` parameter and take over via the `typeOptions` prop. */
const FALLBACK_TYPES: { id: string; name: string }[] = [
  { id: 'ud_ply', name: 'UD ply' },
  { id: 'woven_ply', name: 'woven ply' },
  { id: 'iso_ply', name: 'isotropic ply' },
  { id: 'iso_core', name: 'isotropic core' },
  { id: 'ortho_core', name: 'orthotropic core' },
  { id: 'honey_core', name: 'honeycomb core' },
];

/** "woven ply" -> "Woven Ply" — capitalizes each word without touching existing
 *  uppercase letters, so acronyms like "UD" stay intact. */
function toTitleCase(value: string): string {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface MaterialGeneralTabProps {
  name: string;
  onNameChange: (v: string) => void;
  type: string;
  onTypeChange: (v: string) => void;
  /** From sysconfig's `mech_prop_type` parameter's `name`; falls back to "Type" while unloaded. */
  typeLabel?: string;
  /** From that same parameter's `options`; falls back to a static list while unloaded. */
  typeOptions?: { id: string; name: string }[];
  /** Backend-locked — the dropdown renders read-only. */
  typeDisabled?: boolean;
  date: string;
  onDateChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  /** Fires when focus leaves the form — blurring a field or clicking out. */
  onBlur?: () => void;
}

export function MaterialGeneralTab({
  name,
  onNameChange,
  type,
  onTypeChange,
  typeLabel,
  typeOptions,
  typeDisabled,
  date,
  onDateChange,
  description,
  onDescriptionChange,
  onBlur,
}: MaterialGeneralTabProps) {
  const types = typeOptions && typeOptions.length > 0 ? typeOptions : FALLBACK_TYPES;
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      onBlur={onBlur}
      className="flex w-full max-w-[468px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
    >
      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="material-name" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Name<span className="text-[#dc2626]">*</span>
        </Label>
        <Input
          id="material-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Enter the name of the material"
          required
          className="h-9 rounded-md border-[#e2e8f0] bg-white px-3 py-1 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>

      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="material-type" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          {typeLabel || 'Type'}<span className="text-[#dc2626]">*</span>
        </Label>
        <Select
          id="material-type"
          value={toTitleCase(types.find((t) => t.id === type)?.name ?? '')}
          onChange={(name) => onTypeChange(types.find((t) => toTitleCase(t.name) === name)?.id ?? type)}
          options={types.map((t) => toTitleCase(t.name))}
          disabled={typeDisabled}
        />
      </div>

      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="material-date" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Date<span className="text-[#dc2626]">*</span>
        </Label>
        <Input
          id="material-date"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          required
          className="h-9 rounded-md border-[#e2e8f0] bg-white px-3 py-1 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>

      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="material-description" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Description<span className="text-[#dc2626]">*</span>
        </Label>
        <Textarea
          id="material-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Enter the description of the material"
          required
          rows={4}
          className="min-h-[98px] rounded-md border-[#e2e8f0] bg-white px-3 py-2 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>
    </form>
  );
}
