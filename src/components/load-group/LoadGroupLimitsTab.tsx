import { Info, Plus, Trash2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BezierEditor } from '@/components/common/BezierEditor';
import type { ControlPoint } from '@/types';
import { BufferedNumberInput } from '@/components/common/BufferedNumberInput';
import {
  LIMITS_UNITS,
  LIMITS_Y_MAX,
  LIMITS_Y_STEP,
  type LimitsSubTab,
} from '@/data/loadGroupForm';

interface LoadGroupLimitsTabProps {
  limitsSubTab: LimitsSubTab;
  onLimitsSubTabChange: (sub: LimitsSubTab) => void;
  limitPoints: Record<LimitsSubTab, ControlPoint[]>;
  onLimitPointsChange: (sub: LimitsSubTab, points: ControlPoint[]) => void;
  onUpdateLimitPoint: (sub: LimitsSubTab, idx: number, field: 'x' | 'y', val: number) => void;
  onAddLimitPoint: (sub: LimitsSubTab) => void;
  onDeleteLimitPoint: (sub: LimitsSubTab, idx: number) => void;
  tabTriggerClassName: string;
}

export function LoadGroupLimitsTab({
  limitsSubTab,
  onLimitsSubTabChange,
  limitPoints,
  onLimitPointsChange,
  onUpdateLimitPoint,
  onAddLimitPoint,
  onDeleteLimitPoint,
  tabTriggerClassName,
}: LoadGroupLimitsTabProps) {
  return (
    <div className="flex w-fit flex-col rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      {/* Info banner + Sub-tabs header */}
      <div className="flex flex-col gap-6 p-6 pb-4">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#6b7280]" strokeWidth={2} />
          <p className="max-w-[560px] text-[13px] font-normal leading-5 text-[#6b7280]">
            Define the maximum allowable aerodynamic and mechanical loads as a function of rotor speed. These limits constrain the simulation envelope for all load cases in this group.
          </p>
        </div>
        <Tabs
          value={limitsSubTab}
          onValueChange={(v) => onLimitsSubTabChange(v as LimitsSubTab)}
        >
          <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
            {(['thrust', 'torque', 'power'] as const).map((sub) => (
              <TabsTrigger key={sub} value={sub} className={tabTriggerClassName}>
                {sub.charAt(0).toUpperCase() + sub.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* BezierEditor + Table side by side */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-[minmax(480px,1fr)_260px] gap-6">
          {/* Interactive Bezier chart */}
          <div className="flex flex-col gap-3">
            <BezierEditor
              points={limitPoints[limitsSubTab]}
              onChange={(next) => onLimitPointsChange(limitsSubTab, next)}
              xMin={0}
              xMax={20}
              xStep={5}
              yMin={0}
              yMax={LIMITS_Y_MAX[limitsSubTab]}
              yStep={LIMITS_Y_STEP[limitsSubTab]}
              yUnit={LIMITS_UNITS[limitsSubTab]}
            />
          </div>

          {/* Precise editing table */}
          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <th className="h-10 w-8 px-2 text-left font-medium text-[#6b7280]">#</th>
                    <th className="h-10 px-3 text-left font-medium text-[#6b7280]">RPM</th>
                    <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                      {LIMITS_UNITS[limitsSubTab]}
                    </th>
                    <th className="h-10 w-8 px-1" />
                  </tr>
                </thead>
                <tbody>
                  {limitPoints[limitsSubTab].map((pt, idx) => {
                    const isEndpoint =
                      idx === 0 || idx === limitPoints[limitsSubTab].length - 1;
                    return (
                      <tr
                        key={idx}
                        className="group border-b border-[#e5e7eb] last:border-b-0"
                      >
                        <td className="px-2 py-2 text-[#6b7280]">{idx}</td>
                        <td className="px-2 py-2">
                          <BufferedNumberInput
                            step="0.1"
                            min={0}
                            max={20}
                            value={pt.x}
                            format={(v) => v.toFixed(2)}
                            disabled={isEndpoint}
                            onCommit={(v) => onUpdateLimitPoint(limitsSubTab, idx, 'x', v)}
                            className="h-8 w-full rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:bg-[#f8fafc] disabled:text-[#6b7280]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <BufferedNumberInput
                            step="1"
                            min={0}
                            max={LIMITS_Y_MAX[limitsSubTab]}
                            value={pt.y}
                            format={(v) => v.toFixed(0)}
                            onCommit={(v) => onUpdateLimitPoint(limitsSubTab, idx, 'y', v)}
                            className="h-8 w-full rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                          />
                        </td>
                        <td className="px-1 py-2">
                          {!isEndpoint && (
                            <button
                              type="button"
                              onClick={() => onDeleteLimitPoint(limitsSubTab, idx)}
                              aria-label="Delete point"
                              className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] opacity-0 hover:bg-[#fee2e2] hover:text-[#dc2626] group-hover:opacity-100"
                            >
                              <Trash2 className="h-3 w-3" strokeWidth={2} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button
                type="button"
                onClick={() => onAddLimitPoint(limitsSubTab)}
                className="flex w-full items-center justify-center gap-1.5 border-t border-[#e5e7eb] py-2 text-[13px] font-medium text-[#006496] hover:bg-[#f0f9ff]"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                Add point
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
