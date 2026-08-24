import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BufferedNumberInput } from '@/components/common/BufferedNumberInput';

export interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}

/** Plain labelled text input used by the ProfileDetailPopover form. */
export function Field({ label, value, onChange, type = 'text' }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
      />
    </div>
  );
}

export interface NumberFieldProps {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  step?: string;
  min?: number;
  minMessage?: string;
  max?: number;
  maxMessage?: string;
  onBlur?: () => void;
}

/** Numeric Field with a typing buffer — the field stays clearable mid-edit.
 *  Step only affects the native up/down arrows (0.1 by default); typing an
 *  arbitrarily precise value always works regardless of step. */
export function NumberField({ label, value, onCommit, step = '0.1', min, minMessage, max, maxMessage, onBlur }: NumberFieldProps) {
  const belowMin = min !== undefined && Number.isFinite(value) && value < min;
  const aboveMax = max !== undefined && Number.isFinite(value) && value > max;
  const hasError = belowMin || aboveMax;
  return (
    // onBlur on the wrapper bubbles from the input (React blur = focusout), so
    // sort-on-blur fires without clobbering BufferedNumberInput's own onBlur.
    <div className="flex flex-col gap-2" onBlur={onBlur}>
      <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">{label}</Label>
      <BufferedNumberInput
        step={step}
        value={value}
        onCommit={onCommit}
        clampOnBlur={(v) => Math.min(Math.max(v, min ?? -Infinity), max ?? Infinity)}
        className={`h-9 rounded-md px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] ${
          hasError ? 'border-[#dc2626] focus-visible:ring-[#dc2626]/30' : 'border-[#e2e8f0]'
        }`}
      />
      {belowMin && (
        <p className="text-[12px] leading-4 text-[#dc2626]">
          {minMessage ?? `Min value is ${min}`}
        </p>
      )}
      {aboveMax && (
        <p className="text-[12px] leading-4 text-[#dc2626]">
          {maxMessage ?? `Max value is ${max}`}
        </p>
      )}
    </div>
  );
}
