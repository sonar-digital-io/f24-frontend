import { useEffect } from 'react';

/** Locks page scroll (`overflow: hidden` on body) while `active` is true. Used by full-screen dialogs. */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}
