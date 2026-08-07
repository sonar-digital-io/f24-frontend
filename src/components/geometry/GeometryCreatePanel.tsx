import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface GeometryCreatePanelProps {
  isNew: boolean;
  name: string;
  onNameChange: (v: string) => void;
  date: string;
  onDateChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  hasError: boolean;
  onCreate: () => void;
  creating: boolean;
  onUpdate: () => void;
  updating: boolean;
}

/** "Project configuration" tab panel — create-new form, or edit-general form when editing. */
export function GeometryCreatePanel({
  isNew,
  name,
  onNameChange,
  date,
  onDateChange,
  description,
  onDescriptionChange,
  hasError,
  onCreate,
  creating,
  onUpdate,
  updating,
}: GeometryCreatePanelProps) {
  const disabled = !name.trim() || !date || !description.trim();

  return (
    <div className="flex flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
      <div className="flex flex-col gap-1">
        <p className="text-[16px] font-semibold leading-none text-[#0a0a0a]">
          Project configuration
        </p>
        <p className="text-[13px] leading-5 text-[#6b7280]">
          Your selection defines the starting geometry, which can be fully customized in the next steps.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Name<span className="text-[#dc2626]">*</span>
        </Label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Geometry name"
          className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Date<span className="text-[#dc2626]">*</span>
        </Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
          Description<span className="text-[#dc2626]">*</span>
        </Label>
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe the geometry"
          required
          rows={2}
          className="min-h-[60px] rounded-md border-[#e2e8f0] px-3 py-2 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>

      {hasError && (
        <p className="text-[13px] text-[#dc2626]">
          Failed to {isNew ? 'create' : 'update'} geometry. Please try again.
        </p>
      )}

      {isNew ? (
        <div className="flex items-center justify-end gap-2 pt-1">
          <Link
            to="/geometry"
            className="inline-flex h-9 items-center justify-center rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-[14px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={onCreate}
            disabled={disabled || creating}
            className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#006496]"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onUpdate}
            disabled={disabled || updating}
            className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#006496]"
          >
            {updating ? 'Updating…' : 'Update'}
          </button>
        </div>
      )}
    </div>
  );
}
