import { useMemo } from 'react';
import type { FormSection } from '@/data/materialFormFields';
import { SysconfigFieldRow } from '@/components/common/SysconfigFieldRow';
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
                  <SysconfigFieldRow
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
