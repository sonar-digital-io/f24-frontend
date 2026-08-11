import { useState } from 'react';
import { useLoadCases, useUpdateLoadCases } from '@/hooks/api/useLoadGroups';
import { useHydrateOnce } from '@/hooks/useHydrateOnce';
import { loadCaseHasErrors } from '@/lib/loadCaseValidation';
import type { LoadCase } from '@/api/types/loadGroups';

/**
 * Load cases tab state: 0 by default until the user adds one, hydrated from
 * the backend for edit/duplicate, saved via a dedicated PUT
 * /load/:id/load-cases/. Extracted from LoadGroupNew — the fatigue profiles
 * tab also needs the resulting `pickableLoadCases`/`loadCaseNamesById`.
 */
export function useLoadGroupLoadCasesState(loadGroupId: number, isNew: boolean) {
  const loadCasesQuery = useLoadCases(loadGroupId);
  const updateLoadCasesMutation = useUpdateLoadCases(loadGroupId);
  const [loadCases, setLoadCases] = useState<LoadCase[]>([]);

  useHydrateOnce(!isNew && !loadCasesQuery.isFetching && !!loadCasesQuery.data, () => {
    setLoadCases(
      loadCasesQuery.data!.load_cases.map((lc) => ({ ...lc, __KEY__: lc.__KEY__ || crypto.randomUUID() }))
    );
  });

  // A fatigue case's load_case references a load case's backend id — only
  // load cases that have already been saved (and so have one) are pickable.
  const pickableLoadCases = loadCases
    .filter((lc): lc is LoadCase & { id: number } => lc.id !== undefined)
    .map((lc) => ({ id: lc.id, name: lc.name }));
  const loadCaseNamesById = Object.fromEntries(pickableLoadCases.map((lc) => [lc.id, lc.name]));

  function updateLoadCase<K extends keyof LoadCase>(key: string, field: K, val: LoadCase[K]) {
    setLoadCases((prev) => prev.map((c) => (c.__KEY__ === key ? { ...c, [field]: val } : c)));
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
  }

  function deleteLoadCase(key: string) {
    setLoadCases((prev) => prev.filter((c) => c.__KEY__ !== key));
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
  }

  async function handleSaveLoadCases() {
    await updateLoadCasesMutation.mutateAsync({ load_cases: loadCases });
  }

  const loadCasesHaveErrors = loadCases.some(loadCaseHasErrors);

  return {
    loadCases,
    pickableLoadCases,
    loadCaseNamesById,
    updateLoadCase,
    addLoadCase,
    deleteLoadCase,
    duplicateLoadCase,
    handleSaveLoadCases,
    loadCasesHaveErrors,
    updateLoadCasesMutation,
  };
}
