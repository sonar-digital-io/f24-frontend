import { useEffect, useRef, type RefObject } from 'react';

/**
 * Creates a ref for a "root" element (e.g. a dropdown/popover/menu container) and
 * dismisses it — via `onDismiss` — on either an outside click (mousedown) or the
 * Escape key, while `active` is true. Used by the various small custom `Select`/
 * menu components that need to close themselves when the user clicks away.
 *
 * The hook only owns the dismiss-listening side effect — callers keep their own
 * `open`/`setOpen` state and pass `open` as `active` plus `() => setOpen(false)`
 * as `onDismiss`.
 */
export function useClickOutside<T extends HTMLElement>(
  active: boolean,
  onDismiss: () => void
): RefObject<T> {
  const rootRef = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onDismiss();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss();
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return rootRef;
}
