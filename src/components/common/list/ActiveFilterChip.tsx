import { FilterChip } from '@/components/common/list/FilterChip';

interface ActiveFilterChipProps {
  label: string;
  selected: Set<string>;
  onClear: () => void;
}

/** "Filtered by <label> <first value> +N" chip with a clear button. */
export function ActiveFilterChip({ label, selected, onClear }: ActiveFilterChipProps) {
  if (selected.size === 0) return null;

  const sorted = [...selected].sort();
  const valueLabel = sorted[0] + (selected.size > 1 ? ` +${selected.size - 1}` : '');

  return <FilterChip label={label} value={valueLabel} onClear={onClear} />;
}
