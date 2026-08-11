import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { Search } from 'lucide-react';
import { FilterCheckbox } from '@/components/common/list/FilterCheckbox';

interface ColumnFilterPanelProps {
  open: boolean;
  pos: { top: number; left: number } | null;
  dropRef: RefObject<HTMLDivElement>;
  query: string;
  onQueryChange: (query: string) => void;
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onToggleAll: () => void;
  widthClassName?: string;
}

/**
 * Portal-rendered search + select-all + checkbox list for a column filter
 * dropdown. Positioned by the caller (`useColumnFilter`'s `pos`).
 */
export function ColumnFilterPanel({
  open,
  pos,
  dropRef,
  query,
  onQueryChange,
  options,
  selected,
  onToggle,
  onToggleAll,
  widthClassName = 'w-[234px]',
}: ColumnFilterPanelProps) {
  if (!open || !pos) return null;

  const allChecked = options.length > 0 && options.every((o) => selected.has(o));
  const someChecked = options.some((o) => selected.has(o));

  return createPortal(
    <div
      ref={dropRef}
      style={{ top: pos.top, left: pos.left }}
      className={`absolute z-[200] ${widthClassName} overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]`}
    >
      <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-[#9ca3af]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search"
          className="flex-1 rounded bg-transparent text-[14px] text-[#0a0a0a] outline-none placeholder:text-[#9ca3af] focus-visible:ring-2 focus-visible:ring-[#006496]/40"
        />
      </div>
      <button
        type="button"
        onClick={onToggleAll}
        className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-[#f9fafb]"
      >
        <FilterCheckbox checked={allChecked} indeterminate={someChecked && !allChecked} />
        <span className="text-[14px] font-medium text-[#0a0a0a]">Select all</span>
      </button>
      <div className="border-b border-[#e5e7eb]" />
      <div className="overflow-y-auto" style={{ maxHeight: 7 * 40 }}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-[#f9fafb]"
          >
            <FilterCheckbox checked={selected.has(option)} />
            <span className="truncate text-[14px] text-[#0a0a0a]">{option}</span>
          </button>
        ))}
        {options.length === 0 && (
          <p className="px-3 py-4 text-center text-[13px] text-[#9ca3af]">No results</p>
        )}
      </div>
    </div>,
    document.body
  );
}
