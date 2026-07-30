import { useState } from 'react';
import { Info, Plus, Trash2, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { INITIAL_PROFILES, type Profile } from '@/data/profiles';
import { nextLocalId } from '@/lib/utils';
import { ProfileDetailPopover } from '@/components/geometry/ProfileDetailPopover';

const HIDE_BANNER_KEY = 'f24_profiles_mode_hide';

export interface ProfilesPanelProps {
  /** Prefill from the backend (GET /geometry/:id/ nested `profiles`) instead of the mock defaults. */
  initialProfiles?: Profile[];
  /** When provided, a Save button appears that calls this with the current profile list. */
  onSave?: (profiles: Profile[]) => void;
  saving?: boolean;
  saveError?: boolean;
}

export function ProfilesPanel({ initialProfiles, onSave, saving, saveError }: ProfilesPanelProps) {
  const [bannerVisible, setBannerVisible] = useState(
    () => localStorage.getItem(HIDE_BANNER_KEY) !== 'true'
  );
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles ?? INITIAL_PROFILES);
  const [selectedId, setSelectedId] = useState<string | null>(
    (initialProfiles ?? INITIAL_PROFILES)[0]?.id ?? null
  );

  function handleUpdate(next: Profile) {
    setProfiles((current) => current.map((p) => (p.id === next.id ? next : p)));
  }

  function sortByPosition() {
    setProfiles((current) => [...current].sort((a, b) => a.position - b.position));
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setProfiles((current) => current.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function handleAdd() {
    const newProfile: Profile = {
      id: nextLocalId('p'),
      name: `Profile${profiles.length}`,
      position: Math.min(1, (profiles[profiles.length - 1]?.position ?? 0) + 0.1),
      type: 'NACA 4 digit',
      maxCamber: 4,
      maxCamberPosition: 40,
      thickness: 12,
      show2D: true,
    };
    setProfiles((current) => [...current, newProfile]);
    setSelectedId(newProfile.id);
  }

  const selected = profiles.find((p) => p.id === selectedId) ?? null;

  return (
    <>
      {bannerVisible && (
        <div className="mb-2 flex w-full max-w-[404px] flex-col gap-3 rounded-[14px] border border-[#fde68a] bg-[#fffbeb] p-4 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="mt-px h-4 w-4 shrink-0 text-[#d97706]" strokeWidth={2} />
              <div className="flex flex-col gap-1.5">
                <p className="text-[14px] font-semibold leading-5 text-[#0a0a0a]">
                  Independent profiles mode
                </p>
                <p className="text-[13px] leading-5 text-[#6b7280]">
                  Changes made to individual profiles here will not affect the defining curves from
                  the previous step. You are now working on custom, independent sections.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBannerVisible(false)}
              aria-label="Dismiss"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#6b7280] hover:bg-[#fef08a] hover:text-[#0a0a0a]"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="profiles-dont-show"
              onCheckedChange={(checked) => {
                if (checked) {
                  localStorage.setItem(HIDE_BANNER_KEY, 'true');
                  setBannerVisible(false);
                }
              }}
              className="size-4 rounded border-[#d97706] data-[state=checked]:border-[#d97706] data-[state=checked]:bg-[#d97706] shadow-none"
            />
            <Label
              htmlFor="profiles-dont-show"
              className="cursor-pointer text-[13px] leading-none text-[#374151]"
            >
              Don&apos;t show again
            </Label>
          </div>
        </div>
      )}

      <div className="flex w-full max-w-[404px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
        <div className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Profile name</th>
                <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                  <div className="flex flex-col leading-tight">
                    <span>Position</span>
                    <span className="text-[12px] font-normal text-[#9ca3af]">
                      (Relative radius)
                    </span>
                  </div>
                </th>
                <th className="h-10 w-10 px-2" />
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const active = p.id === selectedId;
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    aria-selected={active}
                    className={`cursor-pointer border-b border-[#e5e7eb] last:border-b-0 ${
                      active ? 'bg-[#eef9ff]' : 'hover:bg-[#f9fafb]'
                    }`}
                  >
                    <td className="px-3 py-2 text-[14px] font-medium text-[#0a0a0a]">{p.name}</td>
                    <td className="px-3 py-2 text-[14px] text-[#0a0a0a]">{p.position}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        aria-label={`Delete ${p.name}`}
                        onClick={(e) => handleDelete(p.id, e)}
                        className={`flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9] ${active ? '' : 'invisible'}`}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex h-8 items-center justify-center gap-2 self-start rounded-md border border-[#e2e8f0] bg-white px-3 text-[12px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add new profile
          </button>
          {onSave && (
            <button
              type="button"
              onClick={() => onSave(profiles)}
              disabled={saving}
              className="inline-flex h-8 items-center justify-center rounded-md bg-[#006496] px-3 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
        {saveError && (
          <p className="text-[13px] text-[#dc2626]">Failed to save. Please try again.</p>
        )}
      </div>

      {selected && (
        <ProfileDetailPopover
          profile={selected}
          onChange={handleUpdate}
          onClose={() => { sortByPosition(); setSelectedId(null); }}
          onSort={sortByPosition}
        />
      )}
    </>
  );
}
