import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface LoadGroupGeneralTabProps {
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
}

export function LoadGroupGeneralTab({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  date,
  onDateChange,
}: LoadGroupGeneralTabProps) {
  return (
    <div className="flex w-full max-w-[468px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="load-group-name"
          className="text-[14px] font-medium leading-none text-[#0a0a0a]"
        >
          Name <span className="text-[#dc2626]">*</span>
        </Label>
        <Input
          id="load-group-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Name the load group"
          className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="load-group-description"
          className="text-[14px] font-medium leading-none text-[#0a0a0a]"
        >
          Description <span className="text-[#dc2626]">*</span>
        </Label>
        <Textarea
          id="load-group-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe the load group"
          rows={4}
          className="rounded-md border-[#e2e8f0] px-3 py-2 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="load-group-date"
          className="text-[14px] font-medium leading-none text-[#0a0a0a]"
        >
          Date<span className="text-[#dc2626]">*</span>
        </Label>
        <Input
          id="load-group-date"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          required
          className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>
    </div>
  );
}
