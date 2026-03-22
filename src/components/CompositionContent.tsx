import { FoldHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LayupMappingSection } from '@/components/LayupMappingSection';

const defaultMappings = [
  { index: 0, name: 'Placeholder', layup: 'Select' },
];

export function CompositionContent() {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-6 space-y-8">
        {/* Collapse Button */}
        <Button size="icon" className="w-9 h-9">
          <FoldHorizontal className="w-4 h-4" />
        </Button>

        {/* Upper Side */}
        <LayupMappingSection
          side="upper"
          mappings={defaultMappings}
          onCopyToOtherSide={() => {}}
          onAddMapping={() => {}}
        />

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Lower Side */}
        <LayupMappingSection
          side="lower"
          mappings={defaultMappings}
          onCopyToOtherSide={() => {}}
          onAddMapping={() => {}}
        />
      </CardContent>
    </Card>
  );
}
