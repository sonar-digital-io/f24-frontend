import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { AirfoilPreview } from '@/components/common/AirfoilPreview';
import { PROFILE_TYPES, UI_TO_API_PROFILE_TYPE, type Profile } from '@/data/profiles';
import { DropdownSelect } from '@/components/common/form/DropdownSelect';
import { DialogHeader } from '@/components/common/dialog/DialogHeader';
import { Field, NumberField } from '@/components/geometry/ProfileFormFields';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useDraggablePosition } from '@/hooks/useDraggablePosition';
import { usePreviewGeometryProfile } from '@/hooks/api/useGeometry';

export interface ProfileDetailPopoverProps {
  geometryId: number;
  profile: Profile;
  onChange: (next: Profile) => void;
  onClose: () => void;
  onSort: () => void;
  /** Fires when focus leaves a field (blur) or the form itself (click-out) — autosaves. */
  onCommit?: () => void;
}

/** Draggable floating popover for editing a single profile's parameters. */
export function ProfileDetailPopover({ geometryId, profile, onChange, onClose, onSort, onCommit }: ProfileDetailPopoverProps) {
  const { pos, startDrag } = useDraggablePosition(() => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  }));

  useEscapeKey(onClose);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    onChange({ ...profile, [key]: value });
  }

  // POST /geometry/:id/profiles/preview/ — re-run whenever any field that
  // affects the airfoil shape changes.
  const previewMutation = usePreviewGeometryProfile();
  useEffect(() => {
    previewMutation.mutate({
      geometryId,
      payload: {
        position: profile.position,
        type: UI_TO_API_PROFILE_TYPE[profile.type] ?? profile.type,
        parameters: [
          { reference: 'max_camber', value: String(profile.maxCamber) },
          { reference: 'max_camber_position', value: String(profile.maxCamberPosition) },
          { reference: 'max_thickness', value: String(profile.thickness) },
        ],
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometryId, profile.position, profile.type, profile.maxCamber, profile.maxCamberPosition, profile.thickness]);

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
        onBlur={onCommit}
      >
        <DialogHeader
          title={profile.name}
          onClose={onClose}
          containerClassName="flex cursor-move items-start justify-between gap-4"
          titleClassName="text-[18px] font-semibold leading-7 text-[#0a0a0a]"
        />

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
              min={0}
              minMessage="Min value of position is 0"
              max={1}
              maxMessage="Max value of position is 1"
              onBlur={onSort}
            />
            <div className="flex flex-col gap-2">
              <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">Type</Label>
              <DropdownSelect
                value={profile.type}
                onChange={(v) => update('type', v)}
                options={PROFILE_TYPES}
              />
            </div>
            <NumberField
              label="Maximum camber (%)"
              value={profile.maxCamber}
              onCommit={(v) => update('maxCamber', v)}
            />
            <NumberField
              label="Maximum camber position"
              value={profile.maxCamberPosition}
              onCommit={(v) => update('maxCamberPosition', v)}
            />
            <NumberField
              label="Thickness (TMC) (%)"
              value={profile.thickness}
              onCommit={(v) => update('thickness', v)}
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
