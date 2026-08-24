import { useRef, useState } from 'react';
import { useFatigueProfiles, useUpdateFatigueProfiles } from '@/hooks/api/useLoadGroups';
import { useHydrateOnce } from '@/hooks/useHydrateOnce';
import { fatigueProfilesHaveErrors } from '@/lib/fatigueValidation';
import type { SaveStatus } from '@/components/common/layout/EditPageToolbarActions';
import type { FatigueCase, FatigueProfile } from '@/api/types/loadGroups';
import { matchSavedRows } from '@/lib/mergeSavedRows';

/**
 * Fatigue profiles tab state: 0 by default until the user adds one, hydrated
 * from the backend for edit/duplicate, autosaved via a dedicated PUT
 * /load/:id/fatigue-profiles/ once focus leaves a field — only while
 * every profile validates (an invalid case just leaves the status at "not
 * saved"). Extracted from LoadGroupNew.
 */
export function useLoadGroupFatigueProfilesState(loadGroupId: number, isNew: boolean) {
  const fatigueProfilesQuery = useFatigueProfiles(loadGroupId);
  const updateFatigueProfilesMutation = useUpdateFatigueProfiles(loadGroupId);
  const [fatigueProfiles, setFatigueProfiles] = useState<FatigueProfile[]>([]);
  // Accordion open/closed — pure UI state, not part of the saved payload.
  const [openFatigueProfiles, setOpenFatigueProfiles] = useState<Record<string, boolean>>({});
  const [fatigueSearch, setFatigueSearch] = useState('');
  const [pickingLoadCase, setPickingLoadCase] = useState<{
    profileKey: string;
    caseKey: string;
  } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<SaveStatus | undefined>(undefined);
  // A save requested while one is already in flight (e.g. a drag-reorder
  // firing mid-autosave) is queued here instead of dropped — flushed once
  // the in-flight save settles.
  const queuedSaveRef = useRef<FatigueProfile[] | null>(null);

  useHydrateOnce(!isNew && !fatigueProfilesQuery.isFetching && !!fatigueProfilesQuery.data, () => {
    const hydratedProfiles = fatigueProfilesQuery.data!.map((p) => ({
      ...p,
      __KEY__: p.__KEY__ || crypto.randomUUID(),
      fatigue_cases: p.fatigue_cases.map((c) => ({
        ...c,
        __KEY__: c.__KEY__ || crypto.randomUUID(),
        cycles: c.cycles ?? null,
      })),
    }));
    setFatigueProfiles(hydratedProfiles);
    setStatus('saved');
  });

  function markDirty() {
    setDirty(true);
    setStatus('not-saved');
  }

  function toggleFatigueProfile(profileKey: string) {
    setOpenFatigueProfiles((prev) => ({ ...prev, [profileKey]: !prev[profileKey] }));
  }

  function addFatigueProfile() {
    const key = crypto.randomUUID();
    setFatigueProfiles((prev) => [...prev, { __KEY__: key, name: 'New fatigue profile', fatigue_cases: [] }]);
    setOpenFatigueProfiles((prev) => ({ ...prev, [key]: true }));
    markDirty();
  }

  function deleteFatigueProfile(profileKey: string) {
    setFatigueProfiles((prev) => prev.filter((p) => p.__KEY__ !== profileKey));
    markDirty();
  }

  function duplicateFatigueProfile(profileKey: string) {
    setFatigueProfiles((prev) => {
      const profile = prev.find((p) => p.__KEY__ === profileKey);
      if (!profile) return prev;
      const clone: FatigueProfile = {
        ...profile,
        __KEY__: crypto.randomUUID(),
        name: `${profile.name} (copy)`,
        fatigue_cases: profile.fatigue_cases.map((c) => ({ ...c, __KEY__: crypto.randomUUID() })),
      };
      return [...prev, clone];
    });
    markDirty();
  }

  function updateFatigueProfileName(profileKey: string, newName: string) {
    setFatigueProfiles((prev) =>
      prev.map((p) => (p.__KEY__ === profileKey ? { ...p, name: newName } : p))
    );
    markDirty();
  }

  function addFatigueCase(profileKey: string) {
    setFatigueProfiles((prev) =>
      prev.map((p) => {
        if (p.__KEY__ !== profileKey) return p;
        const fc: FatigueCase = {
          __KEY__: crypto.randomUUID(),
          name: '',
          load_case: null,
          // Backend requires min_scale > 0.
          min_scale: 1,
          max_scale: 100,
          time: null,
          cycles: null,
        };
        return { ...p, fatigue_cases: [...p.fatigue_cases, fc] };
      })
    );
    markDirty();
  }

  function deleteFatigueCase(profileKey: string, caseKey: string) {
    setFatigueProfiles((prev) =>
      prev.map((p) =>
        p.__KEY__ === profileKey
          ? { ...p, fatigue_cases: p.fatigue_cases.filter((c) => c.__KEY__ !== caseKey) }
          : p
      )
    );
    markDirty();
  }

  // A drop doesn't blur any field, so it saves immediately with the freshly
  // reordered array instead of waiting on the usual onBlur autosave.
  function reorderFatigueCase(profileKey: string, fromIdx: number, toIdx: number) {
    const next = fatigueProfiles.map((p) => {
      if (p.__KEY__ !== profileKey) return p;
      const cases = [...p.fatigue_cases];
      const [moved] = cases.splice(fromIdx, 1);
      cases.splice(toIdx, 0, moved);
      return { ...p, fatigue_cases: cases };
    });
    setFatigueProfiles(next);
    markDirty();
    saveFatigueProfiles(next);
  }

  function updateFatigueCase<K extends keyof FatigueCase>(
    profileKey: string,
    caseKey: string,
    field: K,
    val: FatigueCase[K]
  ) {
    setFatigueProfiles((prev) =>
      prev.map((p) =>
        p.__KEY__ !== profileKey
          ? p
          : {
              ...p,
              fatigue_cases: p.fatigue_cases.map((c) => (c.__KEY__ === caseKey ? { ...c, [field]: val } : c)),
            }
      )
    );
    markDirty();
  }

  async function saveFatigueProfiles(profiles: FatigueProfile[]) {
    if (isNew || fatigueProfilesHaveErrors(profiles)) return;
    if (updateFatigueProfilesMutation.isPending) {
      queuedSaveRef.current = profiles;
      return;
    }
    setStatus('saving');
    try {
      const saved = await updateFatigueProfilesMutation.mutateAsync(profiles);
      // The PUT response carries backend-assigned ids for newly-added
      // profiles/cases — merge them back in, keeping each row's client-side
      // __KEY__ for React identity.
      setFatigueProfiles((prev) =>
        matchSavedRows(saved, prev).map(({ row, matchedPrev }) => ({
          ...row,
          __KEY__: matchedPrev?.__KEY__ || crypto.randomUUID(),
          fatigue_cases: matchSavedRows(row.fatigue_cases, matchedPrev?.fatigue_cases ?? []).map(
            ({ row: c, matchedPrev: matchedCase }) => ({
              ...c,
              __KEY__: matchedCase?.__KEY__ || crypto.randomUUID(),
            })
          ),
        }))
      );
      setDirty(false);
      setStatus('saved');
    } catch {
      setStatus('not-saved');
    } finally {
      if (queuedSaveRef.current) {
        const next = queuedSaveRef.current;
        queuedSaveRef.current = null;
        saveFatigueProfiles(next);
      }
    }
  }

  // Fires when focus leaves a field (blur) or the panel itself (click-out) —
  // triggers autosave. Guarded so it's a no-op when there's nothing to save.
  async function handleFatigueProfilesBlur() {
    if (!dirty) return;
    await saveFatigueProfiles(fatigueProfiles);
  }

  return {
    fatigueProfiles,
    openFatigueProfiles,
    fatigueSearch,
    setFatigueSearch,
    pickingLoadCase,
    setPickingLoadCase,
    toggleFatigueProfile,
    addFatigueProfile,
    deleteFatigueProfile,
    duplicateFatigueProfile,
    updateFatigueProfileName,
    addFatigueCase,
    deleteFatigueCase,
    updateFatigueCase,
    reorderFatigueCase,
    onBlur: handleFatigueProfilesBlur,
    status,
  };
}
