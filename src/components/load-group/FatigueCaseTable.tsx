import { ChevronRight, GripVertical, Info, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';
import { BufferedNumberInput } from '@/components/common/BufferedNumberInput';
import { validateFatigueCase } from '@/lib/fatigueValidation';
import type { FatigueCase } from '@/api/types/loadGroups';

interface FatigueCaseTableProps {
  profileKey: string;
  fatigueCases: FatigueCase[];
  loadCaseNamesById: Record<number, string>;
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

/** The fatigue-case sub-table inside an expanded fatigue-profile accordion item. */
export function FatigueCaseTable({
  profileKey,
  fatigueCases,
  loadCaseNamesById,
  onAddFatigueCase,
  onDeleteFatigueCase,
  onUpdateFatigueCase,
  onPickLoadCase,
}: FatigueCaseTableProps) {
  return (
    <TooltipProvider>
      <div className="overflow-hidden rounded-md border border-[#e5e7eb]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
              <th className="h-9 w-8 px-2" />
              <th className="h-9 px-3 text-left font-medium text-[#6b7280]">Name</th>
              <th className="h-9 px-3 text-left font-medium text-[#6b7280]">Load case</th>
              <th className="h-9 w-[138px] px-3 text-left font-medium text-[#6b7280]">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  Min scale (%)
                  <Tooltip content="100 >= Max scale >= Min scale > 0 required" side="top">
                    <Info className="h-3.5 w-3.5 shrink-0 cursor-default text-[#9ca3af]" strokeWidth={2} />
                  </Tooltip>
                </div>
              </th>
              <th className="h-9 w-[138px] px-3 text-left font-medium text-[#6b7280]">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  Max scale (%)
                  <Tooltip content="100 >= Max scale >= Min scale > 0 required" side="top">
                    <Info className="h-3.5 w-3.5 shrink-0 cursor-default text-[#9ca3af]" strokeWidth={2} />
                  </Tooltip>
                </div>
              </th>
              <th className="h-9 w-[114px] whitespace-nowrap px-3 text-left font-medium text-[#6b7280]">
                Time (h)
              </th>
              <th className="h-9 w-[114px] whitespace-nowrap px-3 text-left font-medium text-[#6b7280]">
                Cycles
              </th>
              <th className="h-9 w-8 px-1" />
            </tr>
          </thead>
          <tbody>
            {fatigueCases.map((fc) => {
              const errors = validateFatigueCase(fc);
              return (
                <tr key={fc.__KEY__} className="group border-b border-[#e5e7eb] last:border-b-0">
                  <td className="px-2 py-1.5 text-[#d1d5db]">
                    <GripVertical className="h-4 w-4" strokeWidth={1.5} />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={fc.name}
                      onChange={(e) => onUpdateFatigueCase(profileKey, fc.__KEY__, 'name', e.target.value)}
                      placeholder="Placeholder"
                      title={errors.name}
                      className="h-8 min-w-[140px] rounded border-[#e2e8f0] px-2 text-[13px]"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => onPickLoadCase(profileKey, fc.__KEY__)}
                      title={errors.load_case}
                      className="flex h-8 w-full items-center justify-between gap-1 rounded border border-[#e2e8f0] bg-white px-2 text-[13px] hover:bg-[#f9fafb]"
                    >
                      <span className={`truncate text-left ${fc.load_case != null ? 'text-[#0a0a0a]' : 'text-[#9ca3af]'}`}>
                        {fc.load_case != null ? (loadCaseNamesById[fc.load_case] ?? 'Select') : 'Select'}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#6b7280]" strokeWidth={2} />
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <BufferedNumberInput
                      step="0.01"
                      value={fc.min_scale}
                      onCommit={(v) => onUpdateFatigueCase(profileKey, fc.__KEY__, 'min_scale', v)}
                      clampOnBlur={(v) => Math.min(Math.max(v, 0.01), fc.max_scale)}
                      title={errors.min_scale}
                      className="h-8 w-full rounded border-[#e2e8f0] px-2 text-[13px]"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <BufferedNumberInput
                      step="0.01"
                      value={fc.max_scale}
                      onCommit={(v) => onUpdateFatigueCase(profileKey, fc.__KEY__, 'max_scale', v)}
                      clampOnBlur={(v) => Math.max(Math.min(v, 100), fc.min_scale)}
                      title={errors.max_scale}
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
                          onUpdateFatigueCase(profileKey, fc.__KEY__, 'time', raw === '' ? null : (parseFloat(raw) || 0));
                        }}
                        disabled={fc.cycles !== null}
                        title={errors.time}
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
                          onUpdateFatigueCase(profileKey, fc.__KEY__, 'cycles', raw === '' ? null : (parseFloat(raw) || 0));
                        }}
                        disabled={fc.time !== null}
                        title={errors.cycles}
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
                      onClick={() => onDeleteFatigueCase(profileKey, fc.__KEY__)}
                      aria-label="Delete fatigue case"
                      className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] opacity-0 hover:bg-[#fee2e2] hover:text-[#dc2626] group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {fatigueCases.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-[13px] text-[#6b7280]">
                  No fatigue cases. Click "+ Add fatigue case".
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Add fatigue case — same pattern as other tables */}
        <button
          type="button"
          onClick={() => onAddFatigueCase(profileKey)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-[#e5e7eb] py-2 text-[13px] font-medium text-[#006496] hover:bg-[#f0f9ff]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          Add fatigue case
        </button>
      </div>
    </TooltipProvider>
  );
}
