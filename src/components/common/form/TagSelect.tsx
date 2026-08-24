import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';

interface TagSelectProps {
  options: string[];
  defaultValue?: string[];
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
}

export function TagSelect({ options, defaultValue = [], value, onChange, placeholder }: TagSelectProps) {
  const [internal, setInternal] = useState<string[]>(defaultValue);
  const [open, setOpen] = useState(false);
  const containerRef = useClickOutside<HTMLDivElement>(open, () => setOpen(false));

  const selected = value ?? internal;

  function toggle(option: string) {
    const next = selected.includes(option)
      ? selected.filter((s) => s !== option)
      : [...selected, option];
    if (onChange) onChange(next);
    else setInternal(next);
  }

  function remove(option: string, e: React.MouseEvent) {
    e.stopPropagation();
    const next = selected.filter((s) => s !== option);
    if (onChange) onChange(next);
    else setInternal(next);
  }

  function handleOptionKeyDown(e: React.KeyboardEvent, option: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(option);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger — a plain <button> can't be used here since the tag "remove" ×
          buttons inside it would nest a <button> inside a <button> (invalid
          HTML) — role="button" + tabIndex + onKeyDown gives the same keyboard
          behavior instead. */}
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          // Ignore Enter/Space bubbling up from a nested "remove tag" button.
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="flex min-h-9 cursor-pointer flex-wrap items-center gap-1.5 rounded-md border border-[#e2e8f0] bg-white px-2.5 py-1.5 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006496] focus-visible:ring-offset-1"
      >
        {selected.length === 0 && (
          <span className="text-[14px] text-[#9ca3af]">{placeholder ?? 'Select…'}</span>
        )}
        {selected.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-[13px] font-medium text-[#374151]"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => remove(tag, e)}
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[#9ca3af] hover:text-[#374151]"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 text-[#6b7280] transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-[#e5e7eb] bg-white shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]">
          <ul role="listbox" aria-multiselectable="true" className="max-h-[220px] overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <li
                  key={option}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => toggle(option)}
                  onKeyDown={(e) => handleOptionKeyDown(e, option)}
                  className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[14px] text-[#0a0a0a] hover:bg-[#f9fafb] focus-visible:outline-none focus-visible:bg-[#f1f5f9]"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isSelected ? 'border-[#006496] bg-[#006496]' : 'border-[#d1d5db] bg-white'
                    }`}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                  </span>
                  {option}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
