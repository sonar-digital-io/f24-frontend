import { ChevronDown, ChevronUp } from 'lucide-react';
import { DetailRow } from '@/components/common/list/DetailRow';
import type { KeyValuePair } from '@/api/types/common';

/** "coef_therm_exp_11" -> "Coef Therm Exp 11". */
function humanizeReference(reference: string): string {
  return reference
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function PropertySection({
  title,
  properties,
  open,
  onToggle,
}: {
  title: string;
  properties: KeyValuePair[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-[14px] font-semibold leading-5 text-[#0a0a0a]"
      >
        {open ? (
          <ChevronUp className="h-4 w-4" strokeWidth={2} />
        ) : (
          <ChevronDown className="h-4 w-4" strokeWidth={2} />
        )}
        {title}
      </button>
      {open && (
        <div className="flex flex-col pl-[22px]">
          {properties.map((kv) => (
            <DetailRow
              key={kv.reference}
              labelWidthClassName="w-[220px]"
              label={humanizeReference(kv.reference)}
              value={String(kv.value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Mechanical/fatigue property key-value sections — one per non-empty property list.
 * Open/closed state is controlled by the caller so it survives the row itself
 * collapsing and re-expanding (this component remounts each time; the caller doesn't).
 */
export function MaterialPropertyList({
  mechanicalProperties,
  fatigueProperties,
  mechanicalOpen,
  onToggleMechanical,
  fatigueOpen,
  onToggleFatigue,
}: {
  mechanicalProperties: KeyValuePair[];
  fatigueProperties: KeyValuePair[];
  mechanicalOpen: boolean;
  onToggleMechanical: () => void;
  fatigueOpen: boolean;
  onToggleFatigue: () => void;
}) {
  if (mechanicalProperties.length === 0 && fatigueProperties.length === 0) {
    return <p className="px-1 py-2 text-[14px] text-[#6b7280]">No properties set for this material.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {mechanicalProperties.length > 0 && (
        <PropertySection
          title="Mechanical properties"
          properties={mechanicalProperties}
          open={mechanicalOpen}
          onToggle={onToggleMechanical}
        />
      )}
      {fatigueProperties.length > 0 && (
        <PropertySection
          title="Fatigue properties"
          properties={fatigueProperties}
          open={fatigueOpen}
          onToggle={onToggleFatigue}
        />
      )}
    </div>
  );
}
