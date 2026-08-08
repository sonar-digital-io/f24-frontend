import { Plus } from 'lucide-react';
import { SparRow } from '@/components/geometry/SparRow';
import type { GeometryProfile } from '@/api/types/geometry';
import type { SparDraft } from '@/hooks/useSparsState';

interface SparsTableProps {
  geometryId: number;
  spars: SparDraft[];
  profiles: GeometryProfile[];
  onAdd: () => void;
  onChange: (localId: string, patch: Partial<SparDraft>) => void;
  onDelete: (localId: string) => void;
  expandedId: string | null;
  onToggleExpand: (localId: string) => void;
}

export function SparsTable({
  geometryId,
  spars,
  profiles,
  onAdd,
  onChange,
  onDelete,
  expandedId,
  onToggleExpand,
}: SparsTableProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#006496] px-3 text-[13px] font-medium text-[#006496] hover:bg-[#eef9ff]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add spar
        </button>
      </div>

      <div className="rounded-[14px] border border-[#e5e7eb] bg-white">
        <div className="grid grid-cols-[28px_1fr_1fr_1fr_1fr_1fr_1fr_72px] gap-2 border-b border-[#e5e7eb] px-2 py-2 text-[12px] font-medium text-[#6b7280]">
          <span />
          <span className="col-span-3 border-r border-[#e5e7eb]">Start profile</span>
          <span className="col-span-3">End profile</span>
        </div>
        <div className="grid grid-cols-[28px_1fr_1fr_1fr_1fr_1fr_1fr_72px] gap-2 border-b border-[#e5e7eb] px-2 py-1.5 text-[11px] font-medium text-[#9ca3af]">
          <span />
          <span>Profile</span>
          <span>Upper-side position</span>
          <span>Lower-side position</span>
          <span>Profile</span>
          <span>Upper-side position</span>
          <span>Lower-side position</span>
          <span />
        </div>

        {spars.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-[#6b7280]">No spars yet.</p>}

        {spars.map((spar) => (
          <SparRow
            key={spar.localId}
            geometryId={geometryId}
            spar={spar}
            profiles={profiles}
            expanded={expandedId === spar.localId}
            onToggleExpand={() => onToggleExpand(spar.localId)}
            onChange={(patch) => onChange(spar.localId, patch)}
            onDelete={() => onDelete(spar.localId)}
          />
        ))}
      </div>
    </div>
  );
}
