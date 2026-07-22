import { Fragment } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FATIGUE_LOAD_CASES, type FatigueLoadGroup } from '@/data/calculationFatigueLoadGroups';

interface CalculationFatigueProfileTabProps {
  fpSelectedGroup: FatigueLoadGroup | null;
  onGoToLoadGroupTab: () => void;
  fpSearch: string;
  onFpSearchChange: (value: string) => void;
  fpFilteredProfiles: string[];
  fpExpandedProfileNames: Set<string>;
  onToggleProfile: (name: string) => void;
  selectedFatigueProfileName: string | null;
  onSelectProfile: (name: string) => void;
  fpExpandedLCIds: Set<string>;
  onToggleLoadCase: (id: string) => void;
}

export function CalculationFatigueProfileTab({
  fpSelectedGroup,
  onGoToLoadGroupTab,
  fpSearch,
  onFpSearchChange,
  fpFilteredProfiles,
  fpExpandedProfileNames,
  onToggleProfile,
  selectedFatigueProfileName,
  onSelectProfile,
  fpExpandedLCIds,
  onToggleLoadCase,
}: CalculationFatigueProfileTabProps) {
  return (
    <div className="w-full">
      {!fpSelectedGroup ? (
        <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
          <div className="py-12 text-center text-[14px] text-[#6b7280]">
            No load group selected. Go to the{' '}
            <button type="button" onClick={onGoToLoadGroupTab} className="text-[#006496] underline">
              Load group
            </button>{' '}
            tab to select one.
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
          {/* Title row */}
          <div className="border-b border-[#e5e7eb] px-6 py-4">
            <span className="text-[16px] font-semibold text-[#0a0a0a]">{fpSelectedGroup.name}</span>
          </div>
          {/* Search row */}
          <div className="border-b border-[#e5e7eb] px-6 py-3">
            <div className="relative max-w-[340px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
              <Input value={fpSearch} onChange={(e) => onFpSearchChange(e.target.value)} placeholder="Search fatigue profiles" className="h-9 rounded-md border-[#e2e8f0] pl-8 text-[14px]" />
            </div>
          </div>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="h-10 w-[52px]" />
                  <th className="h-10 px-3 text-left">
                    <span className="text-[14px] font-medium leading-5 text-[#6b7280]">Name ↑</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {fpFilteredProfiles.map((profileName) => {
                  const isExpanded = fpExpandedProfileNames.has(profileName);
                  const isSelected = selectedFatigueProfileName === profileName;
                  const lcKey = `${fpSelectedGroup.id}::${profileName}`;
                  const loadCases = FATIGUE_LOAD_CASES[lcKey] ?? [];
                  return (
                    <Fragment key={profileName}>
                      <tr
                        onClick={() => onSelectProfile(profileName)}
                        className={`cursor-pointer border-b border-[#e5e7eb] transition-colors ${isSelected ? 'bg-[#eef9ff] shadow-[inset_2px_0_0_#006496]' : isExpanded ? 'bg-[#f9fafb]' : 'hover:bg-[#f9fafb]'}`}
                      >
                        <td className="w-[52px] px-3 py-4 align-top">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onToggleProfile(profileName); }}
                            className="flex h-7 w-7 items-center justify-center rounded text-[#0a0a0a] hover:bg-[#e5e7eb]"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" strokeWidth={2} /> : <ChevronDown className="h-4 w-4" strokeWidth={2} />}
                          </button>
                        </td>
                        <td className="px-3 py-4 align-top text-[14px] font-medium text-[#0a0a0a]">{profileName}</td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${profileName}-expanded`} className="border-b border-[#e5e7eb]">
                          <td colSpan={2} className={`p-0 ${isSelected ? 'bg-[#f5fbff] shadow-[inset_2px_0_0_#006496]' : 'bg-white'}`}>
                            <div className="px-[52px] py-3">
                              {loadCases.length === 0 ? (
                                <p className="text-[13px] text-[#6b7280]">No load cases configured for this profile.</p>
                              ) : (
                                <div className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
                                  <table className="w-full border-collapse text-[13px]">
                                    <thead>
                                      <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                                        <th className="w-[40px]" />
                                        <th className="px-3 py-2.5 text-left font-medium text-[#6b7280]">Name ↑</th>
                                        <th className="px-3 py-2.5 text-left font-medium text-[#6b7280]">Load case</th>
                                        <th className="w-[110px] px-3 py-2.5 text-left font-medium text-[#6b7280]">Min scale (%)</th>
                                        <th className="w-[110px] px-3 py-2.5 text-left font-medium text-[#6b7280]">Max scale (%)</th>
                                        <th className="w-[100px] px-3 py-2.5 text-left font-medium text-[#6b7280]">Time (sec)</th>
                                        <th className="w-[80px] px-3 py-2.5 text-left font-medium text-[#6b7280]">Cycles</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {loadCases.map((lc) => {
                                        const lcExpanded = fpExpandedLCIds.has(lc.id);
                                        const d = lc.detail;
                                        return (
                                          <Fragment key={lc.id}>
                                            <tr
                                              className={`border-b border-[#e5e7eb] last:border-b-0 ${lcExpanded ? 'bg-[#f9fafb]' : 'hover:bg-[#f9fafb]'}`}
                                            >
                                              <td className="w-[40px] px-2 py-3 align-top">
                                                <button
                                                  type="button"
                                                  onClick={() => onToggleLoadCase(lc.id)}
                                                  className="flex h-6 w-6 items-center justify-center rounded text-[#0a0a0a] hover:bg-[#e5e7eb]"
                                                >
                                                  {lcExpanded ? <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} /> : <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />}
                                                </button>
                                              </td>
                                              <td className="px-3 py-3 align-top font-medium text-[#0a0a0a]">{lc.name}</td>
                                              <td className="px-3 py-3 align-top text-[#6b7280]">{lc.loadCase}</td>
                                              <td className="px-3 py-3 align-top text-[#0a0a0a]">{lc.minScale}</td>
                                              <td className="px-3 py-3 align-top text-[#0a0a0a]">{lc.maxScale}</td>
                                              <td className="px-3 py-3 align-top text-[#0a0a0a]">{lc.time}</td>
                                              <td className="px-3 py-3 align-top text-[#0a0a0a]">{lc.cycles}</td>
                                            </tr>
                                            {lcExpanded && (
                                              <tr key={`${lc.id}-detail`} className="border-b border-[#e5e7eb] last:border-b-0">
                                                <td colSpan={7} className="bg-[#f9fafb] px-10 py-4">
                                                  <div className="grid grid-cols-4 gap-x-[72px] gap-y-1.5 w-fit text-[13px]">
                                                    <div><span className="text-[#6b7280]">Pitch flag: </span><span className="font-medium text-[#0a0a0a]">{d.pitchFlag}</span></div>
                                                    <div><span className="text-[#6b7280]">RPM flag: </span><span className="font-medium text-[#0a0a0a]">{d.rpmFlag}</span></div>
                                                    <div><span className="text-[#6b7280]">Disa: </span><span className="font-medium text-[#0a0a0a]">{d.disa}</span></div>
                                                    <div><span className="text-[#6b7280]">Target type: </span><span className="font-medium text-[#0a0a0a]">{d.targetType}</span></div>
                                                    <div><span className="text-[#6b7280]">Pitch min: </span><span className="font-medium text-[#0a0a0a]">{d.pitchMin}</span></div>
                                                    <div><span className="text-[#6b7280]">RPM min: </span><span className="font-medium text-[#0a0a0a]">{d.rpmMin}</span></div>
                                                    <div><span className="text-[#6b7280]">Inflow velocity: </span><span className="font-medium text-[#0a0a0a]">{d.inflowVelocity}</span></div>
                                                    <div><span className="text-[#6b7280]">Target value: </span><span className="font-medium text-[#0a0a0a]">{d.targetValue}</span></div>
                                                    <div><span className="text-[#6b7280]">Pitch max: </span><span className="font-medium text-[#0a0a0a]">{d.pitchMax}</span></div>
                                                    <div><span className="text-[#6b7280]">RPM max: </span><span className="font-medium text-[#0a0a0a]">{d.rpmMax}</span></div>
                                                    <div><span className="text-[#6b7280]">Inflow angle: </span><span className="font-medium text-[#0a0a0a]">{d.inflowAngle}</span></div>
                                                    <div><span className="text-[#6b7280]">Altitude: </span><span className="font-medium text-[#0a0a0a]">{d.altitude}</span></div>
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
                {fpFilteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-10 text-center text-[14px] text-[#6b7280]">
                      No fatigue profiles match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
