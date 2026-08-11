import { forwardRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';

interface MaterialDateFilterPopoverProps {
  top: number;
  left: number;
  leftMonth: Date;
  rightMonth: Date;
  dateRange: DateRange | undefined;
  onLeftMonthChange: (month: Date) => void;
  onRightMonthChange: (month: Date) => void;
  onSelect: (range: DateRange | undefined) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

/** "Last updated" date-range popover for the Material list — two side-by-side
 *  month calendars plus prev/next month nav, positioned by the parent. */
export const MaterialDateFilterPopover = forwardRef<HTMLDivElement, MaterialDateFilterPopoverProps>(
  function MaterialDateFilterPopover(
    {
      top,
      left,
      leftMonth,
      rightMonth,
      dateRange,
      onLeftMonthChange,
      onRightMonthChange,
      onSelect,
      onPrevMonth,
      onNextMonth,
    },
    ref
  ) {
    return (
      <div
        ref={ref}
        style={{ top, left }}
        className="absolute z-[200] rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]"
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            aria-label="Previous month"
            onClick={onPrevMonth}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] opacity-60 transition-opacity hover:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>

          <div className="flex gap-6">
            <Calendar
              mode="range"
              numberOfMonths={1}
              month={leftMonth}
              onMonthChange={onLeftMonthChange}
              selected={dateRange}
              onSelect={onSelect}
              captionLayout="dropdown"
            />
            <Calendar
              mode="range"
              numberOfMonths={1}
              month={rightMonth}
              onMonthChange={onRightMonthChange}
              selected={dateRange}
              onSelect={onSelect}
              captionLayout="dropdown"
            />
          </div>

          <button
            type="button"
            aria-label="Next month"
            onClick={onNextMonth}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] opacity-60 transition-opacity hover:opacity-100"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }
);
