import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FormField, FormSection } from '@/data/materialFormFields';
import { isFieldInRange } from '@/lib/materialFormValidation';
import { useScrollSpy } from '@/hooks/useScrollSpy';

interface PropertyFormTabProps {
  sections: FormSection[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  /** Fires when focus leaves a field (blur) or the form itself (click-out). */
  onBlur?: () => void;
}

export function PropertyFormTab({ sections, values, onChange, onBlur }: PropertyFormTabProps) {
  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);
  const {
    activeId: activeSectionId,
    containerRef: scrollContainerRef,
    sectionRefs,
    jumpTo,
  } = useScrollSpy(sectionIds, sections[0]?.id ?? '');

  return (
    <div
      onBlur={onBlur}
      className="flex h-full w-full max-w-[1200px] overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] lg:flex-row"
    >
      {/* Sidebar — fixed, nem görget */}
      <aside className="shrink-0 p-6">
        <nav className="flex flex-col gap-1" aria-label="Form sections">
          {sections.map((section) => {
            const active = section.id === activeSectionId;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => jumpTo(section.id)}
                aria-current={active ? 'true' : undefined}
                className={`flex h-9 items-center whitespace-nowrap rounded-md px-3 text-left text-[14px] font-medium leading-5 transition-colors ${
                  active
                    ? 'bg-[#eef9ff] text-[#171717]'
                    : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Form body — ez görget */}
      <div ref={scrollContainerRef} className="min-w-0 flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-12">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              ref={(el) => (sectionRefs.current[section.id] = el)}
              className="flex flex-col gap-4"
            >
              <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">
                {section.label}
                {section.fields.every((f) => !f.required) && (
                  <span className="ml-2 text-[14px] font-normal text-[#6b7280]">(optional)</span>
                )}
              </h2>
              <div className="flex flex-col gap-4">
                {section.fields.map((field) => (
                  <FieldRow
                    key={field.name}
                    field={field}
                    value={values[field.name] ?? ''}
                    onChange={(v) => onChange(field.name, v)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/** An in-range example value for the placeholder — 0 when that's within min/max,
 *  otherwise whichever bound is actually defined. */
function exampleValue(field: FormField): string | undefined {
  if (field.min === undefined && field.max === undefined) return undefined;
  const min = field.min !== undefined ? Number(field.min) : undefined;
  const max = field.max !== undefined ? Number(field.max) : undefined;
  const zeroInRange = (min === undefined || min <= 0) && (max === undefined || max >= 0);
  if (zeroInRange) return '0';
  return min !== undefined ? field.min : field.max;
}

interface FieldRowProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
}

function FieldRow({ field, value, onChange }: FieldRowProps) {
  // Validate on blur, not on every keystroke — an in-progress value (e.g. "-" before
  // typing the rest of a negative number) shouldn't flash an error while still typing.
  const [touched, setTouched] = useState(false);
  const outOfRange = touched && !isFieldInRange(value, field);
  const isNumeric = field.type === 'float' || field.type === 'integer';
  const example = exampleValue(field);
  const placeholder = example !== undefined ? `Enter value (e.g. ${example})` : 'Enter value';
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
      <div className="flex w-full flex-col gap-2 md:w-[424px]">
        <Label
          htmlFor={`field-${field.name}`}
          className="text-[14px] font-medium leading-none text-[#0a0a0a]"
        >
          {field.label}
          {field.required && <span className="text-[#0a0a0a]">*</span>}
        </Label>
        <Input
          id={`field-${field.name}`}
          value={value}
          onChange={(e) => {
            const withDot = e.target.value.replace(',', '.');
            onChange(isNumeric ? withDot.replace(/[^0-9.\-]/g, '') : withDot);
          }}
          onBlur={() => setTouched(true)}
          inputMode={isNumeric ? 'decimal' : 'text'}
          placeholder={placeholder}
          disabled={field.fixed}
          aria-invalid={outOfRange}
          className={`h-9 rounded-md bg-white px-3 py-1 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:opacity-60 ${
            outOfRange ? 'border-[#dc2626] focus-visible:ring-[#dc2626]' : 'border-[#e2e8f0]'
          }`}
        />
        {outOfRange && (
          <p className="text-[13px] leading-4 text-[#dc2626]">
            Value must be between {field.min ?? '…'} and {field.max ?? '…'}.
          </p>
        )}
      </div>
      {field.helper && (
        <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">{field.helper}</p>
      )}
    </div>
  );
}
