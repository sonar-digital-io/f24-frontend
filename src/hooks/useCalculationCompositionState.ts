import { useMemo, useState } from 'react';
import { useCompositionList } from '@/hooks/api/useComposition';
import { useUpdateProjectComposition } from '@/hooks/api/useProjects';
import { matchesQuery, paginate, sortItems, toggleSort } from '@/lib/listTable';
import { formatDateTime } from '@/lib/utils';
import type { Composition } from '@/api/types/composition';
import type { CompositionListItem } from '@/components/calculation/CalculationCompositionTab';
import type { SortState, CalcCompositionSortKey } from '@/types';

const TAB_PAGE_SIZE = 10;

function toCompositionListItem(c: Composition): CompositionListItem {
  const targetWeight = c.settings?.find((s) => s.reference === 'target_weight')?.value;
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? '',
    type: '—',
    targetWeight: targetWeight != null ? String(targetWeight) : '—',
    user: c.user ?? '—',
    lastUpdated: formatDateTime(c.last_modified),
  };
}

/** Composition tab's search/sort/page state + the composition-pick save flow. Extracted from CalculationNew. */
export function useCalculationCompositionState(ensureProjectId: (fallbackName?: string) => Promise<string>) {
  const compositionsQuery = useCompositionList();
  const updateCompositionMutation = useUpdateProjectComposition();
  const [selectedCompositionId, setSelectedCompositionId] = useState<number | null>(null);
  const [compSearch, setCompSearch] = useState('');
  const [compSort, setCompSort] = useState<SortState<CalcCompositionSortKey>>({ key: 'name', direction: 'asc' });
  const [compPage, setCompPage] = useState(1);

  const compositionItems = useMemo(
    () => (compositionsQuery.data ?? []).map(toCompositionListItem),
    [compositionsQuery.data]
  );
  const compFiltered = useMemo(
    () => compositionItems.filter((c) => matchesQuery(compSearch, [c.name, c.description])),
    [compositionItems, compSearch]
  );
  const compSorted = useMemo(
    () => sortItems(compFiltered, compSort, (c, key) => (key === 'last_modified' ? c.lastUpdated : c.name)),
    [compFiltered, compSort]
  );
  const { totalPages: compTotalPages, pageRows: compPageRows } = paginate(compSorted, compPage, TAB_PAGE_SIZE);

  function handleCompSearchChange(value: string) {
    setCompSearch(value);
    setCompPage(1);
  }

  function handleCompSort(key: CalcCompositionSortKey) {
    setCompSort((prev) => toggleSort(prev, key));
  }

  async function handleSelectComposition(compositionId: number) {
    const next = selectedCompositionId === compositionId ? null : compositionId;
    setSelectedCompositionId(next);
    if (next === null) return;
    const pid = await ensureProjectId();
    await updateCompositionMutation.mutateAsync({ projectId: pid, composition: next });
  }

  return {
    compositionsQuery,
    selectedCompositionId,
    compSearch,
    compSort,
    compPage,
    compPageRows,
    compTotalPages,
    handleCompSearchChange,
    handleCompSort,
    setCompPage,
    handleSelectComposition,
  };
}
