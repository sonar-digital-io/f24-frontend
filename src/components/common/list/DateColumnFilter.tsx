import { createPortal } from 'react-dom';
import { Filter } from 'lucide-react';
import { DateRangeFilterPopover } from '@/components/common/list/DateRangeFilterPopover';
import type { useDateFilterPopover } from '@/hooks/useDateFilterPopover';

interface DateColumnFilterProps extends ReturnType<typeof useDateFilterPopover> {
  ariaLabel: string;
}

/** Column-header filter trigger + portal-mounted popover for a "Last updated"
 *  date-range filter — pass through a `useDateFilterPopover()` call's return
 *  value as-is. One instance renders both pieces regardless of where in the
 *  page tree it's placed (the popover teleports to `document.body`). */
export function DateColumnFilter({
  ariaLabel,
  dateRange,
  filterOpen,
  filterPos,
  filterBtnRef,
  popoverRef,
  leftMonth,
  rightMonth,
  setLeftMonth,
  setRightMonth,
  goPrev,
  goNext,
  openFilter,
  handleSelect,
}: DateColumnFilterProps) {
  return (
    <>
      <button
        ref={filterBtnRef}
        type="button"
        aria-label={ariaLabel}
        onClick={openFilter}
        className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#f1f5f9] ${
          dateRange?.from || dateRange?.to ? 'text-[#006496]' : 'text-[#9ca3af]'
        }`}
      >
        <Filter className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      {filterOpen &&
        filterPos &&
        createPortal(
          <DateRangeFilterPopover
            ref={popoverRef}
            top={filterPos.top}
            left={filterPos.left}
            leftMonth={leftMonth}
            rightMonth={rightMonth}
            dateRange={dateRange}
            onLeftMonthChange={setLeftMonth}
            onRightMonthChange={setRightMonth}
            onSelect={handleSelect}
            onPrevMonth={goPrev}
            onNextMonth={goNext}
          />,
          document.body
        )}
    </>
  );
}
