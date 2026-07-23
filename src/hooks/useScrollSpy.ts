import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-spy for a "sidebar nav + scrollable sections" layout (PropertyFormTab,
 * CalculationNew's Configuration tab): tracks which section is scrolled to the
 * top of the container, and exposes `jumpTo` for nav-click scrolling.
 *
 * After a nav click, the clicked section stays "active" until it either
 * reaches the detection threshold or the user scrolls past it — this avoids
 * the active nav item flickering back on click for short/last sections.
 */
export function useScrollSpy<T extends string>(sectionIds: readonly T[], initialId: T) {
  const [activeId, setActiveId] = useState<T>(initialId);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const lastClickedRef = useRef<T | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleScroll() {
      const el = containerRef.current;
      if (!el) return;
      const containerTop = el.getBoundingClientRect().top;
      const offsets = sectionIds
        .map((id) => {
          const sectionEl = sectionRefs.current[id];
          return sectionEl ? { id, top: sectionEl.getBoundingClientRect().top - containerTop } : null;
        })
        .filter((x): x is { id: T; top: number } => x !== null);

      const aboveOrAt = offsets.filter((o) => o.top <= 100);
      const detected = aboveOrAt.length > 0 ? aboveOrAt[aboveOrAt.length - 1].id : offsets[0]?.id;
      if (!detected) return;

      // If the user clicked a nav item that can't reach the top threshold (e.g. last
      // section in a short list), keep it active until the user scrolls past it.
      if (lastClickedRef.current && lastClickedRef.current !== detected) {
        const clickedEl = sectionRefs.current[lastClickedRef.current];
        if (clickedEl) {
          const clickedTop = clickedEl.getBoundingClientRect().top - containerTop;
          if (clickedTop > 100) return; // section is still below threshold — keep it active
        }
      }
      lastClickedRef.current = null;
      setActiveId(detected);
    }

    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [sectionIds]);

  function jumpTo(id: T) {
    setActiveId(id);
    lastClickedRef.current = id;

    const container = containerRef.current;
    const el = sectionRefs.current[id];
    if (!container || !el) return;
    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    // Instant scroll avoids timing races with the scroll-spy.
    container.scrollBy({ top: elTop - containerTop - 16 });
  }

  return { activeId, setActiveId, containerRef, sectionRefs, jumpTo };
}
