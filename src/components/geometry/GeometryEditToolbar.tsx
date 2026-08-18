import { Check, Loader2, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SaveStatus } from '@/components/common/layout/EditPageToolbarActions';

const TABS = [
  { value: 'create', label: 'Project configuration' },
  { value: 'global-properties', label: 'Global properties' },
  { value: 'profile-distribution', label: 'Profile distribution' },
  { value: 'profiles', label: 'Profiles' },
  { value: 'stacking', label: 'Stacking' },
  { value: 'spars', label: 'Spars' },
];

/** These tabs build on the global properties (e.g. nominal/root radius), so they stay
 *  unreachable until that tab's mandatory fields are filled in and autosaved. */
const GATED_UNTIL_GLOBAL_PROPERTIES_SAVED = ['profile-distribution', 'profiles', 'stacking', 'spars'];

interface GeometryEditToolbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isNew: boolean;
  globalPropertiesSaved: boolean;
  /** Omitted (e.g. while isNew) hides the indicator entirely rather than falsely claiming a status. */
  status?: SaveStatus;
  onExit: () => void;
}

/** Floating sub-toolbar: tab pill on the left, saved-indicator + exit on the right. */
export function GeometryEditToolbar({
  activeTab,
  onTabChange,
  isNew,
  globalPropertiesSaved,
  status,
  onExit,
}: GeometryEditToolbarProps) {
  return (
    <div className="absolute inset-x-0 top-0 z-30 h-[52px]">
      <div className="absolute inset-y-0 left-4 flex items-center">
        <Tabs value={activeTab} onValueChange={onTabChange} className="h-9">
          <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6]/95 p-[3px] backdrop-blur-sm">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                disabled={
                  (isNew && tab.value !== 'create') ||
                  (!globalPropertiesSaved && GATED_UNTIL_GLOBAL_PROPERTIES_SAVED.includes(tab.value))
                }
                className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] disabled:pointer-events-none disabled:opacity-40"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="absolute inset-y-0 right-4 flex items-center gap-4">
        <div className="flex items-center gap-[6px]">
          {status === 'saving' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-[#737373]" strokeWidth={2} />
              <span className="text-[14px] leading-5 text-[#737373]">Saving…</span>
            </>
          ) : status === 'not-saved' ? (
            <>
              <X className="h-4 w-4 text-[#dc2626]" strokeWidth={2} />
              <span className="text-[14px] leading-5 text-[#dc2626]">Not saved</span>
            </>
          ) : status === 'saved' ? (
            <>
              <Check className="h-4 w-4 text-[#737373]" strokeWidth={2} />
              <span className="text-[14px] leading-5 text-[#737373]">Saved</span>
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex h-8 items-center rounded-md bg-[#f1f5f9]/95 px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:bg-[#e2e8f0]"
        >
          Exit edit mode
        </button>
      </div>
    </div>
  );
}
