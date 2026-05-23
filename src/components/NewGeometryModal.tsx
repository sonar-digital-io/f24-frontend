import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const BLADE_TYPES = [
  'Wind turbine blade',
  'Gas turbine blade',
  'Aero blade',
  'Hydraulic blade',
];

const MANUFACTURING_TECHNOLOGIES = [
  'To be determined',
  'Vacuum infusion',
  'Prepreg autoclave',
  'Filament winding',
  'Resin transfer moulding',
];

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

function Select({ value, onChange, options, placeholder = 'Select' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center justify-between rounded-md border border-[#e2e8f0] bg-white px-3 py-1 text-left text-[14px] font-normal shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#006496] focus:ring-offset-1"
      >
        <span className={value ? 'text-[#0a0a0a]' : 'text-[#6b7280]'}>
          {value || placeholder}
        </span>
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
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
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

export interface NewGeometryPayload {
  bladeType: string;
  manufacturingTechnology: string;
  name: string;
  description: string;
}

interface NewGeometryModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: NewGeometryPayload) => void;
}

export function NewGeometryModal({ open, onClose, onCreate }: NewGeometryModalProps) {
  const [bladeType, setBladeType] = useState('');
  const [manufacturing, setManufacturing] = useState('To be determined');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Reset on open
  useEffect(() => {
    if (open) {
      setBladeType('');
      setManufacturing('To be determined');
      setName('');
      setDescription('');
    }
  }, [open]);

  // Lock body scroll while open + ESC to close
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const canCreate = bladeType && name.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    onCreate({ bladeType, manufacturingTechnology: manufacturing, name: name.trim(), description });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-geometry-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[440px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2
              id="new-geometry-title"
              className="text-[16px] font-semibold leading-none text-[#0a0a0a]"
            >
              Project configuration
            </h2>
            <p className="text-[14px] leading-5 text-[#6b7280]">
              Your selection defines the starting geometry, which can be fully customized in the next steps.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-2">
          <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">Blade type</Label>
          <Select value={bladeType} onChange={setBladeType} options={BLADE_TYPES} placeholder="Select" />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
            Manufacturing technology
          </Label>
          <Select
            value={manufacturing}
            onChange={setManufacturing}
            options={MANUFACTURING_TECHNOLOGIES}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-geom-name" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
            Name
          </Label>
          <Input
            id="new-geom-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Placeholder"
            className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="new-geom-description"
            className="text-[14px] font-medium leading-none text-[#0a0a0a]"
          >
            Description
          </Label>
          <Textarea
            id="new-geom-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Placeholder"
            rows={2}
            className="min-h-[60px] rounded-md border-[#e2e8f0] px-3 py-2 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          />
        </div>

        {/* Footer */}
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-[14px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canCreate}
            className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#006496]"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
