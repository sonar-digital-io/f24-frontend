import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayupMapping {
  index: number;
  name: string;
  layup: string;
}

interface LayupMappingSectionProps {
  side: 'upper' | 'lower';
  mappings: LayupMapping[];
  onCopyToOtherSide?: () => void;
  onAddMapping?: () => void;
}

export function LayupMappingSection({
  side,
  mappings,
  onCopyToOtherSide,
  onAddMapping,
}: LayupMappingSectionProps) {
  const otherSide = side === 'upper' ? 'lower' : 'upper';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground capitalize">
          {side} side
        </h3>
        <Button variant="outline" size="sm" onClick={onCopyToOtherSide}>
          Copy to {otherSide} side
        </Button>
      </div>

      {/* Table */}
      <div className="w-[537px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-9 h-10 px-3 text-left font-medium text-muted-foreground">&nbsp;</th>
              <th className="w-[85px] h-10 px-3 text-left font-medium text-muted-foreground">Index</th>
              <th className="w-[120px] h-10 px-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="w-[200px] h-10 px-3 text-left font-medium text-muted-foreground">Layup</th>
              <th className="w-24 h-10 px-3 text-left font-medium text-muted-foreground">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping) => (
              <tr key={mapping.index} className="border-b border-border">
                <td className="h-[52px] px-3">&nbsp;</td>
                <td className="h-[52px] px-3 font-medium text-foreground">{mapping.index}</td>
                <td className="h-[52px] px-3 text-muted-foreground">{mapping.name}</td>
                <td className="h-[52px] px-3 text-muted-foreground">{mapping.layup}</td>
                <td className="h-[52px] px-3">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Button */}
      <Button variant="outline" size="sm" onClick={onAddMapping} className="gap-1.5">
        <Plus className="w-4 h-4" />
        Add layup mapping
      </Button>
    </div>
  );
}
