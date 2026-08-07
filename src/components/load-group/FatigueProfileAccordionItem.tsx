import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FatigueCaseTable } from '@/components/load-group/FatigueCaseTable';
import type { FatigueCase, FatigueProfile } from '@/api/types/loadGroups';

interface FatigueProfileAccordionItemProps {
  profile: FatigueProfile;
  open: boolean;
  loadCaseNamesById: Record<number, string>;
  onToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUpdateName: (newName: string) => void;
  onAddFatigueCase: (profileKey: string) => void;
  onDeleteFatigueCase: (profileKey: string, caseKey: string) => void;
  onUpdateFatigueCase: <K extends keyof FatigueCase>(
    profileKey: string,
    caseKey: string,
    field: K,
    val: FatigueCase[K]
  ) => void;
  onPickLoadCase: (profileKey: string, caseKey: string) => void;
}

/** One accordion item (header + expanded fatigue-case table) in the fatigue profiles list. */
export function FatigueProfileAccordionItem({
  profile,
  open,
  loadCaseNamesById,
  onToggle,
  onDuplicate,
  onDelete,
  onUpdateName,
  onAddFatigueCase,
  onDeleteFatigueCase,
  onUpdateFatigueCase,
  onPickLoadCase,
}: FatigueProfileAccordionItemProps) {
  return (
    <div className="border-b border-[#e5e7eb] last:border-b-0">
      {/* Profile accordion header */}
      <div className={`flex items-center gap-2 px-6 py-3 ${open ? 'bg-[#f4f4f5]' : 'hover:bg-[#f9fafb]'}`}>
        <button type="button" onClick={onToggle} className="flex flex-1 items-center gap-2 text-left">
          {open ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-[#6b7280]" strokeWidth={2} />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[#6b7280]" strokeWidth={2} />
          )}
          <span className="text-[14px] font-medium text-[#0a0a0a]">{profile.name}</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDuplicate}
            aria-label="Duplicate profile"
            className="flex h-7 w-7 items-center justify-center rounded text-[#6b7280] hover:bg-[#e5e7eb] hover:text-[#0a0a0a]"
          >
            <Copy className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete profile"
            className="flex h-7 w-7 items-center justify-center rounded text-[#6b7280] hover:bg-[#fee2e2] hover:text-[#dc2626]"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-[#e5e7eb] px-6 py-4">
          {/* Profile name editable */}
          <div className="mb-4 flex items-center gap-2">
            <Label className="text-[13px] font-medium text-[#6b7280]">Profile name</Label>
            <Input
              value={profile.name}
              onChange={(e) => onUpdateName(e.target.value)}
              title={profile.name.trim() ? undefined : 'Required.'}
              className="h-8 max-w-[240px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
            />
          </div>

          <FatigueCaseTable
            profileKey={profile.__KEY__}
            fatigueCases={profile.fatigue_cases}
            loadCaseNamesById={loadCaseNamesById}
            onAddFatigueCase={onAddFatigueCase}
            onDeleteFatigueCase={onDeleteFatigueCase}
            onUpdateFatigueCase={onUpdateFatigueCase}
            onPickLoadCase={onPickLoadCase}
          />
        </div>
      )}
    </div>
  );
}
