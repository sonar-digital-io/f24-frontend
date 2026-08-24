import { Copy, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SelectInline } from '@/components/load-group/SelectInline';
import { validateLoadCase } from '@/lib/loadCaseValidation';
import type { LoadCase, LoadCaseFlag, LoadCaseTargetType } from '@/api/types/loadGroups';

// ─── Load cases tab ───────────────────────────────────────────────────────────

interface LoadGroupLoadCasesTabProps {
  loadCases: LoadCase[];
  onUpdateLoadCase: <K extends keyof LoadCase>(key: string, field: K, val: LoadCase[K]) => void;
  onAddLoadCase: () => void;
  onDuplicateLoadCase: (key: string) => void;
  onDeleteLoadCase: (key: string) => void;
}

export function LoadGroupLoadCasesTab({
  loadCases,
  onUpdateLoadCase,
  onAddLoadCase,
  onDuplicateLoadCase,
  onDeleteLoadCase,
}: LoadGroupLoadCasesTabProps) {
  // Fixed mode has no meaningful max — clear it to null (backend's "not set"),
  // and give range mode a starting max to edit instead of a bare null. Pitch
  // and rpm can't both be 'range' at once (backend rejects it), so switching
  // one to 'range' forces the other back to 'fix'.
  function handleFlagChange(lc: LoadCase, field: 'pitch_flag' | 'rpm_flag', flag: LoadCaseFlag) {
    if (field === 'pitch_flag') {
      onUpdateLoadCase(lc.__KEY__, 'pitch_flag', flag);
      onUpdateLoadCase(lc.__KEY__, 'pitch_max', flag === 'fix' ? null : lc.pitch_min);
      if (flag === 'range' && lc.rpm_flag === 'range') {
        onUpdateLoadCase(lc.__KEY__, 'rpm_flag', 'fix');
        onUpdateLoadCase(lc.__KEY__, 'rpm_max', null);
      }
    } else {
      onUpdateLoadCase(lc.__KEY__, 'rpm_flag', flag);
      onUpdateLoadCase(lc.__KEY__, 'rpm_max', flag === 'fix' ? null : lc.rpm_min);
      if (flag === 'range' && lc.pitch_flag === 'range') {
        onUpdateLoadCase(lc.__KEY__, 'pitch_flag', 'fix');
        onUpdateLoadCase(lc.__KEY__, 'pitch_max', null);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-[#e5e7eb]">
        <table className="w-full border-collapse text-[13px]" style={{ minWidth: 1100 }}>
          <thead>
            <tr className="border-b border-[#e5e7eb]">
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
            {loadCases.map((lc) => {
              const errors = validateLoadCase(lc);
              return (
              <tr key={lc.__KEY__} className="group border-b border-[#e5e7eb] last:border-b-0">
                <td className="px-2 py-2">
                  <Input
                    value={lc.name}
                    onChange={(e) => onUpdateLoadCase(lc.__KEY__, 'name', e.target.value)}
                    placeholder="Placeholder"
                    title={errors.name}
                    className="h-8 min-w-[160px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                  />
                </td>
                <td className="px-2 py-2">
                  <SelectInline
                    value={lc.pitch_flag}
                    onChange={(v) => handleFlagChange(lc, 'pitch_flag', v as LoadCaseFlag)}
                    options={['range', 'fix']}
                    className="w-[80px]"
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    value={lc.pitch_min}
                    onChange={(e) =>
                      onUpdateLoadCase(lc.__KEY__, 'pitch_min', parseFloat(e.target.value) || 0)
                    }
                    title={errors.pitch_min}
                    className="h-8 w-[70px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    value={lc.pitch_max ?? ''}
                    onChange={(e) =>
                      onUpdateLoadCase(lc.__KEY__, 'pitch_max', parseFloat(e.target.value) || 0)
                    }
                    disabled={lc.pitch_flag === 'fix'}
                    title={errors.pitch_max}
                    className="h-8 w-[70px] rounded-md border-[#e2e8f0] px-2 text-[13px] disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:opacity-50"
                  />
                </td>
                <td className="px-2 py-2">
                  <SelectInline
                    value={lc.rpm_flag}
                    onChange={(v) => handleFlagChange(lc, 'rpm_flag', v as LoadCaseFlag)}
                    options={['range', 'fix']}
                    className="w-[80px]"
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    value={lc.rpm_min}
                    onChange={(e) =>
                      onUpdateLoadCase(lc.__KEY__, 'rpm_min', parseFloat(e.target.value) || 0)
                    }
                    title={errors.rpm_min}
                    className="h-8 w-[70px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    value={lc.rpm_max ?? ''}
                    onChange={(e) =>
                      onUpdateLoadCase(lc.__KEY__, 'rpm_max', parseFloat(e.target.value) || 0)
                    }
                    disabled={lc.rpm_flag === 'fix'}
                    title={errors.rpm_max}
                    className="h-8 w-[70px] rounded-md border-[#e2e8f0] px-2 text-[13px] disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:opacity-50"
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    value={lc.altitude}
                    onChange={(e) =>
                      onUpdateLoadCase(lc.__KEY__, 'altitude', parseFloat(e.target.value) || 0)
                    }
                    title={errors.altitude}
                    className="h-8 w-[72px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    value={lc.disa}
                    onChange={(e) =>
                      onUpdateLoadCase(lc.__KEY__, 'disa', parseFloat(e.target.value) || 0)
                    }
                    title={errors.disa}
                    className="h-8 w-[68px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    value={lc.inflow_velocity}
                    onChange={(e) =>
                      onUpdateLoadCase(
                        lc.__KEY__,
                        'inflow_velocity',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    title={errors.inflow_velocity}
                    className="h-8 w-[76px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    value={lc.inflow_angle}
                    onChange={(e) =>
                      onUpdateLoadCase(
                        lc.__KEY__,
                        'inflow_angle',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    title={errors.inflow_angle}
                    className="h-8 w-[72px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                  />
                </td>
                <td className="px-2 py-2">
                  <SelectInline
                    value={lc.target_type}
                    onChange={(v) =>
                      onUpdateLoadCase(lc.__KEY__, 'target_type', v as LoadCaseTargetType)
                    }
                    options={['torque', 'thrust', 'power']}
                    className="w-[86px]"
                  />
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={lc.target_value}
                      onChange={(e) =>
                        onUpdateLoadCase(
                          lc.__KEY__,
                          'target_value',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      title={errors.target_value}
                      className="h-8 w-[80px] rounded-md border-[#e2e8f0] px-2 text-[13px]"
                    />
                    <span className="text-[11px] text-[#6b7280]">
                      {lc.target_type === 'power' ? 'kW' : lc.target_type === 'torque' ? 'Nm' : 'N'}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onDuplicateLoadCase(lc.__KEY__)}
                      aria-label="Duplicate load case"
                      className="flex h-7 w-7 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
                    >
                      <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteLoadCase(lc.__KEY__)}
                      aria-label="Delete load case"
                      className="flex h-7 w-7 items-center justify-center rounded text-[#6b7280] hover:bg-[#fee2e2] hover:text-[#dc2626]"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
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
