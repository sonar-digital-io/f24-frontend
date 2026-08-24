import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ListSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Wrapper width — list pages use a couple of fixed widths (w-[280px], w-[384px]). */
  widthClassName?: string;
}

/** Icon-prefixed search box atop a list page's table (Material, Geometry,
 *  Layup, Composition, LoadGroup, Calculation) — larger than the picker-tab
 *  variant (`SearchInput`) used inside CalculationNew's wizard tabs. */
export function ListSearchInput({ value, onChange, placeholder = 'Search', widthClassName = 'w-[280px]' }: ListSearchInputProps) {
  return (
    <div className={`relative ${widthClassName}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-md border-[#e2e8f0] bg-transparent pl-9 text-[14px]"
      />
    </div>
  );
}
