import { Fragment } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { LoadCase } from '@/api/types/loadGroups';

interface LoadCasesPreviewListProps {
  loadCases: LoadCase[];
  isLoading: boolean;
  isError: boolean;
  expandedCaseIds: Set<number>;
  onToggleCase: (id: number) => void;
}

/** A load group's load cases, listed by name/target — each further expandable
 *  into its own full value grid. Shared by the Load group list page's row
 *  accordion and the Calculation "Load group" picker's preview accordion. */
export function LoadCasesPreviewList({
  loadCases,
  isLoading,
  isError,
  expandedCaseIds,
  onToggleCase,
}: LoadCasesPreviewListProps) {
  if (isLoading) return <p className="text-[13px] text-[#6b7280]">Loading load cases…</p>;
  if (isError) return <p className="text-[13px] text-[#dc2626]">Failed to load load cases from the server.</p>;
  if (loadCases.length === 0) {
    return <p className="text-[13px] text-[#6b7280]">No load cases configured for this group.</p>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
            <th className="w-[40px]" />
            <th className="px-3 py-2.5 text-left font-medium text-[#6b7280]">Name</th>
            <th className="px-3 py-2.5 text-left font-medium text-[#6b7280]">Target type</th>
            <th className="px-3 py-2.5 text-left font-medium text-[#6b7280]">Target value</th>
          </tr>
        </thead>
        <tbody>
          {loadCases.map((lc) => {
            const caseId = lc.id as number;
            const caseExpanded = expandedCaseIds.has(caseId);
            return (
              <Fragment key={caseId}>
                <tr className={`border-b border-[#e5e7eb] last:border-b-0 ${caseExpanded ? 'bg-[#f9fafb]' : 'hover:bg-[#f9fafb]'}`}>
                  <td className="w-[40px] px-2 py-3 align-top">
                    <button
                      type="button"
                      onClick={() => onToggleCase(caseId)}
                      aria-expanded={caseExpanded}
                      className="flex h-6 w-6 items-center justify-center rounded text-[#0a0a0a] hover:bg-[#e5e7eb]"
                    >
                      {caseExpanded ? <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} /> : <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />}
                    </button>
                  </td>
                  <td className="px-3 py-3 align-top font-medium text-[#0a0a0a]">{lc.name}</td>
                  <td className="px-3 py-3 align-top text-[#0a0a0a]">{lc.target_type}</td>
                  <td className="px-3 py-3 align-top text-[#0a0a0a]">{lc.target_value}</td>
                </tr>
                {caseExpanded && (
                  <tr className="border-b border-[#e5e7eb] last:border-b-0">
                    <td colSpan={4} className="bg-[#f9fafb] px-10 py-4">
                      <div className="grid w-fit grid-cols-4 gap-x-[72px] gap-y-1.5 text-[13px]">
                        <div><span className="text-[#6b7280]">Pitch flag: </span><span className="font-medium text-[#0a0a0a]">{lc.pitch_flag}</span></div>
                        <div><span className="text-[#6b7280]">RPM flag: </span><span className="font-medium text-[#0a0a0a]">{lc.rpm_flag}</span></div>
                        <div><span className="text-[#6b7280]">Disa: </span><span className="font-medium text-[#0a0a0a]">{lc.disa}</span></div>
                        <div><span className="text-[#6b7280]">Altitude: </span><span className="font-medium text-[#0a0a0a]">{lc.altitude}</span></div>
                        <div><span className="text-[#6b7280]">Pitch min: </span><span className="font-medium text-[#0a0a0a]">{lc.pitch_min}</span></div>
                        <div><span className="text-[#6b7280]">RPM min: </span><span className="font-medium text-[#0a0a0a]">{lc.rpm_min}</span></div>
                        <div><span className="text-[#6b7280]">Inflow velocity: </span><span className="font-medium text-[#0a0a0a]">{lc.inflow_velocity}</span></div>
                        <div><span className="text-[#6b7280]">Inflow angle: </span><span className="font-medium text-[#0a0a0a]">{lc.inflow_angle}</span></div>
                        <div><span className="text-[#6b7280]">Pitch max: </span><span className="font-medium text-[#0a0a0a]">{lc.pitch_max ?? '—'}</span></div>
                        <div><span className="text-[#6b7280]">RPM max: </span><span className="font-medium text-[#0a0a0a]">{lc.rpm_max ?? '—'}</span></div>
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
  );
}
