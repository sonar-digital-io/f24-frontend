interface CrossSectionProfileListProps {
  profiles: { id: number; name: string }[];
  selected: string | null;
  onSelect: (profileId: string) => void;
}

/** Left sidebar: pick which geometry profile's cross-section to view. */
export function CrossSectionProfileList({ profiles, selected, onSelect }: CrossSectionProfileListProps) {
  return (
    <div className="flex w-[150px] shrink-0 flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <span className="text-[12px] font-medium leading-none text-[#6b7280]">Cross-section view</span>
      <ul className="flex flex-col gap-1">
        {profiles.map((prof) => (
          <li key={prof.id}>
            <button
              type="button"
              onClick={() => onSelect(String(prof.id))}
              className={`w-full rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
                selected === String(prof.id)
                  ? 'bg-[#eef9ff] text-[#0a0a0a]'
                  : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
              }`}
            >
              {prof.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
