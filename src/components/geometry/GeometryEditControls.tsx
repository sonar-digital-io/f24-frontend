import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export { DropdownSelect as Select } from '@/components/common/form/DropdownSelect';

/** Wraps children with a small hover tooltip (no-op when `label` is empty). */
export function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group/tip relative">
      {children}
      {label && (
        <span className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 whitespace-nowrap rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[11px] leading-none text-white opacity-0 shadow-sm transition-opacity group-hover/tip:opacity-100">
          {label}
        </span>
      )}
    </div>
  );
}

export interface FormFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

/** Labelled text input used by the GeometryEdit "Global properties" panel. */
export function FormField({ label, value, onChange }: FormFieldProps) {
  const inputId = `geometry-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId} className="text-[14px] font-medium leading-none text-[#0a0a0a]">
        {label}
      </Label>
      <Input
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border-[#e2e8f0] bg-white px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
      />
    </div>
  );
}
