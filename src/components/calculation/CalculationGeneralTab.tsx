import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CalculationGeneralTabProps {
  name: string;
  onNameChange: (value: string) => void;
  analysisMethod: string;
  onAnalysisMethodChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
}

export function CalculationGeneralTab({
  name,
  onNameChange,
  analysisMethod,
  onAnalysisMethodChange,
  description,
  onDescriptionChange,
}: CalculationGeneralTabProps) {
  return (
    <div className="flex w-full max-w-[468px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="calculation-name"
          className="text-[14px] font-medium leading-none text-[#0a0a0a]"
        >
          Name <span className="text-[#dc2626]">*</span>
        </Label>
        <Input
          id="calculation-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Name the calculation"
          className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="calculation-analysis-method"
          className="text-[14px] font-medium leading-none text-[#0a0a0a]"
        >
          Analysis method <span className="text-[#dc2626]">*</span>
        </Label>
        <div className="relative">
          <select
            id="calculation-analysis-method"
            value={analysisMethod}
            onChange={(e) => onAnalysisMethodChange(e.target.value)}
            className={`h-9 w-full appearance-none rounded-md border border-[#e2e8f0] bg-white px-3 pr-8 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-[#006496]/30 ${analysisMethod === '' ? 'text-[#9ca3af]' : 'text-[#0a0a0a]'}`}
          >
            <option value="" disabled>Select</option>
            <option>Aero only</option>
            <option>Modal</option>
            <option>Modal (RPM)</option>
            <option>Modal (RPM &amp; Aero)</option>
            <option>Static structural (RPM)</option>
            <option>Static structural (RPM &amp; Aero)</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"
            strokeWidth={2}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="calculation-description"
          className="text-[14px] font-medium leading-none text-[#0a0a0a]"
        >
          Description <span className="text-[#dc2626]">*</span>
        </Label>
        <Textarea
          id="calculation-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe the calculation"
          rows={4}
          className="rounded-md border-[#e2e8f0] px-3 py-2 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>
    </div>
  );
}
