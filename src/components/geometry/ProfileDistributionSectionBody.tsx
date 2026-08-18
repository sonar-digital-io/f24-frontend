import { BezierEditor } from '@/components/common/viewer/BezierEditor';
import { BezierPointsTable } from '@/components/common/viewer/BezierPointsTable';
import { ProfileDistributionSwitch } from '@/components/geometry/ProfileDistributionSwitch';
import type { ControlPoint } from '@/types';

interface ProfileDistributionSectionBodyProps {
  folded: boolean;
  points: ControlPoint[];
  onChange: (next: ControlPoint[]) => void;
  onCommit?: () => void;
  yMax: number;
  rootX: number;
  valueLabel: string;
  idPrefix: string;
  showDistribution: boolean;
  onShowDistributionChange: (v: boolean) => void;
  showTable: boolean;
  onShowTableChange: (v: boolean) => void;
  getInputValue: (idx: number, field: 'x' | 'y') => string;
  onInputChange: (idx: number, field: 'x' | 'y', raw: string) => void;
  onInputBlur: (idx: number, field: 'x' | 'y') => void;
  onAddPoint: () => void;
}

/** A single distribution-curve section's chart + table body (no heading — the
 *  accordion item or sub-tab above already names the section). */
export function ProfileDistributionSectionBody({
  folded,
  points,
  onChange,
  onCommit,
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
}: ProfileDistributionSectionBodyProps) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className={
          folded
            ? 'flex flex-col gap-4'
            : 'grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,384px)]'
        }
      >
        {/* Distribution view */}
        <div className="flex flex-col gap-3">
          <ProfileDistributionSwitch
            checked={showDistribution}
            onChange={onShowDistributionChange}
            label="Distribution view"
          />
          {showDistribution && (
            <BezierEditor points={points} onChange={onChange} onCommit={onCommit} yMax={yMax} rootX={rootX} />
          )}
        </div>

        {/* Table */}
        <div className="flex flex-col gap-3">
          <ProfileDistributionSwitch checked={showTable} onChange={onShowTableChange} label="Table" />
          {showTable && (
            <BezierPointsTable
              points={points}
              valueLabel={valueLabel}
              idPrefix={idPrefix}
              getInputValue={getInputValue}
              onChange={onInputChange}
              onBlur={onInputBlur}
              onAddPoint={onAddPoint}
            />
          )}
        </div>
      </div>
    </div>
  );
}
