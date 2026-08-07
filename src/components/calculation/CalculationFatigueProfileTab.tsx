import { Fragment } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SearchInput } from '@/components/common/list/SearchInput';
import { SelectButton } from '@/components/common/list/SelectButton';
import { TableStatusRow } from '@/components/common/list/TableStatusRow';
import type { FatigueProfile, LoadCase } from '@/api/types/loadGroups';

interface CalculationFatigueProfileTabProps {
  hasSelectedGroup: boolean;
  selectedGroupName: string;
  onGoToLoadGroupTab: () => void;
  isLoading: boolean;
  isError: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  /** Fetched directly from GET /load/:id/fatigue-profiles/ — always carries a real `id`. */
  profiles: FatigueProfile[];
  loadCasesById: Record<number, LoadCase>;
  expandedProfileIds: Set<number>;
  onToggleProfile: (id: number) => void;
  selectedProfileId: number | null;
  onSelectProfile: (id: number) => void;
  expandedCaseIds: Set<number>;
  onToggleCase: (id: number) => void;
}

export function CalculationFatigueProfileTab({
  hasSelectedGroup,
  selectedGroupName,
  onGoToLoadGroupTab,
  isLoading,
  isError,
  search,
  onSearchChange,
  profiles,
  loadCasesById,
  expandedProfileIds,
  onToggleProfile,
  selectedProfileId,
  onSelectProfile,
  expandedCaseIds,
  onToggleCase,
}: CalculationFatigueProfileTabProps) {
  if (!hasSelectedGroup) {
    return (
      <div className="w-full">
        <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
          <div className="py-12 text-center text-[14px] text-[#6b7280]">
            No load group selected. Go to the{' '}
            <button type="button" onClick={onGoToLoadGroupTab} className="text-[#006496] underline">
              Load group
            </button>{' '}
            tab to select one.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        {/* Title row */}
        <div className="border-b border-[#e5e7eb] px-6 py-4">
          <span className="text-[16px] font-semibold text-[#0a0a0a]">{selectedGroupName}</span>
        </div>
        {/* Search row */}
        <div className="border-b border-[#e5e7eb] px-6 py-3">
          <SearchInput value={search} onChange={onSearchChange} placeholder="Search fatigue profiles" />
        </div>
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                <th className="h-10 w-[52px]" />
                <th className="h-10 px-3 text-left">
                  <span className="text-[14px] font-medium leading-5 text-[#6b7280]">Name</span>
                </th>
                <th className="h-10 w-[100px]" />
              </tr>
            </thead>
            <tbody>
              {isLoading && <TableStatusRow colSpan={3}>Loading fatigue profiles…</TableStatusRow>}
              {isError && (
                <TableStatusRow colSpan={3} variant="error">
                  Failed to load fatigue profiles from the server.
                </TableStatusRow>
              )}
              {!isLoading &&
                !isError &&
                profiles.map((profile) => {
                  const profileId = profile.id as number;
                  const isExpanded = expandedProfileIds.has(profileId);
                  const isSelected = selectedProfileId === profileId;
                  return (
                    <Fragment key={profileId}>
                      <tr
                        className={`border-b border-[#e5e7eb] transition-colors ${
                          isSelected ? 'bg-[#eef9ff] shadow-[inset_2px_0_0_#006496]' : isExpanded ? 'bg-[#f9fafb]' : 'hover:bg-[#f9fafb]'
                        }`}
                      >
                        <td className="w-[52px] px-3 py-4 align-top">
                          <button
                            type="button"
                            onClick={() => onToggleProfile(profileId)}
                            className="flex h-7 w-7 items-center justify-center rounded text-[#0a0a0a] hover:bg-[#e5e7eb]"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" strokeWidth={2} /> : <ChevronDown className="h-4 w-4" strokeWidth={2} />}
                          </button>
                        </td>
                        <td className="px-3 py-4 align-top text-[14px] font-medium text-[#0a0a0a]">{profile.name}</td>
                        <td className="w-[100px] px-3 py-4 align-top">
                          <SelectButton selected={isSelected} onClick={() => onSelectProfile(profileId)} />
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${profileId}-expanded`} className="border-b border-[#e5e7eb]">
                          <td colSpan={3} className={`p-0 ${isSelected ? 'bg-[#f5fbff] shadow-[inset_2px_0_0_#006496]' : 'bg-white'}`}>
                            <div className="px-[52px] py-3">
                              {profile.fatigue_cases.length === 0 ? (
                                <p className="text-[13px] text-[#6b7280]">No fatigue cases configured for this profile.</p>
                              ) : (
                                <div className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
                                  <table className="w-full border-collapse text-[13px]">
                                    <thead>
                                      <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                                        <th className="w-[40px]" />
                                        <th className="px-3 py-2.5 text-left font-medium text-[#6b7280]">Name</th>
                                        <th className="px-3 py-2.5 text-left font-medium text-[#6b7280]">Load case</th>
                                        <th className="w-[110px] px-3 py-2.5 text-left font-medium text-[#6b7280]">Min scale (%)</th>
                                        <th className="w-[110px] px-3 py-2.5 text-left font-medium text-[#6b7280]">Max scale (%)</th>
                                        <th className="w-[100px] px-3 py-2.5 text-left font-medium text-[#6b7280]">Time (h)</th>
                                        <th className="w-[80px] px-3 py-2.5 text-left font-medium text-[#6b7280]">Cycles</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {profile.fatigue_cases.map((fc) => {
                                        const caseId = fc.id as number;
                                        const lcExpanded = expandedCaseIds.has(caseId);
                                        const loadCase = fc.load_case != null ? loadCasesById[fc.load_case] : undefined;
                                        return (
                                          <Fragment key={caseId}>
                                            <tr className={`border-b border-[#e5e7eb] last:border-b-0 ${lcExpanded ? 'bg-[#f9fafb]' : 'hover:bg-[#f9fafb]'}`}>
                                              <td className="w-[40px] px-2 py-3 align-top">
                                                <button
                                                  type="button"
                                                  onClick={() => onToggleCase(caseId)}
                                                  disabled={!loadCase}
                                                  className="flex h-6 w-6 items-center justify-center rounded text-[#0a0a0a] hover:bg-[#e5e7eb] disabled:cursor-not-allowed disabled:opacity-30"
                                                >
                                                  {lcExpanded ? <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} /> : <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />}
                                                </button>
                                              </td>
                                              <td className="px-3 py-3 align-top font-medium text-[#0a0a0a]">{fc.name}</td>
                                              <td className="px-3 py-3 align-top text-[#6b7280]">{loadCase?.name ?? '—'}</td>
                                              <td className="px-3 py-3 align-top text-[#0a0a0a]">{fc.min_scale}</td>
                                              <td className="px-3 py-3 align-top text-[#0a0a0a]">{fc.max_scale}</td>
                                              <td className="px-3 py-3 align-top text-[#0a0a0a]">{fc.time ?? '—'}</td>
                                              <td className="px-3 py-3 align-top text-[#0a0a0a]">{fc.cycles ?? '—'}</td>
                                            </tr>
                                            {lcExpanded && loadCase && (
                                              <tr key={`${caseId}-detail`} className="border-b border-[#e5e7eb] last:border-b-0">
                                                <td colSpan={7} className="bg-[#f9fafb] px-10 py-4">
                                                  <div className="grid w-fit grid-cols-4 gap-x-[72px] gap-y-1.5 text-[13px]">
                                                    <div><span className="text-[#6b7280]">Pitch flag: </span><span className="font-medium text-[#0a0a0a]">{loadCase.pitch_flag}</span></div>
                                                    <div><span className="text-[#6b7280]">RPM flag: </span><span className="font-medium text-[#0a0a0a]">{loadCase.rpm_flag}</span></div>
                                                    <div><span className="text-[#6b7280]">Disa: </span><span className="font-medium text-[#0a0a0a]">{loadCase.disa}</span></div>
                                                    <div><span className="text-[#6b7280]">Target type: </span><span className="font-medium text-[#0a0a0a]">{loadCase.target_type}</span></div>
                                                    <div><span className="text-[#6b7280]">Pitch min: </span><span className="font-medium text-[#0a0a0a]">{loadCase.pitch_min}</span></div>
                                                    <div><span className="text-[#6b7280]">RPM min: </span><span className="font-medium text-[#0a0a0a]">{loadCase.rpm_min}</span></div>
                                                    <div><span className="text-[#6b7280]">Inflow velocity: </span><span className="font-medium text-[#0a0a0a]">{loadCase.inflow_velocity}</span></div>
                                                    <div><span className="text-[#6b7280]">Target value: </span><span className="font-medium text-[#0a0a0a]">{loadCase.target_value}</span></div>
                                                    <div><span className="text-[#6b7280]">Pitch max: </span><span className="font-medium text-[#0a0a0a]">{loadCase.pitch_max ?? '—'}</span></div>
                                                    <div><span className="text-[#6b7280]">RPM max: </span><span className="font-medium text-[#0a0a0a]">{loadCase.rpm_max ?? '—'}</span></div>
                                                    <div><span className="text-[#6b7280]">Inflow angle: </span><span className="font-medium text-[#0a0a0a]">{loadCase.inflow_angle}</span></div>
                                                    <div><span className="text-[#6b7280]">Altitude: </span><span className="font-medium text-[#0a0a0a]">{loadCase.altitude}</span></div>
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </Fragment>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              {!isLoading && !isError && profiles.length === 0 && (
                <TableStatusRow colSpan={3}>No fatigue profiles match your search.</TableStatusRow>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
