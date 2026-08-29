import { Info, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CubicSplineEditor } from '@/components/common/viewer/CubicSplineEditor';
import { BezierEditor } from '@/components/common/viewer/BezierEditor';
import { CurveTypeToggle } from '@/components/common/viewer/CurveTypeToggle';
import { BufferedNumberInput } from '@/components/common/BufferedNumberInput';
import { niceStep } from '@/lib/bezierMath';
import type { CurveType } from '@/types';
import type { LoadLimitRange } from '@/api/types/loadGroups';
import { LIMITS_UNITS, type LimitsSubTab } from '@/data/loadGroupForm';

interface LoadGroupLimitsTabProps {
  limitsSubTab: LimitsSubTab;
  onLimitsSubTabChange: (sub: LimitsSubTab) => void;
  limits: Record<LimitsSubTab, LoadLimitRange>;
  onUpdateBounds: (sub: LimitsSubTab, field: 'x_min' | 'x_max' | 'y_min' | 'y_max', val: number) => void;
  onUpdateCurvePoint: (sub: LimitsSubTab, idx: number, field: 'rpm' | 'value', val: number) => void;
  onUpdateCurveType: (sub: LimitsSubTab, curveType: CurveType) => void;
  onCurveChange: (sub: LimitsSubTab, curve: LoadLimitRange['curve']) => void;
  onAddCurvePoint: (sub: LimitsSubTab) => void;
  onDeleteCurvePoint: (sub: LimitsSubTab, idx: number) => void;
  tabTriggerClassName: string;
}

export function LoadGroupLimitsTab({
  limitsSubTab,
  onLimitsSubTabChange,
  limits,
  onUpdateBounds,
  onUpdateCurvePoint,
  onUpdateCurveType,
  onCurveChange,
  onAddCurvePoint,
  onDeleteCurvePoint,
  tabTriggerClassName,
}: LoadGroupLimitsTabProps) {
  const bounds = limits[limitsSubTab];
  const points = bounds.curve.map((c) => ({ x: c.rpm, y: c.value }));

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

      {/* Bounds + CubicSplineEditor + Table */}
      <div className="flex flex-col gap-4 px-6 pb-6">
        <div className="flex items-end gap-4">
          {(['y_min', 'y_max', 'x_min', 'x_max'] as const).map((field) => (
            <div key={field} className="flex flex-col gap-2">
              <Label className="text-[12px] font-medium uppercase leading-none text-[#6b7280]">
                {field.replace('_', ' ')}
              </Label>
              <Input
                type="number"
                value={bounds[field]}
                onChange={(e) => onUpdateBounds(limitsSubTab, field, parseFloat(e.target.value) || 0)}
                className="h-8 w-[110px] rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[minmax(480px,1fr)_260px] gap-6">
          {/* Interactive curve chart */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <CurveTypeToggle value={bounds.curve_type} onChange={(next) => onUpdateCurveType(limitsSubTab, next)} />
            </div>
            {bounds.curve_type === 'bezier' ? (
              <BezierEditor
                points={points}
                onChange={(next) => onCurveChange(limitsSubTab, next.map((p) => ({ rpm: p.x, value: p.y })))}
                xMin={bounds.x_min}
                xMax={bounds.x_max}
                xStep={niceStep(bounds.x_max - bounds.x_min)}
                yMin={bounds.y_min}
                yMax={bounds.y_max}
                yStep={niceStep(bounds.y_max - bounds.y_min)}
                xUnit="RPM"
                yUnit={LIMITS_UNITS[limitsSubTab]}
                showRootIndicator={false}
                minPoints={2}
              />
            ) : (
              <CubicSplineEditor
                points={points}
                onChange={(next) => onCurveChange(limitsSubTab, next.map((p) => ({ rpm: p.x, value: p.y })))}
                xMin={bounds.x_min}
                xMax={bounds.x_max}
                xStep={niceStep(bounds.x_max - bounds.x_min)}
                yMin={bounds.y_min}
                yMax={bounds.y_max}
                yStep={niceStep(bounds.y_max - bounds.y_min)}
                xUnit="RPM"
                yUnit={LIMITS_UNITS[limitsSubTab]}
                showRootIndicator={false}
                minPoints={2}
              />
            )}
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
                  {bounds.curve.map((pt, idx) => {
                    const isEndpoint = idx === 0 || idx === bounds.curve.length - 1;
                    return (
                      <tr
                        key={idx}
                        className="group border-b border-[#e5e7eb] last:border-b-0"
                      >
                        <td className="px-2 py-2 text-[#6b7280]">{idx}</td>
                        <td className="px-2 py-2">
                          <BufferedNumberInput
                            step="0.1"
                            min={bounds.x_min}
                            max={bounds.x_max}
                            value={pt.rpm}
                            format={(v) => v.toFixed(2)}
                            onCommit={(v) => onUpdateCurvePoint(limitsSubTab, idx, 'rpm', v)}
                            className="h-8 w-full rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <BufferedNumberInput
                            step="1"
                            min={bounds.y_min}
                            max={bounds.y_max}
                            value={pt.value}
                            format={(v) => v.toFixed(0)}
                            onCommit={(v) => onUpdateCurvePoint(limitsSubTab, idx, 'value', v)}
                            className="h-8 w-full rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                          />
                        </td>
                        <td className="px-1 py-2">
                          {!isEndpoint && (
                            <button
                              type="button"
                              onClick={() => onDeleteCurvePoint(limitsSubTab, idx)}
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
                onClick={() => onAddCurvePoint(limitsSubTab)}
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
