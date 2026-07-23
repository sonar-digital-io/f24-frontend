import { useState } from 'react';
import { Copy, Download, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';

interface CardMenuProps {
  onEdit: () => void;
}

export function CardMenu({ onEdit }: CardMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useClickOutside<HTMLDivElement>(open, () => setOpen(false));

  return (
    <div ref={containerRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="More options"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
      >
        <MoreVertical className="h-4 w-4" strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[168px] rounded-lg border border-[#e5e7eb] bg-white py-1 shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.05),0px_10px_15px_-3px_rgba(0,0,0,0.1)]">
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit(); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-[#0a0a0a] hover:bg-[#f9fafb]"
          >
            <Pencil className="h-4 w-4 shrink-0 text-[#6b7280]" strokeWidth={2} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-[#0a0a0a] hover:bg-[#f9fafb]"
          >
            <Download className="h-4 w-4 shrink-0 text-[#6b7280]" strokeWidth={2} />
            Export
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-[#0a0a0a] hover:bg-[#f9fafb]"
          >
            <Copy className="h-4 w-4 shrink-0 text-[#6b7280]" strokeWidth={2} />
            Duplicate
          </button>
          <div className="my-1 border-t border-[#e5e7eb]" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-[#dc2626] hover:bg-[#fee2e2]"
          >
            <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
