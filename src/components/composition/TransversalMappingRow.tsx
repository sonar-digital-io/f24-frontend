import { Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/composition/SelectField';

/** One profile's own boundary spec — a mapping row carries one of these for
 *  its start profile and one for its end profile (matching the backend's
 *  per-profile `start_position`/`start_locked_to`/`end_position`/`end_locked_to`
 *  shape exactly). `lockedTo` is a real intersection id on that profile, or
 *  null ("Unlocked") to fall back to the nearest intersection by position. */
export interface ProfileBoundary {
  startPosition: number | null;
  startLockedTo: number | null;
  endPosition: number | null;
  endLockedTo: number | null;
}

export const EMPTY_BOUNDARY: ProfileBoundary = {
  startPosition: null,
  startLockedTo: null,
  endPosition: null,
  endLockedTo: null,
};

export interface TransversalMapping {
  id: string;
  /** Stable id sent as the backend's `group_id` — generated once, kept across edits. */
  groupId: string;
  name: string;
  layupId: string | null;
  startProfileId: number | null;
  endProfileId: number | null;
  /** Every profile from startProfileId to endProfileId (inclusive, by span
   *  position) gets its own boundary — keyed by profile id. */
  profileBoundaries: Record<number, ProfileBoundary>;
}

/** `mapping.profileBoundaries[profileId]`, or EMPTY_BOUNDARY if that profile
 *  isn't covered (or profileId is null, e.g. a not-yet-selected profile). */
export function getMappingBoundary(
  mapping: TransversalMapping,
  profileId: number | null,
): ProfileBoundary {
  if (profileId == null) return EMPTY_BOUNDARY;
  return mapping.profileBoundaries[profileId] ?? EMPTY_BOUNDARY;
}

interface TransversalMappingRowProps {
  mapping: TransversalMapping;
  layupOptions: { value: string; label: string }[];
  profileOptions: { value: string; label: string }[];
  editingName: boolean;
  onStartEditingName: () => void;
  onStopEditingName: () => void;
  onUpdate: (next: Partial<TransversalMapping>) => void;
  onEditStartProfile: () => void;
  onEditEndProfile: () => void;
  onDelete: () => void;
}

/** One row of the transversal-mapping table — name/layup/start profile/end
 *  profile pick inline; each profile's own boundary (position + locked-to,
 *  drawn on its real cross-section) is edited in TransversalProfileBoundaryPopover. */
export function TransversalMappingRow({
  mapping: m,
  layupOptions,
  profileOptions,
  editingName,
  onStartEditingName,
  onStopEditingName,
  onUpdate,
  onEditStartProfile,
  onEditEndProfile,
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
        <SelectField
          value={m.layupId ?? ''}
          onChange={(v) => onUpdate({ layupId: v })}
          options={layupOptions}
          placeholder="Select layup"
        />
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-2">
          <SelectField
            value={m.startProfileId != null ? String(m.startProfileId) : ''}
            onChange={(v) => onUpdate({ startProfileId: Number(v) })}
            options={profileOptions}
            placeholder="Select profile"
          />
          <button
            type="button"
            onClick={onEditStartProfile}
            disabled={m.startProfileId == null}
            aria-label="Edit start profile boundary"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#eef9ff] text-[#006496] hover:bg-[#dcf1ff] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-2">
          <SelectField
            value={m.endProfileId != null ? String(m.endProfileId) : ''}
            onChange={(v) => onUpdate({ endProfileId: Number(v) })}
            options={profileOptions}
            placeholder="Select profile"
          />
          <button
            type="button"
            onClick={onEditEndProfile}
            disabled={m.endProfileId == null}
            aria-label="Edit end profile boundary"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#eef9ff] text-[#006496] hover:bg-[#dcf1ff] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
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
