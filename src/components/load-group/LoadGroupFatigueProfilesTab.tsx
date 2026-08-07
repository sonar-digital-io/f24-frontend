import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FatigueProfileAccordionItem } from '@/components/load-group/FatigueProfileAccordionItem';
import type { FatigueCase, FatigueProfile } from '@/api/types/loadGroups';

interface LoadGroupFatigueProfilesTabProps {
  fatigueProfiles: FatigueProfile[];
  /** Accordion open/closed per profile, keyed by __KEY__ — pure UI state. */
  openProfiles: Record<string, boolean>;
  /** Load case names, keyed by backend id, to resolve a fatigue case's `load_case` for display. */
  loadCaseNamesById: Record<number, string>;
  fatigueSearch: string;
  onFatigueSearchChange: (value: string) => void;
  onAddFatigueProfile: () => void;
  onToggleFatigueProfile: (profileKey: string) => void;
  onDuplicateFatigueProfile: (profileKey: string) => void;
  onDeleteFatigueProfile: (profileKey: string) => void;
  onUpdateFatigueProfileName: (profileKey: string, newName: string) => void;
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

export function LoadGroupFatigueProfilesTab({
  fatigueProfiles,
  openProfiles,
  loadCaseNamesById,
  fatigueSearch,
  onFatigueSearchChange,
  onAddFatigueProfile,
  onToggleFatigueProfile,
  onDuplicateFatigueProfile,
  onDeleteFatigueProfile,
  onUpdateFatigueProfileName,
  onAddFatigueCase,
  onDeleteFatigueCase,
  onUpdateFatigueCase,
  onPickLoadCase,
}: LoadGroupFatigueProfilesTabProps) {
  return (
    <div className="flex w-full flex-col gap-0 rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-4 border-b border-[#e5e7eb] px-6 py-4">
        <h3 className="text-[16px] font-semibold text-[#0a0a0a]">Fatigue profiles</h3>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
            <Input
              value={fatigueSearch}
              onChange={(e) => onFatigueSearchChange(e.target.value)}
              placeholder="Search"
              className="h-8 w-[180px] rounded-md border-[#e2e8f0] pl-8 text-[13px]"
            />
          </div>
          <button
            type="button"
            onClick={onAddFatigueProfile}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#006496] px-3 text-[13px] font-medium text-[#fafafa] hover:bg-[#005580]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Add fatigue profile
          </button>
        </div>
      </div>

      {/* Profile list header */}
      <div className="border-b border-[#e5e7eb] px-6 py-2">
        <span className="text-[13px] font-medium text-[#6b7280]">Name ↑</span>
      </div>

      {/* Profiles accordion */}
      <div className="flex flex-col">
        {fatigueProfiles
          .filter(
            (p) =>
              !fatigueSearch.trim() ||
              p.name.toLowerCase().includes(fatigueSearch.toLowerCase())
          )
          .map((profile) => (
            <FatigueProfileAccordionItem
              key={profile.__KEY__}
              profile={profile}
              open={Boolean(openProfiles[profile.__KEY__])}
              loadCaseNamesById={loadCaseNamesById}
              onToggle={() => onToggleFatigueProfile(profile.__KEY__)}
              onDuplicate={() => onDuplicateFatigueProfile(profile.__KEY__)}
              onDelete={() => onDeleteFatigueProfile(profile.__KEY__)}
              onUpdateName={(newName) => onUpdateFatigueProfileName(profile.__KEY__, newName)}
              onAddFatigueCase={onAddFatigueCase}
              onDeleteFatigueCase={onDeleteFatigueCase}
              onUpdateFatigueCase={onUpdateFatigueCase}
              onPickLoadCase={onPickLoadCase}
            />
          ))}

        {fatigueProfiles.length === 0 && (
          <div className="py-12 text-center text-[14px] text-[#6b7280]">
            No fatigue profiles yet. Click "Add fatigue profile".
          </div>
        )}
      </div>
    </div>
  );
}
