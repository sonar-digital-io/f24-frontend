import { useEffect, useState } from 'react';

/**
 * Runs `onReady` exactly once, the first time `ready` becomes true — the
 * "sync backend data into local form state on first load" pattern repeated
 * across every `*New`/`*Edit` page (general fields, duplicate-from-source,
 * nested collections, etc.). Callers compute their own `ready` condition
 * (query loaded, not already hydrated some other way, any extra guard the
 * specific hydration path needs) since those differ per call site — this
 * hook only owns the shared "have we already run" bookkeeping.
 */
export function useHydrateOnce(ready: boolean, onReady: () => void): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (done || !ready) return;
    onReady();
    setDone(true);
    // onReady intentionally not tracked: it's a fresh closure every render,
    // only `ready`/`done` gate the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, ready]);
  return done;
}
