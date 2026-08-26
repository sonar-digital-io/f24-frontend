import { useMemo, useState } from 'react';
import { useLoadGroupList } from '@/hooks/api/useLoadGroups';
import { useUpdateProjectLoad } from '@/hooks/api/useProjects';
import { matchesQuery, paginate, sortItems, toggleSetMember, toggleSort } from '@/lib/listTable';
import { formatDateTime } from '@/lib/utils';
import type { LoadGroup } from '@/api/types/loadGroups';
import type { LoadGroupListItem } from '@/components/calculation/CalculationLoadGroupTab';
import type { SortState, CalcLoadGroupSortKey } from '@/types';

const TAB_PAGE_SIZE = 10;

function toLoadGroupListItem(g: LoadGroup): LoadGroupListItem {
  return {
    id: g.id,
    name: g.name,
    description: g.description ?? '',
    user: g.user ?? '—',
    lastUpdated: formatDateTime(g.last_modified ?? g.created_at),
  };
}

/** Load group tab's search/sort/page state + the group-pick save flow. Extracted from CalculationNew. */
export function useCalculationLoadGroupState(ensureProjectId: (fallbackName?: string) => Promise<string>) {
  const loadGroupsQuery = useLoadGroupList();
  const updateLoadMutation = useUpdateProjectLoad();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [lgSearch, setLgSearch] = useState('');
  const [lgSort, setLgSort] = useState<SortState<CalcLoadGroupSortKey>>({ key: 'last_modified', direction: 'desc' });
  const [lgPage, setLgPage] = useState(1);
  // Which groups' load-case preview is expanded, and within that, which single
  // load case's own value grid is expanded — lets someone look inside a group
  // before committing to selecting it.
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<number>>(new Set());
  const [expandedCaseIds, setExpandedCaseIds] = useState<Set<number>>(new Set());

  function handleToggleGroupPreview(groupId: number) {
    setExpandedGroupIds((prev) => toggleSetMember(prev, groupId));
  }

  function handleToggleCasePreview(caseId: number) {
    setExpandedCaseIds((prev) => toggleSetMember(prev, caseId));
  }

  const loadGroupItems = useMemo(
    () => (loadGroupsQuery.data ?? []).map(toLoadGroupListItem),
    [loadGroupsQuery.data]
  );
  const lgFiltered = useMemo(
    () => loadGroupItems.filter((g) => matchesQuery(lgSearch, [g.name, g.description, g.user])),
    [loadGroupItems, lgSearch]
  );
  const lgSorted = useMemo(
    () => sortItems(lgFiltered, lgSort, (g, key) => (key === 'last_modified' ? g.lastUpdated : g.name)),
    [lgFiltered, lgSort]
  );
  const { totalPages: lgTotalPages, pageRows: lgPageRows } = paginate(lgSorted, lgPage, TAB_PAGE_SIZE);

  function handleLgSearchChange(value: string) {
    setLgSearch(value);
    setLgPage(1);
  }

  function handleLgSort(key: CalcLoadGroupSortKey) {
    setLgSort((prev) => toggleSort(prev, key));
  }

  async function handleSelectGroup(groupId: number) {
    const next = selectedGroupId === groupId ? null : groupId;
    setSelectedGroupId(next);
    if (next === null) return;
    const pid = await ensureProjectId();
    await updateLoadMutation.mutateAsync({ projectId: pid, load_group: next });
  }

  const selectedLoadGroup = selectedGroupId
    ? loadGroupsQuery.data?.find((g) => g.id === selectedGroupId) ?? null
    : null;

  return {
    loadGroupsQuery,
    selectedGroupId,
    lgSearch,
    lgSort,
    lgPage,
    lgPageRows,
    lgTotalPages,
    handleLgSearchChange,
    handleLgSort,
    setLgPage,
    handleSelectGroup,
    selectedLoadGroup,
    expandedGroupIds,
    handleToggleGroupPreview,
    expandedCaseIds,
    handleToggleCasePreview,
  };
}
