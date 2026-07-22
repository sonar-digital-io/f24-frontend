import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

interface SelectInlineProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
}

/** Small custom dropdown rendered via portal so it can escape table/overflow clipping. */
export function SelectInline({ value, onChange, options, className = '' }: SelectInlineProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setOpen((o) => !o);
  }

  const dropdown =
    open && pos
      ? createPortal(
          <ul
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: pos.top,
              left: pos.left,
              minWidth: pos.width,
              zIndex: 9999,
            }}
            className="whitespace-nowrap rounded-md border border-[#e5e7eb] bg-white py-1 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)]"
          >
            {options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] ${
                    opt === value ? 'bg-[#eef9ff] text-[#171717]' : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                  }`}
                >
                  {opt}
                  {opt === value && <Check className="ml-3 h-3.5 w-3.5" strokeWidth={2} />}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="flex h-8 w-full items-center justify-between gap-1 rounded-md border border-[#e2e8f0] bg-white px-2 text-[13px] text-[#0a0a0a] hover:bg-[#f9fafb]"
      >
        <span className="truncate">{value}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-[#6b7280] transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      {dropdown}
    </div>
  );
}
