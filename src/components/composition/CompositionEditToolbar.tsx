import { Check, Circle, Loader2, Redo2, Undo2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type CompositionTab =
  | 'general'
  | 'geometry'
  | 'layup'
  | 'layup-mapping'
  | 'transversal-mapping'
  | 'preview';

export type CompositionSaveStatus = 'unsaved' | 'saving' | 'saved';

const TABS: { value: CompositionTab; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'geometry', label: 'Geometry' },
  { value: 'layup', label: 'Layup' },
  { value: 'layup-mapping', label: 'Layup mapping' },
  { value: 'transversal-mapping', label: 'Transversal mapping' },
  { value: 'preview', label: 'Preview' },
];

const SAVE_STATUS_DISPLAY: Record<CompositionSaveStatus, { icon: typeof Check; label: string; spin?: boolean }> = {
  unsaved: { icon: Circle, label: 'Not saved yet' },
  saving: { icon: Loader2, label: 'Saving…', spin: true },
  saved: { icon: Check, label: 'Saved' },
};

interface CompositionEditToolbarProps {
  activeTab: CompositionTab;
  onTabChange: (tab: CompositionTab) => void;
  titleText: string;
  onExit: () => void;
  saveStatus: CompositionSaveStatus;
  /** Only 'general' is available until the composition has been saved at least once. */
  isSaved: boolean;
  onSaveLayupMapping: () => void;
  layupMappingSavePending: boolean;
}

/** Floating sub-toolbar shared by every CompositionNew tab. */
export function CompositionEditToolbar({
  activeTab,
  onTabChange,
  titleText,
  onExit,
  saveStatus,
  isSaved,
  onSaveLayupMapping,
  layupMappingSavePending,
}: CompositionEditToolbarProps) {
  const { icon: StatusIcon, label: statusLabel, spin } = SAVE_STATUS_DISPLAY[saveStatus];
  return (
    <div className="absolute inset-x-0 top-0 z-40 h-[52px] border-b border-[#e5e7eb]/70">
      <div className="absolute inset-y-0 left-4 flex items-center">
        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as CompositionTab)} className="h-9">
          <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                disabled={!isSaved && t.value !== 'general'}
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

      <div className="absolute inset-y-0 right-4 flex items-center gap-4">
        <div className="flex items-center gap-[6px]">
          <StatusIcon className={`h-4 w-4 text-[#737373] ${spin ? 'animate-spin' : ''}`} strokeWidth={2} />
          <span className="text-[14px] leading-5 text-[#737373]">{statusLabel}</span>
        </div>
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
          Back to Compositions
        </button>
        {activeTab === 'layup-mapping' && (
          <button
            type="button"
            onClick={onSaveLayupMapping}
            disabled={layupMappingSavePending}
            className="inline-flex h-8 items-center gap-2 rounded-md bg-[#006496] px-3 py-2 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {layupMappingSavePending ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
    </div>
  );
}
