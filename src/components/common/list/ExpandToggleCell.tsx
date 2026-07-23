import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandToggleCellProps {
  expanded: boolean;
  onToggle: () => void;
  controls?: string;
  widthClassName?: string;
}

/** Chevron expand/collapse toggle cell for accordion-style list-table rows. */
export function ExpandToggleCell({
  expanded,
  onToggle,
  controls,
  widthClassName = 'w-[52px]',
}: ExpandToggleCellProps) {
  return (
    <td className={`${widthClassName} px-3 py-4 align-top`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-expanded={expanded}
        aria-controls={controls}
        className="flex h-7 w-7 items-center justify-center rounded text-[#0a0a0a] hover:bg-[#e5e7eb]"
      >
        {expanded ? (
          <ChevronUp className="h-4 w-4" strokeWidth={2} />
        ) : (
          <ChevronDown className="h-4 w-4" strokeWidth={2} />
        )}
      </button>
    </td>
  );
}
