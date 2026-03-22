import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CompositionSubHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  compositionName: string;
  onExitEditMode?: () => void;
}

export function CompositionSubHeader({
  activeTab,
  onTabChange,
  compositionName,
  onExitEditMode,
}: CompositionSubHeaderProps) {
  return (
    <div className="flex items-center justify-between h-12 px-6 bg-white border-b border-border">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="h-9 bg-muted p-1 rounded-lg">
          <TabsTrigger value="general" className="px-3 py-1.5 text-sm rounded-md">
            General
          </TabsTrigger>
          <TabsTrigger value="geometry" className="px-3 py-1.5 text-sm rounded-md">
            <span className="flex items-center gap-1.5">
              Geometry
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
                !
              </span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="layup-mapping" className="px-3 py-1.5 text-sm rounded-md">
            Layup mapping
          </TabsTrigger>
          <TabsTrigger value="transversal-mapping" className="px-3 py-1.5 text-sm rounded-md">
            Transversal mapping
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Title */}
      <div className="flex-1 text-center">
        <span className="text-sm font-semibold text-foreground">
          New composition: {compositionName}
        </span>
      </div>

      {/* Exit */}
      <Button
        variant="outline"
        size="sm"
        onClick={onExitEditMode}
        className="gap-1.5"
      >
        Exit edit mode
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
