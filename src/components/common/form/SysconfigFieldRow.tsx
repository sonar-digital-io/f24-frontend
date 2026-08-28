import { useEffect, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownSelect } from '@/components/common/form/DropdownSelect';
import { TagSelect } from '@/components/common/form/TagSelect';
import { Tip } from '@/components/common/list/Tip';
import type { FormField } from '@/data/materialFormFields';
import { isFieldInRange } from '@/lib/sysconfigFormValidation';
import { formatRangeMessage } from '@/lib/sysconfigMapping';

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

interface SysconfigFieldRowProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  /** Material's PropertyFormTab shows the helper (e.g. range) as text to the right of the
   *  field, and marks required fields with "*". Geometry's Global properties panel — where
   *  every field is mandatory — shows it as an info tooltip next to the label instead, and
   *  skips the marker since it'd be on every field. */
  helperAsTooltip?: boolean;
  hideRequiredMarker?: boolean;
  /** Forces the error state on regardless of this field's own touched state. */
  forceShowErrors?: boolean;
}

/** A backend-driven sysconfig field: label + input, with required/range/fixed/type
 *  behavior all resolved from the field's own metadata. Shared by Material's
 *  PropertyFormTab (multi-section, sidebar) and Geometry's Global properties panel
 *  (flat single-section list). */
export function SysconfigFieldRow({
  field,
  value,
  onChange,
  helperAsTooltip,
  hideRequiredMarker,
  forceShowErrors,
}: SysconfigFieldRowProps) {
  const isSelection = field.type === 'selection' && !!field.options?.length;
  const isMultiSelection = field.type === 'multi_selection' && !!field.options?.length;
  const isBoolean = field.type === 'boolean';
  // A single-option selection has nothing to choose — force it selected and read-only
  // rather than making the user open a dropdown just to pick the only entry.
  const onlyOption = isSelection && field.options!.length === 1 ? field.options![0] : undefined;
  useEffect(() => {
    if (onlyOption && value !== onlyOption.id) onChange(onlyOption.id);
  }, [onlyOption?.id, value, onChange]);

  // The dropdown/tag picker round-trips through display labels — disambiguate any that
  // collide so a selection can't resolve back to the wrong option's id.
  const labelById = useMemo(() => {
    if (!isSelection && !isMultiSelection) return new Map<string, string>();
    const counts = new Map<string, number>();
    field.options!.forEach((o) => counts.set(o.name, (counts.get(o.name) ?? 0) + 1));
    const map = new Map<string, string>();
    field.options!.forEach((o) => map.set(o.id, (counts.get(o.name) ?? 0) > 1 ? `${o.name} (${o.id})` : o.name));
    return map;
  }, [isSelection, isMultiSelection, field.options]);

  // Validate on blur, not on every keystroke — an in-progress value (e.g. "-" before
  // typing the rest of a negative number) shouldn't flash an error while still typing.
  // `forceShowErrors` bypasses that — used to surface everything missing at once after
  // the user opts to stay past the exit-confirm warning.
  const [touched, setTouched] = useState(false);
  const showFieldErrors = touched || forceShowErrors;
  const missingRequired = showFieldErrors && !!field.required && !value;
  const outOfRange = showFieldErrors && !isFieldInRange(value, field);
  const invalid = missingRequired || outOfRange;
  const isNumeric = field.type === 'float' || field.type === 'integer';
  const example = exampleValue(field);
  const placeholder = example !== undefined ? `Enter value (e.g. ${example})` : 'Enter value';
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
      <div className="flex w-full flex-col gap-2 md:w-[424px]">
        <Label
          htmlFor={`field-${field.name}`}
          className="flex items-center gap-1.5 text-[14px] font-medium leading-none text-[#0a0a0a]"
        >
          {field.label}
          {!hideRequiredMarker && field.required && <span className="text-[#0a0a0a]">*</span>}
          {helperAsTooltip && field.helper && (
            <Tip label={field.helper} placement="bottom">
              <Info className="h-3.5 w-3.5 text-[#6b7280]" strokeWidth={2} />
            </Tip>
          )}
        </Label>
        {/* Blur bubbles from whichever control is actually rendered — DropdownSelect/
            TagSelect/the checkbox don't expose their own onBlur, so it's caught here
            instead of duplicated per-branch (matches Input's own onBlur below). */}
        <div onBlur={() => setTouched(true)}>
          {isSelection ? (
            <DropdownSelect
              id={`field-${field.name}`}
              value={labelById.get(value) ?? ''}
              onChange={(label) => onChange(field.options!.find((o) => labelById.get(o.id) === label)?.id ?? value)}
              options={field.options!.map((o) => labelById.get(o.id) ?? '')}
              disabled={field.fixed || !!onlyOption}
            />
          ) : isMultiSelection ? (
            <TagSelect
              options={field.options!.map((o) => labelById.get(o.id) ?? '')}
              value={value
                .split(',')
                .filter(Boolean)
                .map((id) => labelById.get(id) ?? id)}
              onChange={(labels) =>
                onChange(
                  labels
                    .map((label) => field.options!.find((o) => labelById.get(o.id) === label)?.id ?? label)
                    .join(',')
                )
              }
            />
          ) : isBoolean ? (
            <label htmlFor={`field-${field.name}`} className="flex h-9 items-center">
              <input
                id={`field-${field.name}`}
                type="checkbox"
                checked={value === 'true'}
                disabled={field.fixed}
                onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
                className="h-4 w-4 rounded border-[#e2e8f0] accent-[#006496] disabled:cursor-not-allowed"
              />
            </label>
          ) : (
            <Input
              id={`field-${field.name}`}
              value={value}
              onChange={(e) => {
                const withDot = e.target.value.replace(',', '.');
                // Allow scientific notation (e.g. "1e-6") — float fields like CTE need it.
                onChange(isNumeric ? withDot.replace(/[^0-9.\-eE+]/g, '') : withDot);
              }}
              inputMode={isNumeric ? 'decimal' : 'text'}
              placeholder={placeholder}
              disabled={field.fixed}
              aria-invalid={invalid}
              className={`h-9 rounded-md bg-white px-3 py-1 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:opacity-60 ${
                invalid ? 'border-[#dc2626] focus-visible:ring-[#dc2626]' : 'border-[#e2e8f0]'
              }`}
            />
          )}
        </div>
        {invalid && (
          <p className="text-[13px] leading-4 text-[#dc2626]">
            {missingRequired ? 'This field is required.' : formatRangeMessage(field.min, field.max)}
          </p>
        )}
      </div>
      {!helperAsTooltip && field.helper && (
        <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">{field.helper}</p>
      )}
    </div>
  );
}
