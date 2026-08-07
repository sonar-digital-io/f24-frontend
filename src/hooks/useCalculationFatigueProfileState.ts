import { useEffect, useMemo, useState } from 'react';
import { useFatigueProfiles, useLoadCases } from '@/hooks/api/useLoadGroups';
import { useUpdateProjectFatigue } from '@/hooks/api/useProjects';
import { matchesQuery, toggleSetMember } from '@/lib/listTable';
import type { LoadCase } from '@/api/types/loadGroups';

/** Fatigue profile tab's state + the profile-pick save flow. Extracted from CalculationNew. */
export function useCalculationFatigueProfileState(
  selectedGroupId: number | null,
  ensureProjectId: (fallbackName?: string) => Promise<string>,
) {
  const fatigueProfilesQuery = useFatigueProfiles(selectedGroupId ?? NaN);
  const loadCasesQuery = useLoadCases(selectedGroupId ?? NaN);
  const updateFatigueMutation = useUpdateProjectFatigue();
  const [fpSearch, setFpSearch] = useState('');
  const [expandedProfileIds, setExpandedProfileIds] = useState<Set<number>>(new Set());
  const [expandedCaseIds, setExpandedCaseIds] = useState<Set<number>>(new Set());
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);

  // Selecting a different load group invalidates whatever fatigue profile
  // was picked/expanded for the previous one.
  useEffect(() => {
    setFpSearch('');
    setExpandedProfileIds(new Set());
    setExpandedCaseIds(new Set());
    setSelectedProfileId(null);
  }, [selectedGroupId]);

  const loadCasesById = useMemo(() => {
    const map: Record<number, LoadCase> = {};
    for (const lc of loadCasesQuery.data?.load_cases ?? []) {
      if (lc.id !== undefined) map[lc.id] = lc;
    }
    return map;
  }, [loadCasesQuery.data]);

  const fpFilteredProfiles = useMemo(() => {
    const all = fatigueProfilesQuery.data ?? [];
    if (!fpSearch.trim()) return all;
    return all.filter((p) => matchesQuery(fpSearch, [p.name]));
  }, [fatigueProfilesQuery.data, fpSearch]);

  function toggleFPProfile(id: number) {
    setExpandedProfileIds((prev) => toggleSetMember(prev, id));
  }

  function toggleFPCase(id: number) {
    setExpandedCaseIds((prev) => toggleSetMember(prev, id));
  }

  async function handleSelectFatigueProfile(profileId: number) {
    const next = selectedProfileId === profileId ? null : profileId;
    setSelectedProfileId(next);
    if (next === null) return;
    const pid = await ensureProjectId();
    await updateFatigueMutation.mutateAsync({ projectId: pid, fatigue_profile: next });
  }

  return {
    fatigueProfilesQuery,
    loadCasesQuery,
    fpSearch,
    setFpSearch,
    expandedProfileIds,
    expandedCaseIds,
    selectedProfileId,
    loadCasesById,
    fpFilteredProfiles,
    toggleFPProfile,
    toggleFPCase,
    handleSelectFatigueProfile,
  };
}
