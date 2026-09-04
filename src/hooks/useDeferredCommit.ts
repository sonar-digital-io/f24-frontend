import { useEffect, useRef } from 'react';

/** How long to wait after the last `requestCommit()` call before actually firing
 *  `onCommit` — shared by every curve/point editor autosave so a burst of rapid
 *  edits (dragging a point, adding/deleting several in a row) collapses into a
 *  single request instead of one per edit. */
export const COMMIT_DEBOUNCE_MS = 1000;

/**
 * Debounces `onCommit` by `COMMIT_DEBOUNCE_MS` after the last `requestCommit()`
 * call — a burst of point moves/adds/deletes (or field edits) collapses into a
 * single commit once the user actually pauses, instead of one request per edit.
 * `onCommit` is read via a ref updated on every render, so the debounced call
 * always sees whatever state is current when it actually fires, never a stale
 * snapshot from whichever render happened to request it. Shared by
 * ProfileDistributionPanel/StackingPanel/ProfilesPanel's identical
 * autosave-after-edit pattern.
 */
export function useDeferredCommit(onCommit: () => void) {
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return function requestCommit() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      onCommitRef.current();
    }, COMMIT_DEBOUNCE_MS);
  };
}

/**
 * `useDeferredCommit` plus the "don't PUT a no-op, retry on failure" pattern
 * shared by ProfileDistributionPanel/StackingPanel/ProfilesPanel: skips the
 * commit if `getValue()`'s JSON signature matches whatever was last actually
 * sent, and only marks it sent once `onCommit` resolves — a rejection leaves
 * the signature unmarked (`onCommit`'s own mutation already toasts) so the
 * same value is retried on the next edit instead of being silently treated
 * as sent. `enabled` re-gates every commit attempt, e.g. a "has enough
 * points to save" precondition — a function (not a plain boolean) so callers
 * can pass one that closes over state declared after this hook is called
 * (e.g. a value derived from `useEditableSectionPoints`, which itself needs
 * the `requestCommit` this hook returns).
 */
export function useCommitOnce<T>(
  getValue: () => T,
  onCommit: (value: T) => Promise<void>,
  enabled: () => boolean = () => true,
) {
  const lastCommittedRef = useRef<string | null>(null);

  const requestCommit = useDeferredCommit(async () => {
    if (!enabled()) return;
    const value = getValue();
    const signature = JSON.stringify(value);
    if (signature === lastCommittedRef.current) return;
    try {
      await onCommit(value);
      lastCommittedRef.current = signature;
    } catch {
      // Left unmarked on failure — see doc comment above.
    }
  });

  // Seed the "last committed" snapshot once on mount, from whatever getValue()
  // already reflects (the initial, already-saved data) — so the first no-op
  // edit after mount doesn't PUT.
  useEffect(() => {
    lastCommittedRef.current = JSON.stringify(getValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return requestCommit;
}
