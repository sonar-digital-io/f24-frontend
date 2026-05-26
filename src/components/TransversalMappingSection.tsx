import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Pencil, Plus, Redo2, Trash2, Undo2, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AirfoilPreview } from '@/components/AirfoilPreview';
import { INITIAL_PROFILES, type Profile } from '@/data/profiles';
import { LAYUPS } from '@/data/layups';

interface TransversalMapping {
  id: string;
  name: string;
  layupId: string | null;
  startProfileId: string | null;
  endProfileId: string | null;
}

const INITIAL_MAPPINGS: TransversalMapping[] = [
  { id: 'tm-0', name: 'SHELL-REINFORCED', layupId: null, startProfileId: null, endProfileId: null },
];

const LOCK_OPTIONS = ['Unlocked', 'Locked to profile start', 'Locked to profile end'];

/** Reusable dropdown matching the LayupPicker / Select pattern used elsewhere. */
interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  highlight?: boolean;
}

function SelectField({ value, onChange, options, placeholder = 'Select', highlight }: SelectFieldProps) {
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

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-8 w-full items-center justify-between rounded-md border border-[#e2e8f0] px-2 py-1 text-left text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors ${
          highlight && value
            ? 'bg-[#eef9ff] text-[#171717]'
            : 'bg-white text-[#0a0a0a] hover:bg-[#f9fafb]'
        }`}
      >
        <span className={value ? '' : 'text-[#6b7280]'}>{selectedLabel ?? placeholder}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#6b7280] transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-64 min-w-full overflow-y-auto whitespace-nowrap rounded-md border border-[#e5e7eb] bg-white py-1 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]"
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] leading-5 ${
                    selected ? 'bg-[#eef9ff] text-[#171717]' : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {selected && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface ProfileEditorPopoverProps {
  profile: Profile;
  onClose: () => void;
}

function ProfileEditorPopover({ profile, onClose }: ProfileEditorPopoverProps) {
  const [startPosition, setStartPosition] = useState('0.2');
  const [startLockedTo, setStartLockedTo] = useState('Unlocked');
  const [endPosition, setEndPosition] = useState('0.76');
  const [endLockedTo, setEndLockedTo] = useState('Unlocked');
  const [showAllLayups, setShowAllLayups] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="flex w-[300px] flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[16px] font-semibold leading-6 text-[#0a0a0a]">{profile.name}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Undo / Redo */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Undo"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
        >
          <Undo2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Redo"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
        >
          <Redo2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      {/* 2D airfoil preview placeholder.
          User specifically requested NOT to implement the geometric layer
          editing — we render the basic NACA outline only. */}
      <div className="rounded-md border border-[#e5e7eb] bg-[#f8fafc] p-2">
        <AirfoilPreview
          maxCamber={profile.maxCamber}
          maxCamberPosition={profile.maxCamberPosition}
          thickness={profile.thickness}
          className="h-[120px] w-full"
        />
      </div>

      {/* Start / End position + lock-to */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-[12px] font-medium text-[#0a0a0a]">Start position</Label>
          <Input
            type="number"
            step="0.01"
            value={startPosition}
            onChange={(e) => setStartPosition(e.target.value)}
            className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[12px] font-medium text-[#0a0a0a]">Start locked to</Label>
          <SelectField
            value={startLockedTo}
            onChange={setStartLockedTo}
            options={LOCK_OPTIONS.map((o) => ({ value: o, label: o }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[12px] font-medium text-[#0a0a0a]">End position</Label>
          <Input
            type="number"
            step="0.01"
            value={endPosition}
            onChange={(e) => setEndPosition(e.target.value)}
            className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[12px] font-medium text-[#0a0a0a]">End locked to</Label>
          <SelectField
            value={endLockedTo}
            onChange={setEndLockedTo}
            options={LOCK_OPTIONS.map((o) => ({ value: o, label: o }))}
          />
        </div>
      </div>

      {/* Show all layups */}
      <div className="flex items-center gap-2">
        <Checkbox
          id={`show-all-layups-${profile.id}`}
          checked={showAllLayups}
          onCheckedChange={(c) => setShowAllLayups(Boolean(c))}
          className="size-4 rounded border-[#e2e8f0] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
        />
        <Label
          htmlFor={`show-all-layups-${profile.id}`}
          className="cursor-pointer text-[13px] font-medium text-[#0a0a0a]"
        >
          Show all layups
        </Label>
      </div>
    </div>
  );
}

export function TransversalMappingSection() {
  const [mappings, setMappings] = useState<TransversalMapping[]>(INITIAL_MAPPINGS);
  const [editingProfileFor, setEditingProfileFor] = useState<{
    mappingId: string;
    side: 'start' | 'end';
  } | null>(null);

  const layupOptions = LAYUPS.map((l) => ({ value: l.id, label: l.name }));
  const profileOptions = INITIAL_PROFILES.map((p) => ({ value: p.id, label: p.name }));

  function updateMapping(id: string, next: Partial<TransversalMapping>) {
    setMappings((arr) => arr.map((m) => (m.id === id ? { ...m, ...next } : m)));
  }

  function addMapping() {
    setMappings((arr) => [
      ...arr,
      {
        id: `tm-${Date.now()}`,
        name: '',
        layupId: null,
        startProfileId: null,
        endProfileId: null,
      },
    ]);
  }

  function deleteMapping(id: string) {
    setMappings((arr) => arr.filter((m) => m.id !== id));
  }

  // Resolve the currently-edited profile (if any) for the popover
  const editingProfile = (() => {
    if (!editingProfileFor) return null;
    const mapping = mappings.find((m) => m.id === editingProfileFor.mappingId);
    if (!mapping) return null;
    const profileId =
      editingProfileFor.side === 'start' ? mapping.startProfileId : mapping.endProfileId;
    if (!profileId) return null;
    return INITIAL_PROFILES.find((p) => p.id === profileId) ?? null;
  })();

  return (
    <div className="flex flex-col gap-6">
      {/* Top: transversal mapping table */}
      <div className="flex w-full max-w-[830px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#e5e7eb]">
              <th className="h-8 w-[160px] px-2 text-left font-medium text-[#6b7280]">Name</th>
              <th className="h-8 px-2 text-left font-medium text-[#6b7280]">Layup</th>
              <th className="h-8 px-2 text-left font-medium text-[#6b7280]">Start profile</th>
              <th className="h-8 px-2 text-left font-medium text-[#6b7280]">End profile</th>
              <th className="h-8 w-9 px-2" />
            </tr>
          </thead>
          <tbody>
            {mappings.map((m) => {
              const editingThisStart =
                editingProfileFor?.mappingId === m.id && editingProfileFor.side === 'start';
              const editingThisEnd =
                editingProfileFor?.mappingId === m.id && editingProfileFor.side === 'end';
              return (
                <tr key={m.id} className="group border-b border-[#e5e7eb] last:border-b-0">
                  <td className="px-2 py-2">
                    {m.name ? (
                      <span className="inline-flex h-8 items-center rounded-md bg-[#ede9fe] px-2 text-[12px] font-semibold uppercase tracking-wide text-[#5b21b6]">
                        {m.name}
                      </span>
                    ) : (
                      <Input
                        value={m.name}
                        onChange={(e) => updateMapping(m.id, { name: e.target.value })}
                        placeholder="Name"
                        className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                      />
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <SelectField
                      value={m.layupId ?? ''}
                      onChange={(v) => updateMapping(m.id, { layupId: v })}
                      options={layupOptions}
                      highlight
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <SelectField
                        value={m.startProfileId ?? ''}
                        onChange={(v) => updateMapping(m.id, { startProfileId: v })}
                        options={profileOptions}
                        highlight
                      />
                      <button
                        type="button"
                        aria-label="Edit start profile"
                        disabled={!m.startProfileId}
                        onClick={() =>
                          setEditingProfileFor((cur) =>
                            cur?.mappingId === m.id && cur.side === 'start'
                              ? null
                              : { mappingId: m.id, side: 'start' },
                          )
                        }
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:cursor-not-allowed disabled:opacity-40 ${
                          editingThisStart
                            ? 'bg-[#006496] text-[#fafafa] hover:bg-[#005580]'
                            : 'bg-white text-[#6b7280] hover:bg-[#f1f5f9]'
                        }`}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <SelectField
                        value={m.endProfileId ?? ''}
                        onChange={(v) => updateMapping(m.id, { endProfileId: v })}
                        options={profileOptions}
                        highlight
                      />
                      <button
                        type="button"
                        aria-label="Edit end profile"
                        disabled={!m.endProfileId}
                        onClick={() =>
                          setEditingProfileFor((cur) =>
                            cur?.mappingId === m.id && cur.side === 'end'
                              ? null
                              : { mappingId: m.id, side: 'end' },
                          )
                        }
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:cursor-not-allowed disabled:opacity-40 ${
                          editingThisEnd
                            ? 'bg-[#006496] text-[#fafafa] hover:bg-[#005580]'
                            : 'bg-white text-[#6b7280] hover:bg-[#f1f5f9]'
                        }`}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => deleteMapping(m.id)}
                      aria-label="Delete mapping"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b7280] opacity-0 transition-opacity hover:bg-[#fef2f2] hover:text-[#dc2626] group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={addMapping}
          className="inline-flex h-8 items-center gap-2 self-start rounded-md border border-[#e2e8f0] bg-white px-3 text-[12px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add transversal mapping
        </button>
      </div>

      {/* Side-by-side: Profile name list + Editor popover (when open) */}
      <div className="flex flex-row items-start gap-6">
        <div className="flex w-[150px] shrink-0 flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
          <span className="text-[12px] font-medium leading-none text-[#6b7280]">Profile name</span>
          <ul className="flex flex-col gap-2">
            {INITIAL_PROFILES.map((p) => (
              <li key={p.id} className="text-[14px] text-[#0a0a0a]">
                {p.name}
              </li>
            ))}
          </ul>
        </div>

        {editingProfile && (
          <ProfileEditorPopover
            profile={editingProfile}
            onClose={() => setEditingProfileFor(null)}
          />
        )}
      </div>
    </div>
  );
}
