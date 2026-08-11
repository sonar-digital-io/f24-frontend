import { LayoutGrid, List as ListIcon } from 'lucide-react';
import type { ViewMode } from '@/types';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

/** List/grid view switch used by the Composition/Geometry list pages. */
export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-[#e5e7eb] bg-white p-1 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-label="List view"
        aria-pressed={value === 'list'}
        className={`flex h-7 w-7 items-center justify-center rounded ${
          value === 'list' ? 'bg-[#eef9ff] text-[#171717]' : 'text-[#6b7280] hover:bg-[#f1f5f9]'
        }`}
      >
        <ListIcon className="h-4 w-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-label="Grid view"
        aria-pressed={value === 'grid'}
        className={`flex h-7 w-7 items-center justify-center rounded ${
          value === 'grid' ? 'bg-[#eef9ff] text-[#171717]' : 'text-[#6b7280] hover:bg-[#f1f5f9]'
        }`}
      >
        <LayoutGrid className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
