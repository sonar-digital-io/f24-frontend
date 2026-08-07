import { Check, Undo2, Redo2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TABS = [
  { value: 'create', label: 'Project configuration' },
  { value: 'global-properties', label: 'Global properties' },
  { value: 'profile-distribution', label: 'Profile distribution' },
  { value: 'profiles', label: 'Profiles' },
  { value: 'stacking', label: 'Stacking' },
  { value: 'spars', label: 'Spars' },
];

interface GeometryEditToolbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isNew: boolean;
  onExit: () => void;
}

/** Floating sub-toolbar: tab pill on the left, saved-indicator + undo/redo + exit on the right. */
export function GeometryEditToolbar({ activeTab, onTabChange, isNew, onExit }: GeometryEditToolbarProps) {
  return (
    <div className="absolute inset-x-0 top-0 z-30 h-[52px]">
      <div className="absolute inset-y-0 left-4 flex items-center">
        <Tabs value={activeTab} onValueChange={onTabChange} className="h-9">
          <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6]/95 p-[3px] backdrop-blur-sm">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                disabled={isNew && tab.value !== 'create'}
                className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] disabled:pointer-events-none disabled:opacity-40"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="absolute inset-y-0 right-4 flex items-center gap-4">
        {!isNew && (
          <div className="flex items-center gap-[6px]">
            <Check className="h-4 w-4 text-[#737373]" strokeWidth={2} />
            <span className="text-[14px] leading-5 text-[#737373]">Saved</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Undo"
            className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f5f9]/95 text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:bg-[#e2e8f0] hover:text-[#0a0a0a]"
          >
            <Undo2 className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Redo"
            className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f5f9]/95 text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:bg-[#e2e8f0] hover:text-[#0a0a0a]"
          >
            <Redo2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex h-8 items-center rounded-md bg-[#f1f5f9]/95 px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:bg-[#e2e8f0]"
        >
          Back to Geometries
        </button>
      </div>
    </div>
  );
}
