import { Copy, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SelectInline } from '@/components/load-group/SelectInline';
import type { LoadCase, PitchRpmFlag, TargetType } from '@/data/loadGroupForm';

// ─── Load cases tab ───────────────────────────────────────────────────────────

interface LoadGroupLoadCasesTabProps {
  loadCases: LoadCase[];
  onUpdateLoadCase: <K extends keyof LoadCase>(caseId: string, field: K, val: LoadCase[K]) => void;
  onAddLoadCase: () => void;
  onDuplicateLoadCase: (caseId: string) => void;
  onDeleteLoadCase: (caseId: string) => void;
}

export function LoadGroupLoadCasesTab({
  loadCases,
  onUpdateLoadCase,
  onAddLoadCase,
  onDuplicateLoadCase,
  onDeleteLoadCase,
}: LoadGroupLoadCasesTabProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-[#e5e7eb]">
        <table className="w-full border-collapse text-[13px]" style={{ minWidth: 1100 }}>
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
              <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Name</th>
              <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Pitch flag</th>
              <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Pitch min [°]</th>
              <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Pitch max [°]</th>
              <th className="h-10 px-3 text-left font-medium text-[#6b7280]">RPM flag</th>
              <th className="h-10 px-3 text-left font-medium text-[#6b7280]">RPM min</th>
              <th className="h-10 px-3 text-left font-medium text-[#6b7280]">RPM max</th>
              <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Altitude [m]</th>
              <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Disa [°C]</th>
              <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                Inflow vel. [m/s]
              </th>
              <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                Inflow angle [°]
              </th>
              <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Target type</th>
              <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Target value</th>
              <th className="h-10 w-[72px] px-2" />
            </tr>
          </thead>
          <tbody>
            {loadCases.map((lc) => (
              <tr key={lc.id} className="group border-b border-[#e5e7eb] last:border-b-0">
                <td className="px-2 py-1.5">
                  <Input
                    value={lc.name}
                    onChange={(e) => onUpdateLoadCase(lc.id, 'name', e.target.value)}
                    placeholder="Placeholder"
                    className="h-8 min-w-[160px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <SelectInline
                    value={lc.pitchFlag}
                    onChange={(v) =>
                      onUpdateLoadCase(lc.id, 'pitchFlag', v as PitchRpmFlag)
                    }
                    options={['Range', 'Fixed']}
                    className="w-[80px]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    value={lc.pitchMin}
                    onChange={(e) =>
                      onUpdateLoadCase(lc.id, 'pitchMin', parseFloat(e.target.value) || 0)
                    }
                    className="h-8 w-[70px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  {(() => {
                    const isFixed = lc.pitchFlag === 'Fixed';
                    const hasError = isFixed && lc.pitchMax !== 0;
                    return (
                      <div className="group/pitchmax relative">
                        <Input
                          type="number"
                          value={lc.pitchMax}
                          onChange={(e) =>
                            onUpdateLoadCase(lc.id, 'pitchMax', parseFloat(e.target.value) || 0)
                          }
                          disabled={isFixed && !hasError}
                          className={`h-8 w-[70px] rounded-md px-2 text-[13px] disabled:cursor-not-allowed ${
                            hasError
                              ? 'border-[#dc2626] !opacity-100 disabled:bg-[#fff5f5]'
                              : 'border-[#e2e8f0] disabled:bg-[#f8fafc] disabled:opacity-50'
                          }`}
                        />
                        {hasError && (
                          <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[11px] leading-none text-white opacity-0 shadow-sm transition-opacity group-hover/pitchmax:opacity-100">
                            Maximum value is not allowed in fixed mode
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td className="px-2 py-1.5">
                  <SelectInline
                    value={lc.rpmFlag}
                    onChange={(v) => onUpdateLoadCase(lc.id, 'rpmFlag', v as PitchRpmFlag)}
                    options={['Range', 'Fixed']}
                    className="w-[80px]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    value={lc.rpmMin}
                    onChange={(e) =>
                      onUpdateLoadCase(lc.id, 'rpmMin', parseFloat(e.target.value) || 0)
                    }
                    className="h-8 w-[70px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  {(() => {
                    const isFixed = lc.rpmFlag === 'Fixed';
                    const hasError = isFixed && lc.rpmMax !== 0;
                    return (
                      <div className="group/rpmmax relative">
                        <Input
                          type="number"
                          value={lc.rpmMax}
                          onChange={(e) =>
                            onUpdateLoadCase(lc.id, 'rpmMax', parseFloat(e.target.value) || 0)
                          }
                          disabled={isFixed && !hasError}
                          className={`h-8 w-[70px] rounded-md px-2 text-[13px] disabled:cursor-not-allowed ${
                            hasError
                              ? 'border-[#dc2626] !opacity-100 disabled:bg-[#fff5f5]'
                              : 'border-[#e2e8f0] disabled:bg-[#f8fafc] disabled:opacity-50'
                          }`}
                        />
                        {hasError && (
                          <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a0a0a] px-1.5 py-0.5 text-[11px] leading-none text-white opacity-0 shadow-sm transition-opacity group-hover/rpmmax:opacity-100">
                            Maximum value is not allowed in fixed mode
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    value={lc.altitude}
                    onChange={(e) =>
                      onUpdateLoadCase(lc.id, 'altitude', parseFloat(e.target.value) || 0)
                    }
                    className="h-8 w-[72px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    value={lc.disa}
                    onChange={(e) =>
                      onUpdateLoadCase(lc.id, 'disa', parseFloat(e.target.value) || 0)
                    }
                    className="h-8 w-[68px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    value={lc.inflowVelocity}
                    onChange={(e) =>
                      onUpdateLoadCase(
                        lc.id,
                        'inflowVelocity',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="h-8 w-[76px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    value={lc.inflowAngle}
                    onChange={(e) =>
                      onUpdateLoadCase(
                        lc.id,
                        'inflowAngle',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="h-8 w-[72px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <SelectInline
                    value={lc.targetType}
                    onChange={(v) =>
                      onUpdateLoadCase(lc.id, 'targetType', v as TargetType)
                    }
                    options={['torque', 'thrust', 'power']}
                    className="w-[86px]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={lc.targetValue}
                      onChange={(e) =>
                        onUpdateLoadCase(
                          lc.id,
                          'targetValue',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="h-8 w-[80px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                    />
                    <span className="text-[11px] text-[#6b7280]">
                      {lc.targetType === 'power' ? 'kW' : lc.targetType === 'torque' ? 'Nm' : 'N'}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onDuplicateLoadCase(lc.id)}
                      aria-label="Duplicate load case"
                      className="flex h-7 w-7 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
                    >
                      <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteLoadCase(lc.id)}
                      aria-label="Delete load case"
                      className="flex h-7 w-7 items-center justify-center rounded text-[#6b7280] hover:bg-[#fee2e2] hover:text-[#dc2626]"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {loadCases.length === 0 && (
              <tr>
                <td colSpan={14} className="py-8 text-center text-[14px] text-[#6b7280]">
                  No load cases yet. Click "Add load case" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={onAddLoadCase}
        className="inline-flex h-9 w-fit items-center gap-2 rounded-md bg-[#006496] px-4 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580]"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        Add load case
      </button>
    </div>
  );
}
