import { useEffect } from 'react';

/**
 * Calls `onClose` when Escape is pressed, while `enabled` is true. Shared by
 * dialogs/popovers that close on ESC (pass `enabled` for ones only mounted while open).
 */
export function useEscapeKey(onClose: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
