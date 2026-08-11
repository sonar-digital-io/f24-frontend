import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

/** Icon-prefixed search box — the "search row" atop a picker table (Calculation's
 *  Composition/Load group/Fatigue profile tabs). */
export function SearchInput({ value, onChange, placeholder, className }: SearchInputProps) {
  return (
    <div className={`relative max-w-[340px] ${className ?? ''}`}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-md border-[#e2e8f0] pl-8 text-[14px]"
      />
    </div>
  );
}
