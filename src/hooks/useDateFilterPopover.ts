import { useEffect, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';

/**
 * Position + open/closed state + month-navigation for a button-anchored date
 * range filter popover, with click-outside-to-close. Extracted from
 * Material.tsx's "Last updated" column filter (the only date-range filter in
 * the app so far).
 */
export function useDateFilterPopover(onRangeChange: () => void) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPos, setFilterPos] = useState<{ top: number; left: number } | null>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [leftMonth, setLeftMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 1, 1);
  });
  const [rightMonth, setRightMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    if (!filterOpen) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (filterBtnRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setFilterOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [filterOpen]);

  function goPrev() {
    setLeftMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    setRightMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }
  function goNext() {
    setLeftMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    setRightMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  function openFilter() {
    if (!filterOpen && filterBtnRef.current) {
      const r = filterBtnRef.current.getBoundingClientRect();
      const estimatedWidth = 648;
      const left = Math.max(8, r.right + window.scrollX - estimatedWidth);
      setFilterPos({ top: r.bottom + window.scrollY + 6, left });
    }
    setFilterOpen((o) => !o);
  }

  function handleSelect(range: DateRange | undefined) {
    setDateRange(range);
    onRangeChange();
    if (range?.from && range?.to) setFilterOpen(false);
  }

  function clear() {
    setDateRange(undefined);
    onRangeChange();
  }

  return {
    dateRange,
    filterOpen,
    filterPos,
    filterBtnRef,
    popoverRef,
    leftMonth,
    rightMonth,
    setLeftMonth,
    setRightMonth,
    goPrev,
    goNext,
    openFilter,
    handleSelect,
    clear,
  };
}
