import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface ProfilesPanelSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

/** Custom dropdown select used by the ProfilesPanel detail popover (Type field). */
export function ProfilesPanelSelect({ value, onChange, options }: ProfilesPanelSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
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
        className="flex h-9 w-full items-center justify-between rounded-md border border-[#e2e8f0] bg-white px-3 py-1 text-left text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f9fafb]"
      >
        <span>{value}</span>
        <ChevronDown
          className={`h-4 w-4 text-[#6b7280] transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-64 min-w-full overflow-y-auto whitespace-nowrap rounded-md border border-[#e5e7eb] bg-white py-1 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]"
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
