import { ChevronDown, ChevronRight, ChevronUp, Copy, GripVertical, Info, Plus, Search, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';
import type { FatigueCase, FatigueProfile } from '@/data/loadGroupForm';

interface LoadGroupFatigueProfilesTabProps {
  fatigueProfiles: FatigueProfile[];
  fatigueSearch: string;
  onFatigueSearchChange: (value: string) => void;
  onAddFatigueProfile: () => void;
  onToggleFatigueProfile: (profileId: string) => void;
  onDuplicateFatigueProfile: (profileId: string) => void;
  onDeleteFatigueProfile: (profileId: string) => void;
  onUpdateFatigueProfileName: (profileId: string, newName: string) => void;
  onAddFatigueCase: (profileId: string) => void;
  onDeleteFatigueCase: (profileId: string, caseId: string) => void;
  onUpdateFatigueCase: <K extends keyof FatigueCase>(
    profileId: string,
    caseId: string,
    field: K,
    val: FatigueCase[K]
  ) => void;
  onPickLoadCase: (profileId: string, caseId: string) => void;
}

export function LoadGroupFatigueProfilesTab({
  fatigueProfiles,
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
            <div key={profile.id} className="border-b border-[#e5e7eb] last:border-b-0">
              {/* Profile accordion header */}
              <div
                className={`flex items-center gap-2 px-6 py-3 ${profile.open ? 'bg-[#f4f4f5]' : 'hover:bg-[#f9fafb]'}`}
              >
                <button
                  type="button"
                  onClick={() => onToggleFatigueProfile(profile.id)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  {profile.open ? (
                    <ChevronUp
                      className="h-4 w-4 shrink-0 text-[#6b7280]"
                      strokeWidth={2}
                    />
                  ) : (
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-[#6b7280]"
                      strokeWidth={2}
                    />
                  )}
                  <span className="text-[14px] font-medium text-[#0a0a0a]">
                    {profile.name}
                  </span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDuplicateFatigueProfile(profile.id)}
                    aria-label="Duplicate profile"
                    className="flex h-7 w-7 items-center justify-center rounded text-[#6b7280] hover:bg-[#e5e7eb] hover:text-[#0a0a0a]"
                  >
                    <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteFatigueProfile(profile.id)}
                    aria-label="Delete profile"
                    className="flex h-7 w-7 items-center justify-center rounded text-[#6b7280] hover:bg-[#fee2e2] hover:text-[#dc2626]"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Expanded content */}
              {profile.open && (
                <div className="border-t border-[#e5e7eb] px-6 py-4">
                  {/* Profile name editable */}
                  <div className="mb-4 flex items-center gap-2">
                    <Label className="text-[13px] font-medium text-[#6b7280]">
                      Profile name
                    </Label>
                    <Input
                      value={profile.name}
                      onChange={(e) =>
                        onUpdateFatigueProfileName(profile.id, e.target.value)
                      }
                      className="h-8 max-w-[240px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                    />
                  </div>

                  {/* Sub-table */}
                  <TooltipProvider>
                  <div className="overflow-hidden rounded-md border border-[#e5e7eb]">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                          <th className="h-9 w-8 px-2" />
                          <th className="h-9 px-3 text-left font-medium text-[#6b7280]">
                            Name
                          </th>
                          <th className="h-9 px-3 text-left font-medium text-[#6b7280]">
                            Load case
                          </th>
                          <th className="h-9 w-[138px] px-3 text-left font-medium text-[#6b7280]">
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              Min scale (%)
                              <Tooltip content="The lower bound of the load scaling factor. The simulation applies at least this percentage of the referenced load case's loads." side="top">
                                <Info className="h-3.5 w-3.5 shrink-0 cursor-default text-[#9ca3af]" strokeWidth={2} />
                              </Tooltip>
                            </div>
                          </th>
                          <th className="h-9 w-[138px] px-3 text-left font-medium text-[#6b7280]">
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              Max scale (%)
                              <Tooltip content="The upper bound of the load scaling factor. The simulation will not exceed this percentage of the referenced load case's loads." side="top">
                                <Info className="h-3.5 w-3.5 shrink-0 cursor-default text-[#9ca3af]" strokeWidth={2} />
                              </Tooltip>
                            </div>
                          </th>
                          <th className="h-9 w-[114px] whitespace-nowrap px-3 text-left font-medium text-[#6b7280]">
                            Time [sec]
                          </th>
                          <th className="h-9 w-[114px] whitespace-nowrap px-3 text-left font-medium text-[#6b7280]">
                            Cycles
                          </th>
                          <th className="h-9 w-8 px-1" />
                        </tr>
                      </thead>
                      <tbody>
                        {profile.cases.map((fc) => (
                          <tr
                            key={fc.id}
                            className="group border-b border-[#e5e7eb] last:border-b-0"
                          >
                            <td className="px-2 py-1.5 text-[#d1d5db]">
                              <GripVertical className="h-4 w-4" strokeWidth={1.5} />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                value={fc.name}
                                onChange={(e) =>
                                  onUpdateFatigueCase(
                                    profile.id,
                                    fc.id,
                                    'name',
                                    e.target.value
                                  )
                                }
                                placeholder="Placeholder"
                                className="h-8 min-w-[140px] rounded border-[#e2e8f0] px-2 text-[13px]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <button
                                type="button"
                                onClick={() => onPickLoadCase(profile.id, fc.id)}
                                className="flex h-8 w-full items-center justify-between gap-1 rounded border border-[#e2e8f0] bg-white px-2 text-[13px] hover:bg-[#f9fafb]"
                              >
                                <span
                                  className={`truncate text-left ${fc.loadCase ? 'text-[#0a0a0a]' : 'text-[#9ca3af]'}`}
                                >
                                  {fc.loadCase || 'Select'}
                                </span>
                                <ChevronRight
                                  className="h-3.5 w-3.5 shrink-0 text-[#6b7280]"
                                  strokeWidth={2}
                                />
                              </button>
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                type="number"
                                value={fc.minScale}
                                onChange={(e) =>
                                  onUpdateFatigueCase(
                                    profile.id,
                                    fc.id,
                                    'minScale',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="h-8 w-full rounded border-[#e2e8f0] px-2 text-[13px]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                type="number"
                                value={fc.maxScale}
                                onChange={(e) =>
                                  onUpdateFatigueCase(
                                    profile.id,
                                    fc.id,
                                    'maxScale',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="h-8 w-full rounded border-[#e2e8f0] px-2 text-[13px]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="group/timetip relative">
                                <Input
                                  type="number"
                                  value={fc.time ?? ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    onUpdateFatigueCase(
                                      profile.id,
                                      fc.id,
                                      'time',
                                      raw === '' ? null : (parseFloat(raw) || 0)
                                    );
                                  }}
                                  disabled={fc.cycles !== null}
                                  className="h-8 w-full rounded border-[#e2e8f0] px-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                {fc.cycles !== null && (
                                  <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[11px] leading-none text-white opacity-0 shadow-sm transition-opacity group-hover/timetip:opacity-100">
                                    Clear the &lsquo;Cycles&rsquo; field to add time
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="group/cyclestip relative">
                                <Input
                                  type="number"
                                  value={fc.cycles ?? ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    onUpdateFatigueCase(
                                      profile.id,
                                      fc.id,
                                      'cycles',
                                      raw === '' ? null : (parseFloat(raw) || 0)
                                    );
                                  }}
                                  disabled={fc.time !== null}
                                  className="h-8 w-full rounded border-[#e2e8f0] px-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                {fc.time !== null && (
                                  <span className="pointer-events-none absolute bottom-full right-0 z-50 mb-1.5 whitespace-nowrap rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[11px] leading-none text-white opacity-0 shadow-sm transition-opacity group-hover/cyclestip:opacity-100">
                                    Clear the &lsquo;Time&rsquo; field to add number of Cycles
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-1 py-1.5">
                              <button
                                type="button"
                                onClick={() => onDeleteFatigueCase(profile.id, fc.id)}
                                aria-label="Delete fatigue case"
                                className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] opacity-0 hover:bg-[#fee2e2] hover:text-[#dc2626] group-hover:opacity-100"
                              >
                                <Trash2 className="h-3 w-3" strokeWidth={2} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {profile.cases.length === 0 && (
                          <tr>
                            <td
                              colSpan={8}
                              className="py-6 text-center text-[13px] text-[#6b7280]"
                            >
                              No fatigue cases. Click "+ Add fatigue case".
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {/* Add fatigue case — same pattern as other tables */}
                    <button
                      type="button"
                      onClick={() => onAddFatigueCase(profile.id)}
                      className="flex w-full items-center justify-center gap-1.5 border-t border-[#e5e7eb] py-2 text-[13px] font-medium text-[#006496] hover:bg-[#f0f9ff]"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Add fatigue case
                    </button>
                  </div>
                  </TooltipProvider>
                </div>
              )}
            </div>
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
