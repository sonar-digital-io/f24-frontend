import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownSelect } from '@/components/common/form/DropdownSelect';

interface ProfileGeneratorTopRowProps {
  gridClassName: string;
  type: string;
  onTypeChange: (v: string) => void;
  profileTypes: string[];
  profileCount: string;
  onProfileCountChange: (v: string) => void;
  startPos: string;
  onStartPosChange: (v: string) => void;
  endPos: string;
  onEndPosChange: (v: string) => void;
}

/** Type / Profile count / Start position / End position field row. */
export function ProfileGeneratorTopRow({
  gridClassName,
  type,
  onTypeChange,
  profileTypes,
  profileCount,
  onProfileCountChange,
  startPos,
  onStartPosChange,
  endPos,
  onEndPosChange,
}: ProfileGeneratorTopRowProps) {
  return (
    <div className={gridClassName}>
      <div className="flex flex-col gap-2">
        <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">Type</Label>
        <DropdownSelect value={type} onChange={onTypeChange} options={profileTypes} disabled />
      </div>
      <div className="flex flex-col gap-2">
        <div className="group/tip relative flex items-center gap-1.5">
          <Label htmlFor="profile-count" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
            Profile count
          </Label>
          <Info className="h-3.5 w-3.5 shrink-0 text-[#6b7280]" strokeWidth={2} />
          <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-[280px] rounded-md bg-[#171717] px-3 py-2 text-[13px] leading-5 text-white opacity-0 shadow-md transition-opacity group-hover/tip:opacity-100">
            Sets the initial number of generated profiles. You can add, delete, or modify individual profiles in the &apos;Profiles&apos; step.
          </div>
        </div>
        <Input
          id="profile-count"
          value={profileCount}
          onChange={(e) => onProfileCountChange(e.target.value)}
          className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-start-pos" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Start position
        </Label>
        <Input
          id="profile-start-pos"
          value={startPos}
          onChange={(e) => onStartPosChange(e.target.value)}
          className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-end-pos" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          End position
        </Label>
        <Input
          id="profile-end-pos"
          value={endPos}
          onChange={(e) => onEndPosChange(e.target.value)}
          className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>
    </div>
  );
}
