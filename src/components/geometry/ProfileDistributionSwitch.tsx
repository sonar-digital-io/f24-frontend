/** Private toggle switch for `ProfileDistributionPanel` — not shared with
 *  other components' own switch/checkbox implementations. */
export interface ProfileDistributionSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

export function ProfileDistributionSwitch({
  checked,
  onChange,
  label,
}: ProfileDistributionSwitchProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] font-medium text-[#0a0a0a]">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[#006496]' : 'bg-[#cbd5e1]'
        }`}
      >
        <span
          className={`absolute left-[2px] top-[2px] h-4 w-4 rounded-full bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.15)] transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}
