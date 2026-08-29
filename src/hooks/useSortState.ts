import { useState } from 'react';
import type { SortState } from '@/types';
import { toggleSort } from '@/lib/listTable';

/**
 * List-page column sort state — every list page (Material/Geometry/Composition/
 * LoadGroup/Calculation) owns one `SortState<K>` and toggles it the same way
 * on header click (same key again -> flip direction, new key -> ascending).
 */
export function useSortState<K extends string>(initial: SortState<K>) {
  const [sort, setSort] = useState<SortState<K>>(initial);

  function handleSort(key: K) {
    setSort((prev) => toggleSort(prev, key));
  }

  return { sort, handleSort };
}
