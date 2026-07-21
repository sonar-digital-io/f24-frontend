import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'dropdown-buttons',
  fromYear = 2015,
  toYear = 2035,
  ...props
}: CalendarProps) {
  return (
    <div className="rdp-cal">
      {/* Chevron indicator on native select dropdowns */}
      <style>{`
        .rdp-cal .rdp-dropdown_month,
        .rdp-cal .rdp-dropdown_year {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .rdp-cal .rdp-dropdown_month::after,
        .rdp-cal .rdp-dropdown_year::after {
          content: '';
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-size: contain;
          pointer-events: none;
        }
      `}</style>

      <DayPicker
        showOutsideDays={showOutsideDays}
        captionLayout={captionLayout}
        fromYear={fromYear}
        toYear={toYear}
        className={cn('', className)}
        classNames={{
          months: 'flex gap-8',
          month: 'flex flex-col gap-3',
          caption: 'flex items-center h-9 px-0.5',
          caption_label: 'sr-only',
          caption_dropdowns: 'flex items-center gap-1.5',
          dropdown: cn(
            'h-8 cursor-pointer appearance-none rounded-md',
            'border border-[#e5e7eb] bg-white',
            'pl-2.5 pr-7 text-[13px] font-medium text-[#0a0a0a]',
            'outline-none transition-colors hover:border-[#d1d5db]',
            'focus:border-[#d1d5db] focus:outline-none'
          ),
          dropdown_icon: 'sr-only',
          vhidden: 'sr-only',
          nav: 'flex items-center',
          nav_button: cn(
            'flex h-8 w-8 items-center justify-center rounded-md',
            'border border-[#e5e7eb] bg-white text-[#0a0a0a]',
            'opacity-60 transition-opacity hover:opacity-100'
          ),
          nav_button_previous: '',
          nav_button_next: '',
          table: 'w-full border-collapse',
          head_row: 'flex',
          head_cell:
            'flex h-[21px] w-9 items-center justify-center text-[12px] font-normal text-[#737373]',
          row: 'mt-1 flex w-full',
          cell: cn(
            'relative h-9 w-9 p-0 text-center text-[14px]',
            '[&:has([aria-selected])]:bg-[#f5f5f5]',
            'first:[&:has([aria-selected])]:rounded-l-md',
            'last:[&:has([aria-selected])]:rounded-r-md',
            '[&:has([aria-selected].day-range-end)]:rounded-r-md',
            '[&:has([aria-selected].day-outside)]:bg-[#f5f5f5]/50'
          ),
          day: cn(
            'h-9 w-9 rounded-full p-0 text-[14px] font-normal transition-colors',
            'hover:bg-[#f5f5f5] hover:text-[#0a0a0a]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006496]/30',
            'aria-selected:opacity-100'
          ),
          day_selected:
            'rounded-full bg-[#171717] text-white hover:bg-[#171717] hover:text-white focus:bg-[#171717] focus:text-white',
          day_today: 'bg-[#f5f5f5] text-[#171717]',
          day_outside:
            'text-[#9ca3af] opacity-100 aria-selected:bg-[#f5f5f5]/50 aria-selected:text-[#9ca3af] aria-selected:opacity-80',
          day_disabled: 'cursor-not-allowed text-[#d1d5db] opacity-100',
          day_range_middle:
            'aria-selected:rounded-none aria-selected:bg-[#f5f5f5] aria-selected:text-[#171717] aria-selected:hover:bg-[#f5f5f5]',
          day_range_end: 'day-range-end',
          day_hidden: 'invisible',
          ...classNames,
        }}
        components={{
          IconLeft: () => <ChevronLeft className="h-4 w-4" strokeWidth={2} />,
          IconRight: () => <ChevronRight className="h-4 w-4" strokeWidth={2} />,
        }}
        {...props}
      />
    </div>
  );
}
