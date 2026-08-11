import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FormSection } from '@/data/materialFormFields';
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
                    name={field.name}
                    label={field.label}
                    required={field.required}
                    helper={field.helper}
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

interface FieldRowProps {
  name: string;
  label: string;
  required?: boolean;
  helper?: string;
  value: string;
  onChange: (value: string) => void;
}

function FieldRow({ name, label, required, helper, value, onChange }: FieldRowProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
      <div className="flex w-full flex-col gap-2 md:w-[424px]">
        <Label
          htmlFor={`field-${name}`}
          className="text-[14px] font-medium leading-none text-[#0a0a0a]"
        >
          {label}
          {required && <span className="text-[#0a0a0a]">*</span>}
        </Label>
        <Input
          id={`field-${name}`}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(',', '.'))}
          placeholder="Enter value"
          className="h-9 rounded-md border-[#e2e8f0] bg-white px-3 py-1 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
        />
      </div>
      {helper && (
        <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">{helper}</p>
      )}
    </div>
  );
}
