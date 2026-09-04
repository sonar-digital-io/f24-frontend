import { CurveEditor } from '@/components/common/viewer/CurveEditor';
import { CubicSplinePointsTable, type PointsTableEditCallbacks } from '@/components/common/viewer/CubicSplinePointsTable';
import { CurveTypeToggle } from '@/components/common/viewer/CurveTypeToggle';
import { ProfileDistributionSwitch } from '@/components/geometry/ProfileDistributionSwitch';
import type { ControlPoint, CurveType } from '@/types';

interface ProfileDistributionSectionBodyProps extends PointsTableEditCallbacks {
  folded: boolean;
  points: ControlPoint[];
  onChange: (next: ControlPoint[]) => void;
  onCommit?: () => void;
  curveType: CurveType;
  onCurveTypeChange: (next: CurveType) => void;
  yMin: number;
  yMax: number;
  rootX: number;
  valueLabel: string;
  idPrefix: string;
  showDistribution: boolean;
  onShowDistributionChange: (v: boolean) => void;
  showTable: boolean;
  onShowTableChange: (v: boolean) => void;
}

/** A single distribution-curve section's chart + table body (no heading — the
 *  accordion item or sub-tab above already names the section). */
export function ProfileDistributionSectionBody({
  folded,
  points,
  onChange,
  onCommit,
  curveType,
  onCurveTypeChange,
  yMin,
  yMax,
  rootX,
  valueLabel,
  idPrefix,
  showDistribution,
  onShowDistributionChange,
  showTable,
  onShowTableChange,
  getInputValue,
  onInputChange,
  onInputBlur,
  onAddPoint,
  onRemovePoint,
}: ProfileDistributionSectionBodyProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className={folded ? 'flex flex-col gap-4' : 'grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,384px)]'}>
        {/* Distribution view */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <ProfileDistributionSwitch
              checked={showDistribution}
              onChange={onShowDistributionChange}
              label="Distribution view"
            />
            <CurveTypeToggle value={curveType} onChange={onCurveTypeChange} />
          </div>
          {showDistribution && (
            <CurveEditor curveType={curveType} points={points} onChange={onChange} onCommit={onCommit} yMin={yMin} yMax={yMax} rootX={rootX} />
          )}
        </div>

        {/* Table */}
        <div className="flex flex-col gap-3">
          <ProfileDistributionSwitch checked={showTable} onChange={onShowTableChange} label="Table" />
          {showTable && (
            <CubicSplinePointsTable
              points={points}
              valueLabel={valueLabel}
              idPrefix={idPrefix}
              getInputValue={getInputValue}
              onChange={onInputChange}
              onBlur={onInputBlur}
              onAddPoint={onAddPoint}
              onRemovePoint={onRemovePoint}
            />
          )}
        </div>
      </div>
    </div>
  );
}
