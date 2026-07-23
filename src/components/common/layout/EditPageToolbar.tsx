import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditPageToolbarActions } from '@/components/common/layout/EditPageToolbarActions';

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

      <EditPageToolbarActions title={title} backLabel={backLabel} onBack={onBack} />
    </div>
  );
}
