import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Info, Plus, Trash2, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AirfoilPreview } from '@/components/AirfoilPreview';
import { INITIAL_PROFILES, PROFILE_TYPES, type Profile } from '@/data/profiles';
import { nextLocalId } from '@/lib/utils';
import { BufferedNumberInput } from '@/components/BufferedNumberInput';

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

function Select({ value, onChange, options }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center justify-between rounded-md border border-[#e2e8f0] bg-white px-3 py-1 text-left text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f9fafb]"
      >
        <span>{value}</span>
        <ChevronDown
          className={`h-4 w-4 text-[#6b7280] transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-64 min-w-full overflow-y-auto whitespace-nowrap rounded-md border border-[#e5e7eb] bg-white py-1 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]"
        >
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <li key={opt} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[14px] leading-5 ${
                    selected ? 'bg-[#eef9ff] text-[#171717]' : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                  }`}
                >
                  <span>{opt}</span>
                  {selected && <Check className="h-4 w-4" strokeWidth={2} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface ProfileDetailPopoverProps {
  profile: Profile;
  onChange: (next: Profile) => void;
  onClose: () => void;
  onSort: () => void;
}

function ProfileDetailPopover({ profile, onChange, onClose, onSort }: ProfileDetailPopoverProps) {
  const [pos, setPos] = useState(() => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  }));
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function startDrag(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    function onMove(ev: MouseEvent) {
      if (!dragging.current) return;
      setPos({
        x: dragStart.current.px + ev.clientX - dragStart.current.mx,
        y: dragStart.current.py + ev.clientY - dragStart.current.my,
      });
    }
    function onUp() {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    onChange({ ...profile, [key]: value });
  }

  return (
    <div
      className="pointer-events-none fixed z-40 w-[791px] max-w-[calc(100vw-4rem)]"
      style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
    >
      <div
        className="pointer-events-auto flex flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] select-none"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button, input, textarea, select, [role="listbox"]')) return;
          startDrag(e);
        }}
      >
        {/* Header */}
        <div className="flex cursor-move items-start justify-between gap-4">
          <h2 className="text-[18px] font-semibold leading-7 text-[#0a0a0a]">{profile.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Show 2D checkbox */}
        <div className="flex items-center gap-2">
          <Checkbox
            id={`show-2d-${profile.id}`}
            checked={profile.show2D}
            onCheckedChange={(checked) => update('show2D', Boolean(checked))}
            className="size-4 rounded border-[#e2e8f0] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
          />
          <Label
            htmlFor={`show-2d-${profile.id}`}
            className="cursor-pointer text-[14px] font-medium text-[#0a0a0a]"
          >
            Show 2D
          </Label>
        </div>

        {/* Body: form + airfoil preview */}
        <div className="grid grid-cols-[320px_minmax(0,1fr)] gap-6">
          <div className="flex flex-col gap-4">
            <Field
              label="Name"
              value={profile.name}
              onChange={(v) => update('name', v)}
            />
            <NumberField
              label="Position (relative radius)"
              value={profile.position}
              onCommit={(v) => update('position', v)}
              step="0.0001"
              max={1}
              maxMessage="Max value of position is 1"
              onBlur={onSort}
            />
            <div className="flex flex-col gap-2">
              <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">Type</Label>
              <Select
                value={profile.type}
                onChange={(v) => update('type', v)}
                options={PROFILE_TYPES}
              />
            </div>
            <NumberField
              label="Maximum camber (%)"
              value={profile.maxCamber}
              onCommit={(v) => update('maxCamber', v)}
              step="0.01"
            />
            <NumberField
              label="Maximum camber position"
              value={profile.maxCamberPosition}
              onCommit={(v) => update('maxCamberPosition', v)}
              step="0.000001"
            />
            <NumberField
              label="Thickness (TMC) (%)"
              value={profile.thickness}
              onCommit={(v) => update('thickness', v)}
              step="0.000001"
            />
          </div>

          {/* 2D Airfoil preview */}
          <div className="flex items-center justify-center">
            <AirfoilPreview
              maxCamber={profile.maxCamber}
              maxCamberPosition={profile.maxCamberPosition}
              thickness={profile.thickness}
              className="h-full max-h-[280px] w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}

function Field({ label, value, onChange, type = 'text' }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
      />
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  step?: string;
  max?: number;
  maxMessage?: string;
  onBlur?: () => void;
}

/** Numeric Field with a typing buffer — the field stays clearable mid-edit. */
function NumberField({ label, value, onCommit, step, max, maxMessage, onBlur }: NumberFieldProps) {
  const hasError = max !== undefined && Number.isFinite(value) && value > max;
  return (
    // onBlur on the wrapper bubbles from the input (React blur = focusout), so
    // sort-on-blur fires without clobbering BufferedNumberInput's own onBlur.
    <div className="flex flex-col gap-2" onBlur={onBlur}>
      <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">{label}</Label>
      <BufferedNumberInput
        step={step}
        value={value}
        onCommit={onCommit}
        className={`h-9 rounded-md px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] ${
          hasError ? 'border-[#dc2626] focus-visible:ring-[#dc2626]/30' : 'border-[#e2e8f0]'
        }`}
      />
      {hasError && (
        <p className="text-[12px] leading-4 text-[#dc2626]">
          {maxMessage ?? `Max value is ${max}`}
        </p>
      )}
    </div>
  );
}

const HIDE_BANNER_KEY = 'f24_profiles_mode_hide';

export function ProfilesPanel() {
  const [bannerVisible, setBannerVisible] = useState(
    () => localStorage.getItem(HIDE_BANNER_KEY) !== 'true'
  );
  const [profiles, setProfiles] = useState<Profile[]>(INITIAL_PROFILES);
  const [selectedId, setSelectedId] = useState<string | null>(INITIAL_PROFILES[0]?.id ?? null);

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

        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex h-8 items-center justify-center gap-2 self-start rounded-md border border-[#e2e8f0] bg-white px-3 text-[12px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add new profile
        </button>
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
