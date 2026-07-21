import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Trash2, X } from 'lucide-react';
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
}

function ProfileDetailPopover({ profile, onChange, onClose }: ProfileDetailPopoverProps) {
  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    onChange({ ...profile, [key]: value });
  }

  return (
    // Floating popover: no overlay, centered horizontally in the canvas area,
    // positioned a bit below the top toolbar so the profiles list (on the left)
    // stays clickable.
    <div className="pointer-events-none fixed left-1/2 top-1/2 z-40 w-[791px] max-w-[calc(100vw-4rem)] -translate-x-1/2 -translate-y-1/2">
      <div className="pointer-events-auto flex flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
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
  step?: string;
}

function Field({ label, value, onChange, type = 'text', step }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">{label}</Label>
      <Input
        type={type}
        step={step}
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
}

/** Numeric Field with a typing buffer — the field stays clearable mid-edit. */
function NumberField({ label, value, onCommit, step }: NumberFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">{label}</Label>
      <BufferedNumberInput
        step={step}
        value={value}
        onCommit={onCommit}
        className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
      />
    </div>
  );
}

export function ProfilesPanel() {
  const [profiles, setProfiles] = useState<Profile[]>(INITIAL_PROFILES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleUpdate(next: Profile) {
    setProfiles((current) => current.map((p) => (p.id === next.id ? next : p)));
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setProfiles((current) => current.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function handleAdd() {
    const nextIdx = profiles.length;
    const newProfile: Profile = {
      id: nextLocalId('p'),
      name: `Profile${nextIdx}`,
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
                    <td className="px-3 py-3 text-[14px] font-medium text-[#0a0a0a]">{p.name}</td>
                    <td className="px-3 py-3 text-[14px] text-[#0a0a0a]">{p.position}</td>
                    <td className="px-2 py-2">
                      {active && (
                        <button
                          type="button"
                          aria-label={`Delete ${p.name}`}
                          onClick={(e) => handleDelete(p.id, e)}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2} />
                        </button>
                      )}
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
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
