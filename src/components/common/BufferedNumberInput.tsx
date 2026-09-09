import { useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

interface BufferedNumberInputProps
  extends Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> {
  value: number;
  onCommit: (value: number) => void;
  /** Format of the resting (unfocused) display value. Defaults to String(value). */
  format?: (value: number) => string;
  /** Range/relation constraint (e.g. vs. a sibling min/max field) applied only
   *  on blur — keeps mid-typing values (e.g. deleting "20" down to "") from
   *  being clamped back before the user finishes editing. If what the user
   *  typed had to be changed (or wasn't a number at all) to satisfy it, the
   *  field is flagged invalid (red border, `aria-invalid`, tooltip) until
   *  the next edit — a `title` prop is left alone (some callers already show
   *  their own validation message that way) and only filled with
   *  `invalidMessage` as a fallback. */
  clampOnBlur?: (value: number) => number;
  /** Tooltip shown while flagged invalid, when the caller hasn't already
   *  passed its own `title`. Defaults to a generic out-of-range note. */
  invalidMessage?: string;
}

/**
 * Number input that keeps a local string draft while focused, so the field can
 * be cleared and intermediate states ("0.", "-") survive typing. Binding the
 * input straight to parsed numeric state snaps the caret back on every
 * keystroke and makes decimals unenterable with formatted values.
 */
export function BufferedNumberInput({
  value,
  onCommit,
  format,
  clampOnBlur,
  invalidMessage = 'Invalid value — adjusted to the nearest allowed one.',
  className,
  title,
  ...rest
}: BufferedNumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const display = format ? format(value) : String(value);
  return (
    <Input
      type="number"
      value={draft ?? display}
      aria-invalid={invalid}
      title={title ?? (invalid ? invalidMessage : undefined)}
      onFocus={() => {
        setDraft(display);
        setInvalid(false);
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const parsed = parseFloat(e.target.value);
        if (Number.isFinite(parsed)) onCommit(parsed);
      }}
      onBlur={() => {
        const raw = draft ?? display;
        setDraft(null);
        if (clampOnBlur) {
          const parsed = parseFloat(raw);
          const clamped = clampOnBlur(Number.isFinite(parsed) ? parsed : value);
          setInvalid(!Number.isFinite(parsed) || clamped !== parsed);
          onCommit(clamped);
        }
      }}
      className={`${invalid ? 'border-[#dc2626] focus-visible:ring-[#dc2626]' : ''} ${className ?? ''}`}
      {...rest}
    />
  );
}
