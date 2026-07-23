import { useState } from 'react';
import { X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AirfoilPreview } from '@/components/common/AirfoilPreview';
import { SelectField } from '@/components/composition/SelectField';
import type { Profile } from '@/data/profiles';
import { useEscapeKey } from '@/hooks/useEscapeKey';

const LOCK_OPTIONS = ['Unlocked', 'Locked to profile start', 'Locked to profile end'];

export interface ProfileEditorPopoverProps {
  profile: Profile;
  startPosition: number;
  endPosition: number;
  startLockedTo: string;
  endLockedTo: string;
  onStartChange: (v: number) => void;
  onEndChange: (v: number) => void;
  onStartLockedToChange: (v: string) => void;
  onEndLockedToChange: (v: string) => void;
  onClose: () => void;
}

export function ProfileEditorPopover({
  profile,
  startPosition,
  endPosition,
  startLockedTo,
  endLockedTo,
  onStartChange,
  onEndChange,
  onStartLockedToChange,
  onEndLockedToChange,
  onClose,
}: ProfileEditorPopoverProps) {
  const [showAllLayups, setShowAllLayups] = useState(false);

  useEscapeKey(onClose);

  return (
    <div className="flex w-[560px] flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
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

      {/* 2D airfoil preview placeholder.
          User specifically requested NOT to implement the geometric layer
          editing — we render the basic NACA outline only. */}
      <div className="rounded-md border border-[#e5e7eb] bg-[#f8fafc] p-2">
        <AirfoilPreview
          maxCamber={profile.maxCamber}
          maxCamberPosition={profile.maxCamberPosition}
          thickness={profile.thickness}
          className="h-[140px] w-full"
          startPosition={startPosition}
          endPosition={endPosition}
          onStartChange={onStartChange}
          onEndChange={onEndChange}
        />
      </div>

      {/* Start / End position + lock-to */}
      <div className="grid grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-[12px] font-medium text-[#0a0a0a]">Start position</Label>
          <Input
            type="number"
            step="0.01"
            value={startPosition}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onStartChange(Math.max(-1, Math.min(1, v)));
            }}
            className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[12px] font-medium text-[#0a0a0a]">Start locked to</Label>
          <SelectField
            value={startLockedTo}
            onChange={onStartLockedToChange}
            options={LOCK_OPTIONS.map((o) => ({ value: o, label: o }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[12px] font-medium text-[#0a0a0a]">End position</Label>
          <Input
            type="number"
            step="0.01"
            value={endPosition}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onEndChange(Math.max(-1, Math.min(1, v)));
            }}
            className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[12px] font-medium text-[#0a0a0a]">End locked to</Label>
          <SelectField
            value={endLockedTo}
            onChange={onEndLockedToChange}
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
