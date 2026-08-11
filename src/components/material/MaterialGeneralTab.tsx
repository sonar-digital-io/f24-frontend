import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownSelect as Select } from '@/components/common/form/DropdownSelect';

const MATERIAL_TYPES = [
  'UD ply',
  'Biaxial Ply (±45°)',
  'Consolidated Ply',
  'Hybrid Ply',
  'Random Mat Ply',
  'Surface Ply',
  'Core (PET Foam)',
  'Core (Balsa)',
];

interface MaterialGeneralTabProps {
  name: string;
  onNameChange: (v: string) => void;
  type: string;
  onTypeChange: (v: string) => void;
  date: string;
  onDateChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  /** Fires when focus leaves the form — blurring a field or clicking out. */
  onBlur?: () => void;
}

export function MaterialGeneralTab({
  name,
  onNameChange,
  type,
  onTypeChange,
  date,
  onDateChange,
  description,
  onDescriptionChange,
  onBlur,
}: MaterialGeneralTabProps) {
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      onBlur={onBlur}
      className="flex w-full max-w-[468px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
    >
      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="material-name" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Name<span className="text-[#dc2626]">*</span>
        </Label>
        <Input
          id="material-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="ST-UD-C600-EP"
          required
          className="h-9 rounded-md border-[#e2e8f0] bg-white px-3 py-1 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>

      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="material-type" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Type<span className="text-[#dc2626]">*</span>
        </Label>
        <Select id="material-type" value={type} onChange={onTypeChange} options={MATERIAL_TYPES} />
      </div>

      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="material-date" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Date<span className="text-[#dc2626]">*</span>
        </Label>
        <Input
          id="material-date"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          required
          className="h-9 rounded-md border-[#e2e8f0] bg-white px-3 py-1 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>

      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="material-description" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Description<span className="text-[#dc2626]">*</span>
        </Label>
        <Textarea
          id="material-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Carbon/Epoxy UD lamina. Fiber: Toray T700 (600gsm). Matrix: ST-Epoxy-Standard."
          required
          rows={4}
          className="min-h-[98px] rounded-md border-[#e2e8f0] bg-white px-3 py-2 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>
    </form>
  );
}
