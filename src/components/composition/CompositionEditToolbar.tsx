import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SaveStatusAndExit,
  type SaveStatus,
} from '@/components/common/layout/EditPageToolbarActions';

export type CompositionTab =
  'general' | 'geometry' | 'layup' | 'layup-mapping' | 'transversal-mapping' | 'preview';

const TABS: { value: CompositionTab; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'geometry', label: 'Geometry' },
  { value: 'layup', label: 'Layup' },
  { value: 'layup-mapping', label: 'Layup mapping' },
  { value: 'transversal-mapping', label: 'Transversal mapping' },
  { value: 'preview', label: 'Preview' },
];

/** These tabs map a layup onto the blade, so they stay unreachable until at
 *  least one layup has been saved. */
const GATED_UNTIL_LAYUP_SAVED: CompositionTab[] = ['layup-mapping', 'transversal-mapping'];

/** Preview needs a geometry to render against. */
const GATED_UNTIL_GEOMETRY_SELECTED: CompositionTab[] = ['preview'];

interface CompositionEditToolbarProps {
  activeTab: CompositionTab;
  onTabChange: (tab: CompositionTab) => void;
  titleText: string;
  onExit: () => void;
  saveStatus?: SaveStatus;
  /** Only 'general' is available until the composition has been saved at least once. */
  isSaved: boolean;
  layupsSaved: boolean;
  geometrySelected: boolean;
  /** An autosave is in flight — lock every tab but the active one so the
   *  user can't switch away mid-save. */
  savingLocked: boolean;
}

/** Floating sub-toolbar shared by every CompositionNew tab — same tab-pill/title/
 *  Saved-indicator/Exit layout as GeometryEditToolbar. */
export function CompositionEditToolbar({
  activeTab,
  onTabChange,
  titleText,
  onExit,
  saveStatus,
  isSaved,
  layupsSaved,
  geometrySelected,
  savingLocked,
}: CompositionEditToolbarProps) {
  return (
    <div className="absolute inset-x-0 top-0 z-40 h-[52px] border-b border-[#e5e7eb]/70">
      <div className="absolute inset-y-0 left-4 flex items-center">
        <Tabs
          value={activeTab}
          onValueChange={(v) => onTabChange(v as CompositionTab)}
          className="h-9"
        >
          <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                disabled={
                  (!isSaved && t.value !== 'general') ||
                  (!layupsSaved && GATED_UNTIL_LAYUP_SAVED.includes(t.value)) ||
                  (!geometrySelected && GATED_UNTIL_GEOMETRY_SELECTED.includes(t.value)) ||
                  (savingLocked && t.value !== activeTab)
                }
                className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] disabled:pointer-events-none disabled:opacity-40"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <h1 className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-[18px] font-semibold leading-7 text-[#0a0a0a] lg:block">
        {titleText}
      </h1>

      <div className="absolute inset-y-0 right-4 flex items-center">
        <SaveStatusAndExit status={saveStatus} onExit={onExit} floating />
      </div>
    </div>
  );
}
