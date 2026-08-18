import { useMemo, useState, type MutableRefObject, type RefObject } from 'react';
import { ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { TagSelect } from '@/components/calculation/TagSelect';
import type { SysconfigParamEntry, SysconfigParameter, SysconfigResponse } from '@/api/types/sysconfig';

interface CalculationConfigurationTabProps {
  isLoading: boolean;
  isError: boolean;
  sysconfig: SysconfigResponse | undefined;
  activeConfigSection: string;
  onJumpToSection: (id: string) => void;
  configScrollRef: RefObject<HTMLDivElement>;
  configSectionRefs: MutableRefObject<Record<string, HTMLElement | null>>;
}

interface Section {
  id: string;
  name: string;
  entries: SysconfigParamEntry[];
}

/** Fields not editable here — analysis_method lives on the General tab. */
const OWNED_ELSEWHERE = new Set(['analysis_method']);

function unitSymbol(sysconfig: SysconfigResponse, unitId: string | undefined): string {
  if (!unitId) return '';
  return sysconfig.units.find((u) => u.id === unitId)?.symbol ?? '';
}

// ── Field value state ───────────────────────────────────────────────────────

type FieldValue = string | string[] | boolean;

function defaultValueFor(paramDef: SysconfigParameter, entry: SysconfigParamEntry): FieldValue {
  if (paramDef.type === 'boolean') return entry.value === 'true';
  if (paramDef.type === 'multi_selection') return entry.value ? entry.value.split(',') : [];
  return entry.value ?? '';
}

// ── Field renderer ───────────────────────────────────────────────────────────

interface FieldRowProps {
  paramDef: SysconfigParameter;
  entry: SysconfigParamEntry;
  unit: string;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}

function FieldRow({ paramDef, entry, unit, value, onChange }: FieldRowProps) {
  const label = unit ? `${paramDef.name} [${unit}]` : paramDef.name;
  const disabled = entry.fixed;

  let control: React.ReactNode;
  if (paramDef.type === 'boolean') {
    control = (
      <label className="flex h-9 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={value === true}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-[#e2e8f0] accent-[#006496] disabled:cursor-not-allowed"
        />
      </label>
    );
  } else if (paramDef.type === 'multi_selection') {
    control = (
      <TagSelect
        options={(paramDef.options ?? []).map((o) => o.name)}
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
      />
    );
  } else if (paramDef.type === 'selection') {
    control = (
      <div className="relative">
        <select
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full appearance-none rounded-md border border-[#e2e8f0] bg-white px-3 pr-8 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-[#006496]/30 disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:opacity-60"
        >
          {(paramDef.options ?? []).map((o) => (
            <option key={o.id} value={o.name}>
              {o.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"
          strokeWidth={2}
        />
      </div>
    );
  } else {
    // integer, float, file, and any other scalar type fall back to a plain text input.
    control = (
      <input
        type="text"
        value={typeof value === 'string' ? value : ''}
        disabled={disabled}
        min={entry.minimum}
        max={entry.maximum}
        onChange={(e) => onChange(e.target.value)}
        placeholder={entry.minimum || entry.maximum ? `${entry.minimum ?? ''} – ${entry.maximum ?? ''}` : 'Placeholder'}
        className="h-9 w-full rounded-md border border-[#e2e8f0] bg-white px-3 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#006496]/30 disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:opacity-60"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
      <div className="flex w-full flex-col gap-2 md:w-[424px]">
        <Label className="text-[14px] font-medium text-[#0a0a0a]">
          {label} {!entry.optional && <span className="text-[#dc2626]">*</span>}
        </Label>
        {control}
      </div>
      {paramDef.description && (
        <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">{paramDef.description}</p>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function CalculationConfigurationTab({
  isLoading,
  isError,
  sysconfig,
  activeConfigSection,
  onJumpToSection,
  configScrollRef,
  configSectionRefs,
}: CalculationConfigurationTabProps) {
  const [values, setValues] = useState<Record<string, FieldValue>>({});

  const parametersById = useMemo(() => {
    const map = new Map<string, SysconfigParameter>();
    for (const p of sysconfig?.parameters ?? []) map.set(p.id, p);
    return map;
  }, [sysconfig]);

  // A group only gets a section/nav entry if at least one of its parameters
  // is currently active.
  const sections = useMemo<Section[]>(() => {
    const projectSettings = sysconfig?.configuration.project_settings;
    if (!projectSettings) return [];
    const groupSections = (projectSettings.groups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      entries: (g.parameters ?? []).filter((entry) => entry.active && !OWNED_ELSEWHERE.has(entry.reference)),
    }));
    const ungrouped = (projectSettings.parameters ?? []).filter(
      (entry) => entry.active && !OWNED_ELSEWHERE.has(entry.reference)
    );
    const withUngrouped = ungrouped.length
      ? [...groupSections, { id: '__ungrouped', name: 'Other', entries: ungrouped }]
      : groupSections;
    return withUngrouped.filter((s) => s.entries.length > 0);
  }, [sysconfig]);

  function fieldValue(entry: SysconfigParamEntry, paramDef: SysconfigParameter): FieldValue {
    if (entry.reference in values) return values[entry.reference];
    return defaultValueFor(paramDef, entry);
  }

  function handleFieldChange(reference: string, value: FieldValue) {
    setValues((prev) => ({ ...prev, [reference]: value }));
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full max-w-[1200px] items-center justify-center rounded-[14px] border border-[#e5e7eb] bg-white text-[14px] text-[#6b7280] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        Loading configuration…
      </div>
    );
  }

  if (isError || !sysconfig) {
    return (
      <div className="flex h-full w-full max-w-[1200px] items-center justify-center rounded-[14px] border border-[#e5e7eb] bg-white text-[14px] text-[#dc2626] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        Failed to load configuration from the server.
      </div>
    );
  }

  return (
    <div className="flex h-full w-full max-w-[1200px] overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      {/* Sidebar nav — inside the card */}
      <aside className="w-[290px] shrink-0 p-6">
        <nav className="flex flex-col gap-1" aria-label="Configuration sections">
          {sections.map(({ id, name }) => (
            <div key={id} className="group relative">
              <button
                type="button"
                onClick={() => onJumpToSection(id)}
                aria-current={activeConfigSection === id ? 'true' : undefined}
                className={`flex h-9 w-full items-center overflow-hidden rounded-md px-3 text-left text-[14px] font-medium leading-5 transition-colors ${
                  activeConfigSection === id
                    ? 'bg-[#eef9ff] text-[#171717]'
                    : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                }`}
              >
                <span className="truncate">{name}</span>
              </button>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content — only the section selected on the left */}
      <div ref={configScrollRef} className="min-w-0 flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-12">
          {sections
            .filter((section) => section.id === activeConfigSection)
            .map((section) => (
              <section
                key={section.id}
                ref={(el) => (configSectionRefs.current[section.id] = el)}
                className="flex flex-col gap-6"
              >
                <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">{section.name}</h2>
                {section.entries.map((entry) => {
                  const paramDef = parametersById.get(entry.reference);
                  if (!paramDef) return null;
                  return (
                    <FieldRow
                      key={entry.reference}
                      paramDef={paramDef}
                      entry={entry}
                      unit={unitSymbol(sysconfig, paramDef.unit)}
                      value={fieldValue(entry, paramDef)}
                      onChange={(v) => handleFieldChange(entry.reference, v)}
                    />
                  );
                })}
              </section>
            ))}

          {sections.length === 0 && (
            <p className="text-[14px] text-[#6b7280]">No configuration fields for this analysis method yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
