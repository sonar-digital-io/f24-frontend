import { Check, Redo2, Undo2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TRIGGER_CLASS =
  'h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]';

export interface EditPageTab {
  value: string;
  label: string;
}

interface EditPageToolbarProps {
  tabs: EditPageTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  title: string;
  backLabel: string;
  onBack: () => void;
}

/**
 * Sub-toolbar row (tabs + centered title + Saved/Undo/Redo/Back) used by the
 * plain (non-floating-canvas) edit pages: MaterialNew, LayupNew, LoadGroupNew.
 * CompositionNew/GeometryEdit float their own variant above a 3D canvas and
 * don't reuse this — their positioning/backdrop styling differs too much.
 */
export function EditPageToolbar({
  tabs,
  activeTab,
  onTabChange,
  title,
  backLabel,
  onBack,
}: EditPageToolbarProps) {
  return (
    <div className="relative flex h-[52px] w-full shrink-0 items-center justify-between bg-[#f8fafc] px-4 py-2">
      <Tabs value={activeTab} onValueChange={onTabChange} className="h-9 shrink-0">
        <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className={TRIGGER_CLASS}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <h1 className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-[18px] font-semibold leading-7 text-[#0a0a0a] lg:block">
        {title}
      </h1>

      <div className="flex shrink-0 items-center gap-4">
        <div className="flex items-center gap-[6px]">
          <Check className="h-4 w-4 text-[#737373]" strokeWidth={2} />
          <span className="text-[14px] leading-5 text-[#737373]">Saved</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Undo"
            className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f5f9] text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0] hover:text-[#0a0a0a]"
          >
            <Undo2 className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Redo"
            className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f5f9] text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0] hover:text-[#0a0a0a]"
          >
            <Redo2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-8 items-center rounded-md bg-[#f1f5f9] px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0]"
        >
          {backLabel}
        </button>
      </div>
    </div>
  );
}
