import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { SelectField } from '@/components/composition/SelectField';
import { SparProfileChart } from '@/components/geometry/SparProfileChart';
import { useGeometryProfile } from '@/hooks/api/useGeometry';
import { leadingEdgeFraction } from '@/lib/profileGeometry';
import type { GeometryProfile } from '@/api/types/geometry';
import type { SparDraft } from '@/hooks/useSparsState';

function profileLabel(profile: GeometryProfile | undefined): string {
  if (!profile) return 'Select profile';
  return `${profile.name} (${profile.position})`;
}

interface PositionInputProps {
  value: number | null;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (v: number | null) => void;
}

/** A 0..1 position, clamped to [min, max] (that profile's own upper/lower
 *  boundary — see leadingEdgeFraction) on blur, not on every keystroke, so
 *  the field can be cleared/retyped without fighting the clamp. Left blank
 *  (null) until the user sets it — there's no default value. */
function PositionInput({ value, min, max, disabled, onChange }: PositionInputProps) {
  return (
    <input
      type="number"
      step="0.001"
      min={min}
      max={max}
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      onBlur={(e) => {
        if (e.target.value === '') return;
        onChange(Math.min(max, Math.max(min, Number(e.target.value))));
      }}
      className="h-7 w-full min-w-0 rounded-md border border-[#e2e8f0] px-1.5 text-[13px] disabled:cursor-not-allowed disabled:bg-[#f1f5f9]"
    />
  );
}

interface SparEndChartProps {
  geometryId: number;
  profileId: number | null;
  upper: number | null;
  lower: number | null;
  onUpperChange: (v: number) => void;
  onLowerChange: (v: number) => void;
}

function SparEndChart({ geometryId, profileId, upper, lower, onUpperChange, onLowerChange }: SparEndChartProps) {
  const profileQuery = useGeometryProfile(geometryId, profileId ?? NaN);
  if (!profileId) return <p className="text-[13px] text-[#6b7280]">Select a profile first.</p>;
  if (profileQuery.isLoading) return <p className="text-[13px] text-[#6b7280]">Loading profile…</p>;
  if (profileQuery.isError) return <p className="text-[13px] text-[#dc2626]">Failed to load profile.</p>;
  return (
    <SparProfileChart
      points={(profileQuery.data ?? []) as [number, number][]}
      upperPosition={upper}
      lowerPosition={lower}
      onUpperPositionChange={onUpperChange}
      onLowerPositionChange={onLowerChange}
    />
  );
}

interface SparRowProps {
  geometryId: number;
  spar: SparDraft;
  profiles: GeometryProfile[];
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (patch: Partial<SparDraft>) => void;
  onDelete: () => void;
}

export function SparRow({ geometryId, spar, profiles, expanded, onToggleExpand, onChange, onDelete }: SparRowProps) {
  const startProfile = profiles.find((p) => p.id === spar.startProfileId);
  const endProfile = profiles.find((p) => p.id === spar.endProfileId);
  // A spar's two profiles must be different — each picker excludes whatever
  // the other one currently has selected.
  const startProfileOptions = profiles
    .filter((p) => p.id !== spar.endProfileId)
    .map((p) => ({ value: String(p.id), label: profileLabel(p) }));
  const endProfileOptions = profiles
    .filter((p) => p.id !== spar.startProfileId)
    .map((p) => ({ value: String(p.id), label: profileLabel(p) }));

  const startProfileQuery = useGeometryProfile(geometryId, spar.startProfileId ?? NaN);
  const endProfileQuery = useGeometryProfile(geometryId, spar.endProfileId ?? NaN);
  const startBoundary = startProfileQuery.data ? leadingEdgeFraction(startProfileQuery.data as [number, number][]) : 0.5;
  const endBoundary = endProfileQuery.data ? leadingEdgeFraction(endProfileQuery.data as [number, number][]) : 0.5;

  return (
    <div className="border-b border-[#e5e7eb] last:border-b-0">
      <div className="grid grid-cols-[28px_1fr_1fr_1fr_1fr_1fr_1fr_72px] items-center gap-2 px-2 py-2 text-[13px] text-[#0a0a0a]">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={expanded ? 'Collapse spar' : 'Expand spar'}
          className="flex h-6 w-6 items-center justify-center text-[#6b7280] hover:bg-[#f1f5f9]"
        >
          {expanded ? <ChevronDown className="h-4 w-4" strokeWidth={2} /> : <ChevronRight className="h-4 w-4" strokeWidth={2} />}
        </button>
        <span className="truncate">{profileLabel(startProfile)}</span>
        <PositionInput
          value={spar.startUpper}
          min={0}
          max={startBoundary}
          disabled={spar.startProfileId == null}
          onChange={(v) => onChange({ startUpper: v })}
        />
        <PositionInput
          value={spar.startLower}
          min={startBoundary}
          max={1}
          disabled={spar.startProfileId == null}
          onChange={(v) => onChange({ startLower: v })}
        />
        <span className="truncate">{profileLabel(endProfile)}</span>
        <PositionInput
          value={spar.endUpper}
          min={0}
          max={endBoundary}
          disabled={spar.endProfileId == null}
          onChange={(v) => onChange({ endUpper: v })}
        />
        <PositionInput
          value={spar.endLower}
          min={endBoundary}
          max={1}
          disabled={spar.endProfileId == null}
          onChange={(v) => onChange({ endLower: v })}
        />
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label="Edit spar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#006496] hover:bg-[#eef9ff]"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete spar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#6b7280] hover:bg-[#fef2f2] hover:text-[#dc2626]"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 gap-4 border-t border-[#e5e7eb] bg-[#f8fafc] p-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-medium text-[#6b7280]">Start profile</span>
            <SelectField
              value={spar.startProfileId != null ? String(spar.startProfileId) : ''}
              onChange={(v) => onChange({ startProfileId: Number(v) })}
              options={startProfileOptions}
            />
            <SparEndChart
              geometryId={geometryId}
              profileId={spar.startProfileId}
              upper={spar.startUpper}
              lower={spar.startLower}
              onUpperChange={(v) => onChange({ startUpper: v })}
              onLowerChange={(v) => onChange({ startLower: v })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-medium text-[#6b7280]">End profile</span>
            <SelectField
              value={spar.endProfileId != null ? String(spar.endProfileId) : ''}
              onChange={(v) => onChange({ endProfileId: Number(v) })}
              options={endProfileOptions}
            />
            <SparEndChart
              geometryId={geometryId}
              profileId={spar.endProfileId}
              upper={spar.endUpper}
              lower={spar.endLower}
              onUpperChange={(v) => onChange({ endUpper: v })}
              onLowerChange={(v) => onChange({ endLower: v })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
