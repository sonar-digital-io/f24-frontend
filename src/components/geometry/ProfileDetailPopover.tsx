import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AirfoilPreview } from '@/components/common/AirfoilPreview';
import { PROFILE_TYPES, type Profile } from '@/data/profiles';
import { ProfilesPanelSelect } from '@/components/geometry/ProfilesPanelSelect';
import { Field, NumberField } from '@/components/geometry/ProfileFormFields';

export interface ProfileDetailPopoverProps {
  profile: Profile;
  onChange: (next: Profile) => void;
  onClose: () => void;
  onSort: () => void;
}

/** Draggable floating popover for editing a single profile's parameters. */
export function ProfileDetailPopover({ profile, onChange, onClose, onSort }: ProfileDetailPopoverProps) {
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
              <ProfilesPanelSelect
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
