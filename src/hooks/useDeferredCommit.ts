import { useEffect, useState } from 'react';

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
