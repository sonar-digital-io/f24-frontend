import type { ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditPageToolbarActions, type SaveStatus } from '@/components/common/layout/EditPageToolbarActions';

const TRIGGER_CLASS =
  'h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]';

export interface EditPageTab {
  value: string;
  label: string;
  disabled?: boolean;
}

interface EditPageToolbarProps {
  tabs: EditPageTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  title: string;
  onBack: () => void;
  /** Passed straight through to EditPageToolbarActions — see there for the default. */
  status?: SaveStatus;
  /** Extra button(s) rendered after the "Exit edit mode" button, e.g. MaterialNew's "Create material". */
  actions?: ReactNode;
}

/**
 * Sub-toolbar row (tabs + centered title + Saved/Exit) used by the plain
 * (non-floating-canvas) edit pages: MaterialNew, LayupNew, LoadGroupNew.
 * CompositionNew/GeometryEdit float their own variant above a 3D canvas and
 * don't reuse this — their positioning/backdrop styling differs too much.
 */
export function EditPageToolbar({
  tabs,
  activeTab,
  onTabChange,
  title,
  onBack,
  status,
  actions,
}: EditPageToolbarProps) {
  return (
    <div className="relative flex h-[52px] w-full shrink-0 items-center justify-between bg-[#f8fafc] px-4 py-2">
      <Tabs value={activeTab} onValueChange={onTabChange} className="h-9 shrink-0">
        <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              disabled={tab.disabled}
              className={`${TRIGGER_CLASS} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <EditPageToolbarActions title={title} onBack={onBack} status={status}>
        {actions}
      </EditPageToolbarActions>
    </div>
  );
}
