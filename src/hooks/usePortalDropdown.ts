import { useEffect, useRef, useState } from 'react';

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

/**
 * Shared open/position/click-outside state for a custom dropdown whose
 * option list is rendered via `createPortal(..., document.body)` — so it
 * can escape a scrollable/clipping ancestor (a modal with `overflow-y-auto`,
 * a table cell) instead of being cut off. Used by `SelectField` and
 * `SelectInline`, which only differ in how they render the trigger/options.
 */
export function usePortalDropdown(offset = 4) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPosition | null>(null);
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

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + window.scrollY + offset,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setOpen((o) => !o);
  }

  return { open, pos, wrapperRef, buttonRef, dropdownRef, toggle, close: () => setOpen(false) };
}
