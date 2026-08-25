import { X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
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
    <div className="flex items-center gap-1 rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-3 py-1.5 text-[13px]">
      <span className="text-[#9ca3af]">{label}</span>
      <span className="font-semibold text-[#0a0a0a]">
        {dateRange.from ? formatDateLabel(dateRange.from) : '…'}
        {' – '}
        {dateRange.to ? formatDateLabel(dateRange.to) : '…'}
      </span>
      <button
        type="button"
        aria-label={`Clear ${label.toLowerCase()} filter`}
        onClick={onClear}
        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[#9ca3af] hover:bg-[#e5e7eb] hover:text-[#0a0a0a]"
      >
        <X className="h-3 w-3" strokeWidth={2.5} />
      </button>
    </div>
  );
}
