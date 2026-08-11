import { Check, ChevronDown } from 'lucide-react';
import type { RenderMode } from '@/types';

export interface RenderToggleProps {
  value: RenderMode;
  onChange: (v: RenderMode) => void;
}

/** Solid/wireframe render mode toggle overlaid on a 3D viewport. */
export function RenderToggle({ value, onChange }: RenderToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-[#e5e7eb] bg-white/95 p-1 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm">
      {(['solid', 'wireframe'] as const).map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`inline-flex h-6 items-center gap-1 rounded px-2 text-[12px] font-medium capitalize ${
              active ? 'bg-[#eef9ff] text-[#171717]' : 'text-[#6b7280] hover:bg-[#f1f5f9]'
            }`}
          >
            {active && <Check className="h-3 w-3" strokeWidth={2.5} />}
            {mode}
          </button>
        );
      })}
      <button
        type="button"
        aria-label="Render mode menu"
        className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9]"
      >
        <ChevronDown className="h-3 w-3" strokeWidth={2} />
      </button>
    </div>
  );
}
