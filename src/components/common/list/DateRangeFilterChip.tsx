import type { DateRange } from 'react-day-picker';
import { FilterChip } from '@/components/common/list/FilterChip';
import { formatDateLabel } from '@/lib/utils';

interface DateRangeFilterChipProps {
  label: string;
  dateRange: DateRange | undefined;
  onClear: () => void;
}

/** "<label> <from> – <to>" pill with a clear button, shown next to search when
 *  a date-range column filter is active. */
export function DateRangeFilterChip({ label, dateRange, onClear }: DateRangeFilterChipProps) {
  if (!dateRange?.from && !dateRange?.to) return null;

  return (
    <FilterChip
      label={label}
      value={
        <>
          {dateRange.from ? formatDateLabel(dateRange.from) : '…'}
          {' – '}
          {dateRange.to ? formatDateLabel(dateRange.to) : '…'}
        </>
      }
      onClear={onClear}
    />
  );
}
