import { useEffect, useRef, useState } from 'react';

/**
 * Defers firing `onCommit` until after the triggering state update (a moved/added/
 * removed point, a field's new value, …) has actually been applied — `requestCommit()`
 * just marks one pending; the effect fires once React has committed the update, so a
 * commit requested mid-update never reads a stale pre-update value. Shared by
 * ProfileDistributionPanel/StackingPanel/ProfilesPanel's identical autosave-after-edit
 * pattern.
 */
export function useDeferredCommit(onCommit: () => void) {
  const [commitTick, setCommitTick] = useState(0);

  useEffect(() => {
    if (commitTick === 0) return;
    onCommit();
    // Deliberately re-runs only on commitTick changes — onCommit reads whatever state
    // is current as of the render that set that tick, not a dep that would refire this
    // on every unrelated re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitTick]);

  return function requestCommit() {
    setCommitTick((t) => t + 1);
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
