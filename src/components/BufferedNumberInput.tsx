import { useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

interface BufferedNumberInputProps
  extends Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> {
  value: number;
  onCommit: (value: number) => void;
  /** Format of the resting (unfocused) display value. Defaults to String(value). */
  format?: (value: number) => string;
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
  ...rest
}: BufferedNumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = format ? format(value) : String(value);
  return (
    <Input
      type="number"
      value={draft ?? display}
      onFocus={() => setDraft(display)}
      onChange={(e) => {
        setDraft(e.target.value);
        const parsed = parseFloat(e.target.value);
        if (Number.isFinite(parsed)) onCommit(parsed);
      }}
      onBlur={() => setDraft(null)}
      {...rest}
    />
  );
}
