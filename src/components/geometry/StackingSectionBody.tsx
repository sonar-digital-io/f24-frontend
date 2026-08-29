import { CubicSplineEditor } from '@/components/common/viewer/CubicSplineEditor';
import { BezierEditor } from '@/components/common/viewer/BezierEditor';
import { CubicSplinePointsTable, type PointsTableEditCallbacks } from '@/components/common/viewer/CubicSplinePointsTable';
import { CurveTypeToggle } from '@/components/common/viewer/CurveTypeToggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ControlPoint, CurveType } from '@/types';

interface StackingSectionBodyProps extends PointsTableEditCallbacks {
  folded: boolean;
  sectionKey: string;
  points: ControlPoint[];
  onChange: (next: ControlPoint[]) => void;
  onCommit?: () => void;
  curveType: CurveType;
  onCurveTypeChange: (next: CurveType) => void;
  yMin: number;
  yMax: number;
  yStep: number;
  rootX: number;
  valueLabel: string;
  getBoundInputValue: (field: 'min' | 'max') => string;
  onBoundChange: (field: 'min' | 'max', raw: string) => void;
  onBoundBlur: (field: 'min' | 'max') => void;
}

/** A single sweep/dihedral/twist/chord section's Y-bounds inputs + chart + table. */
export function StackingSectionBody({
  folded,
  sectionKey,
  points,
  onChange,
  onCommit,
  curveType,
  onCurveTypeChange,
  yMin,
  yMax,
  yStep,
  rootX,
  valueLabel,
  getBoundInputValue,
  onBoundChange,
  onBoundBlur,
  getInputValue,
  onInputChange,
  onInputBlur,
  onAddPoint,
  onRemovePoint,
}: StackingSectionBodyProps) {
  return (
    <div className={folded ? 'flex flex-col gap-4' : 'grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,384px)]'}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Label htmlFor={`${sectionKey}-ymin`} className="text-[12px] text-[#6b7280]">
                Y min
              </Label>
              <Input
                id={`${sectionKey}-ymin`}
                type="number"
                step="0.1"
                value={getBoundInputValue('min')}
                onChange={(e) => onBoundChange('min', e.target.value)}
                onBlur={() => onBoundBlur('min')}
                className="h-8 w-24 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label htmlFor={`${sectionKey}-ymax`} className="text-[12px] text-[#6b7280]">
                Y max
              </Label>
              <Input
                id={`${sectionKey}-ymax`}
                type="number"
                step="0.1"
                value={getBoundInputValue('max')}
                onChange={(e) => onBoundChange('max', e.target.value)}
                onBlur={() => onBoundBlur('max')}
                className="h-8 w-24 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              />
            </div>
          </div>
          <CurveTypeToggle value={curveType} onChange={onCurveTypeChange} />
        </div>
        {curveType === 'bezier' ? (
          <BezierEditor points={points} onChange={onChange} onCommit={onCommit} yMin={yMin} yMax={yMax} yStep={yStep} rootX={rootX} />
        ) : (
          <CubicSplineEditor points={points} onChange={onChange} onCommit={onCommit} yMin={yMin} yMax={yMax} yStep={yStep} rootX={rootX} />
        )}
      </div>
      <CubicSplinePointsTable
        points={points}
        valueLabel={valueLabel}
        idPrefix={sectionKey}
        getInputValue={getInputValue}
        onChange={onInputChange}
        onBlur={onInputBlur}
        onAddPoint={onAddPoint}
        onRemovePoint={onRemovePoint}
      />
    </div>
  );
}
