import { useRef, useState } from 'react';
import { useLoadCases, useUpdateLoadCases } from '@/hooks/api/useLoadGroups';
import { useHydrateOnce } from '@/hooks/useHydrateOnce';
import { loadCaseHasErrors } from '@/lib/loadCaseValidation';
import type { SaveStatus } from '@/components/common/layout/EditPageToolbarActions';
import type { LoadCase } from '@/api/types/loadGroups';

/**
 * Load cases tab state: 0 by default until the user adds one, hydrated from
 * the backend for edit/duplicate, autosaved via a dedicated PUT
 * /load/:id/load-cases/ once focus leaves a field (only while every row
 * validates — an invalid row just leaves the save indicator hidden). Extracted
 * from LoadGroupNew — the fatigue profiles tab also needs the resulting
 * `pickableLoadCases`/`loadCaseNamesById`.
 */
export function useLoadGroupLoadCasesState(loadGroupId: number, isNew: boolean) {
  const loadCasesQuery = useLoadCases(loadGroupId);
  const updateLoadCasesMutation = useUpdateLoadCases(loadGroupId);
  const [loadCases, setLoadCases] = useState<LoadCase[]>([]);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<SaveStatus | undefined>(undefined);
  // Refs mirroring the latest state so a blur that arrives while a save is
  // already in flight can be retried afterwards with fresh data, instead of
  // being silently dropped or replayed with a stale snapshot.
  const loadCasesRef = useRef(loadCases);
  loadCasesRef.current = loadCases;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const retryBlurRef = useRef(false);

  useHydrateOnce(!isNew && !loadCasesQuery.isFetching && !!loadCasesQuery.data, () => {
    setLoadCases(
      loadCasesQuery.data!.load_cases.map((lc) => ({
        ...lc,
        __KEY__: lc.__KEY__ || crypto.randomUUID(),
      })),
    );
    setStatus('saved');
  });

  // A fatigue case's load_case references a load case's backend id — only
  // load cases that have already been saved (and so have one) are pickable.
  const pickableLoadCases = loadCases
    .filter((lc): lc is LoadCase & { id: number } => lc.id !== undefined)
    .map((lc) => ({ id: lc.id, name: lc.name }));
  const loadCaseNamesById = Object.fromEntries(pickableLoadCases.map((lc) => [lc.id, lc.name]));

  function markDirty() {
    setDirty(true);
    setStatus(undefined);
  }

  function updateLoadCase<K extends keyof LoadCase>(key: string, field: K, val: LoadCase[K]) {
    setLoadCases((prev) => prev.map((c) => (c.__KEY__ === key ? { ...c, [field]: val } : c)));
    markDirty();
  }

  function addLoadCase() {
    const lc: LoadCase = {
      __KEY__: crypto.randomUUID(),
      name: '',
      // pitch and rpm can't both be 'range' — only one dimension can vary at a time.
      pitch_flag: 'fix',
      pitch_min: 0,
      pitch_max: null,
      rpm_flag: 'range',
      rpm_min: 0,
      rpm_max: 15,
      altitude: 0,
      disa: 0,
      inflow_velocity: 10,
      inflow_angle: 0,
      target_type: 'power',
      target_value: 0,
    };
    setLoadCases((prev) => [...prev, lc]);
    markDirty();
  }

  function deleteLoadCase(key: string) {
    setLoadCases((prev) => prev.filter((c) => c.__KEY__ !== key));
    markDirty();
  }

  function duplicateLoadCase(key: string) {
    setLoadCases((prev) => {
      const idx = prev.findIndex((c) => c.__KEY__ === key);
      if (idx === -1) return prev;
      const src = prev[idx];
      const clone: LoadCase = {
        ...src,
        __KEY__: crypto.randomUUID(),
        name: src.name ? `${src.name} copy` : 'copy',
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
    markDirty();
  }

  // Fires when focus leaves a field (blur) or the table itself (click-out) —
  // triggers autosave. Guarded so it's a no-op when there's nothing to save.
  async function handleLoadCasesBlur() {
    if (updateLoadCasesMutation.isPending) {
      retryBlurRef.current = true;
      return;
    }
    if (isNew || !dirtyRef.current || loadCasesRef.current.some(loadCaseHasErrors)) return;
    setStatus('saving');
    const sent = loadCasesRef.current;
    try {
      const saved = await updateLoadCasesMutation.mutateAsync({ load_cases: sent });
      // Merge in only what the backend actually adds — ids assigned to
      // freshly-created rows (needed by the fatigue profiles tab's load-case
      // picker) — paired to the exact array this save sent, by position (a
      // full-collection PUT echoes rows back in the same order it received
      // them). Applied onto the *latest* state and keyed by __KEY__, which is
      // never regenerated here: reassigning it on every save changes that
      // row's React key, forcing a remount — which is what could steal focus
      // out of a row the user was still editing.
      const idByKey = new Map<string, number>();
      sent.forEach((sentCase, i) => {
        const savedCase = saved.load_cases[i];
        if (savedCase?.id !== undefined) idByKey.set(sentCase.__KEY__, savedCase.id);
      });
      setLoadCases((prev) => prev.map((c) => ({ ...c, id: idByKey.get(c.__KEY__) ?? c.id })));
      setDirty(false);
      setStatus('saved');
    } catch {
      setStatus(undefined);
    } finally {
      if (retryBlurRef.current) {
        retryBlurRef.current = false;
        handleLoadCasesBlur();
      }
    }
  }

  return {
    loadCases,
    pickableLoadCases,
    loadCaseNamesById,
    updateLoadCase,
    addLoadCase,
    deleteLoadCase,
    duplicateLoadCase,
    onBlur: handleLoadCasesBlur,
    status,
  };
}
