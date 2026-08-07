interface SelectButtonProps {
  selected: boolean;
  onClick: () => void;
}

/** Toggle-select pill button used in picker tables (Calculation's Composition/
 *  Load group/Fatigue profile tabs) — "Select" vs. a "Selected" active state. */
export function SelectButton({ selected, onClick }: SelectButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center justify-center rounded-md px-3 text-[13px] font-medium transition-colors ${
        selected
          ? 'border border-[#006496] bg-[#eef9ff] text-[#006496]'
          : 'bg-[#006496] text-[#fafafa] hover:bg-[#005580]'
      }`}
    >
      {selected ? 'Selected' : 'Select'}
    </button>
  );
}
