import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClickOutside } from '@/hooks/useClickOutside';

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  disabled?: boolean;
}

/** Custom dropdown select used by the GeometryEdit sub-panels. */
export function Select({ value, onChange, options, placeholder = 'Select', disabled = false }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useClickOutside<HTMLDivElement>(open, () => setOpen(false));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        className="flex h-9 w-full items-center justify-between rounded-md border border-[#e2e8f0] bg-white px-3 py-1 text-left text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={value ? 'text-[#0a0a0a]' : 'text-[#6b7280]'}>{value || placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 text-[#6b7280] transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-64 overflow-y-auto rounded-md border border-[#e5e7eb] bg-white py-1 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]"
        >
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <li key={opt} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[14px] leading-5 ${
                    selected ? 'bg-[#eef9ff] text-[#171717]' : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                  }`}
                >
                  <span>{opt}</span>
                  {selected && <Check className="h-4 w-4" strokeWidth={2} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

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
