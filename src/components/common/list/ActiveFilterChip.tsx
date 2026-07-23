import { X } from 'lucide-react';

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

  return (
    <div className="flex items-center gap-1 rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-3 py-1.5 text-[13px]">
      <span className="text-[#9ca3af]">{label}</span>
      <span className="font-semibold text-[#0a0a0a]">{valueLabel}</span>
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
