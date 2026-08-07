import { ChevronRight, Spline, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/composition/SelectField';

export interface TransversalMapping {
  id: string;
  name: string;
  layupId: string | null;
  startProfileId: string | null;
  endProfileId: string | null;
  chordStart: number;
  chordEnd: number;
  chordStartLock: string;
  chordEndLock: string;
}

interface TransversalMappingRowProps {
  mapping: TransversalMapping;
  layupLabel: string | undefined;
  profileOptions: { value: string; label: string }[];
  editingName: boolean;
  onStartEditingName: () => void;
  onStopEditingName: () => void;
  onUpdate: (next: Partial<TransversalMapping>) => void;
  onPickLayup: () => void;
  editingStart: boolean;
  editingEnd: boolean;
  onStartProfileChange: (profileId: string) => void;
  onEndProfileChange: (profileId: string) => void;
  onToggleEditStart: () => void;
  onToggleEditEnd: () => void;
  onDelete: () => void;
}

/** One row of the transversal-mapping table. */
export function TransversalMappingRow({
  mapping: m,
  layupLabel,
  profileOptions,
  editingName,
  onStartEditingName,
  onStopEditingName,
  onUpdate,
  onPickLayup,
  editingStart,
  editingEnd,
  onStartProfileChange,
  onEndProfileChange,
  onToggleEditStart,
  onToggleEditEnd,
  onDelete,
}: TransversalMappingRowProps) {
  return (
    <tr className="group border-b border-[#e5e7eb] last:border-b-0">
      <td className="px-2 py-2">
        {m.name && !editingName ? (
          <button
            type="button"
            onClick={onStartEditingName}
            title="Edit name"
            className="inline-flex h-8 items-center rounded-md bg-[#ede9fe] px-2 text-[12px] font-semibold uppercase tracking-wide text-[#5b21b6] hover:bg-[#ddd6fe]"
          >
            {m.name}
          </button>
        ) : (
          <Input
            value={m.name}
            autoFocus={editingName}
            onFocus={onStartEditingName}
            onChange={(e) => onUpdate({ name: e.target.value })}
            onBlur={onStopEditingName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onStopEditingName();
            }}
            placeholder="Name"
            className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          />
        )}
      </td>
      <td className="px-2 py-2">
        <button
          type="button"
          onClick={onPickLayup}
          className={`flex h-8 w-full items-center justify-between gap-2 rounded-md border border-[#e2e8f0] bg-white px-2 py-1 text-left text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f9fafb] ${
            layupLabel ? 'text-[#0a0a0a]' : 'text-[#6b7280]'
          }`}
        >
          <span className="truncate">{layupLabel ?? 'Select'}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#6b7280]" strokeWidth={1.5} />
        </button>
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <SelectField
              value={m.startProfileId ?? ''}
              onChange={onStartProfileChange}
              options={profileOptions}
              highlight={editingStart}
            />
          </div>
          <button
            type="button"
            aria-label="Edit start profile"
            disabled={!m.startProfileId}
            onClick={onToggleEditStart}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:cursor-not-allowed disabled:opacity-40 ${
              editingStart
                ? 'bg-[#006496] text-[#fafafa] hover:bg-[#005580]'
                : 'bg-white text-[#6b7280] hover:bg-[#f1f5f9]'
            }`}
          >
            <Spline className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <SelectField
              value={m.endProfileId ?? ''}
              onChange={onEndProfileChange}
              options={profileOptions}
              highlight={editingEnd}
            />
          </div>
          <button
            type="button"
            aria-label="Edit end profile"
            disabled={!m.endProfileId}
            onClick={onToggleEditEnd}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:cursor-not-allowed disabled:opacity-40 ${
              editingEnd
                ? 'bg-[#006496] text-[#fafafa] hover:bg-[#005580]'
                : 'bg-white text-[#6b7280] hover:bg-[#f1f5f9]'
            }`}
          >
            <Spline className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </td>
      <td className="px-2 py-2">
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete mapping"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b7280] opacity-0 transition-opacity hover:bg-[#fef2f2] hover:text-[#dc2626] group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </td>
    </tr>
  );
}
