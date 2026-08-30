import { ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export interface CompositionGeneralTabProps {
  name: string;
  onNameChange: (v: string) => void;
  date: string;
  onDateChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  solidCore: boolean;
  onSolidCoreChange: (v: boolean) => void;
  targetWeight: string;
  onTargetWeightChange: (v: string) => void;
  onTargetWeightBlur?: () => void;
  onSubmit: () => void;
}

export function CompositionGeneralTab({
  name,
  onNameChange,
  date,
  onDateChange,
  description,
  onDescriptionChange,
  solidCore,
  onSolidCoreChange,
  targetWeight,
  onTargetWeightChange,
  onTargetWeightBlur,
  onSubmit,
}: CompositionGeneralTabProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="pointer-events-auto flex w-full max-w-[468px] flex-col gap-4 overflow-y-auto rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur-sm [max-height:calc(100vh_-_145px)]"
    >
      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="comp-name" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Name<span className="text-[#dc2626]">*</span>
        </Label>
        <Input
          id="comp-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
          placeholder="Name the composition"
          className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>

      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="comp-date" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Date<span className="text-[#dc2626]">*</span>
        </Label>
        <Input
          id="comp-date"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          required
          className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>

      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="comp-description" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Description<span className="text-[#dc2626]">*</span>
        </Label>
        <Textarea
          id="comp-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          required
          rows={3}
          placeholder="Placeholder"
          className="min-h-[76px] rounded-md border-[#e2e8f0] px-3 py-2 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="comp-solid-core"
            checked={solidCore}
            onCheckedChange={(c) => onSolidCoreChange(Boolean(c))}
            className="size-4 rounded border-[#e2e8f0] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
          />
          <Label htmlFor="comp-solid-core" className="cursor-pointer text-[14px] font-medium text-[#0a0a0a]">
            Solid core
          </Label>
        </div>
        <button
          type="button"
          disabled={!solidCore}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-[#0a0a0a] hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Select material
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="comp-target-weight" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Target weight (kg)
        </Label>
        <Input
          id="comp-target-weight"
          value={targetWeight}
          onChange={(e) => onTargetWeightChange(e.target.value)}
          onBlur={onTargetWeightBlur}
          placeholder="Placeholder"
          className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>
    </form>
  );
}
