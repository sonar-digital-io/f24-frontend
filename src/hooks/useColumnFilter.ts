import { useEffect, useMemo, useRef, useState } from 'react';
import { toggleSetMember } from '@/lib/listTable';

/**
 * State/logic for a table-column "Filter by …" control: a small button (in the
 * column header) that opens a searchable, multi-select checkbox dropdown via
 * a portal. Shared by the Composition/Geometry/Material/Calculation list
 * pages' type/status filters — same behavior, different option sets.
 */
export function useColumnFilter(options: string[], onSelectionChange?: () => void) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [query, setQuery] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || dropRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o?.toLowerCase().includes(q)) : options;
  }, [options, query]);

  function openDropdown() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX });
    }
    setOpen((o) => !o);
  }

  function toggle(value: string) {
    setSelected((prev) => toggleSetMember(prev, value));
    onSelectionChange?.();
  }

  function toggleSelectAll() {
    const allVisible = visibleOptions.every((o) => selected.has(o));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisible) visibleOptions.forEach((o) => next.delete(o));
      else visibleOptions.forEach((o) => next.add(o));
      return next;
    });
    onSelectionChange?.();
  }

  function clear() {
    setSelected(new Set());
    onSelectionChange?.();
  }

  return {
    selected,
    open,
    pos,
    query,
    setQuery,
    btnRef,
    dropRef,
    visibleOptions,
    openDropdown,
    toggle,
    toggleSelectAll,
    clear,
  };
}
