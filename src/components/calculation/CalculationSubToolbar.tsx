import { Check, Play, Redo2, Undo2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Tab } from '@/types';

const TRIGGER_CLS =
  'h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]';

interface CalculationSubToolbarProps {
  activeTab: Tab;
  onActiveTabChange: (tab: Tab) => void;
  analysisMethod: string;
  isModalMethod: boolean;
  titleText: string;
  canRunCalculation: boolean;
  onExit: () => void;
  onRunCalculation: () => void;
}

export function CalculationSubToolbar({
  activeTab,
  onActiveTabChange,
  analysisMethod,
  isModalMethod,
  titleText,
  canRunCalculation,
  onExit,
  onRunCalculation,
}: CalculationSubToolbarProps) {
  return (
    <div className="relative flex h-[52px] w-full shrink-0 items-center justify-between bg-[#f8fafc] px-4 py-2">
      <Tabs
        value={(() => {
          if (analysisMethod === 'Modal' && (activeTab === 'load-group' || activeTab === 'fatigue-profile')) return 'configuration';
          if (isModalMethod && analysisMethod !== 'Modal' && activeTab === 'fatigue-profile') return 'composition';
          if (analysisMethod === 'Aero only' && activeTab === 'fatigue-profile') return 'load-group';
          return activeTab;
        })()}
        onValueChange={(v) => onActiveTabChange(v as Tab)}
        className="h-9 shrink-0"
      >
        <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
          <TabsTrigger value="general" className={TRIGGER_CLS}>
            General
          </TabsTrigger>
          <TabsTrigger value="composition" className={TRIGGER_CLS}>
            {analysisMethod === 'Aero only' ? 'Geometry / Composition' : 'Composition'}
          </TabsTrigger>
          <TabsTrigger value="configuration" className={TRIGGER_CLS}>
            Configuration
          </TabsTrigger>
          <div className="group relative">
            <TabsTrigger
              value="load-group"
              disabled={analysisMethod === 'Modal'}
              className={`${TRIGGER_CLS} data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40`}
            >
              Load group
            </TabsTrigger>
            {analysisMethod === 'Modal' && (
              <div className="pointer-events-none absolute left-1/2 top-full z-[100] mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#171717] px-2.5 py-1.5 text-[12px] leading-4 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                Not applicable for Modal calculation
              </div>
            )}
          </div>
          <div className="group relative">
            <TabsTrigger
              value="fatigue-profile"
              disabled={analysisMethod === 'Aero only' || isModalMethod}
              className={`${TRIGGER_CLS} data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40`}
            >
              Fatigue profile
            </TabsTrigger>
            {(analysisMethod === 'Aero only' || isModalMethod) && (
              <div className="pointer-events-none absolute left-1/2 top-full z-[100] mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#171717] px-2.5 py-1.5 text-[12px] leading-4 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                {isModalMethod ? 'Not applicable for Modal calculation' : 'Not applicable for Aero-only calculation'}
              </div>
            )}
          </div>
        </TabsList>
      </Tabs>

      <h1 className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-[18px] font-semibold leading-7 text-[#0a0a0a] lg:block">
        {titleText}
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
          onClick={onExit}
          className="inline-flex h-8 items-center rounded-md bg-[#f1f5f9] px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0]"
        >
          Back to Calculations
        </button>
        <button
          type="button"
          onClick={onRunCalculation}
          disabled={!canRunCalculation}
          className="inline-flex h-8 items-center gap-2 rounded-md bg-[#006496] px-3 py-2 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Run calculation
          <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
        </button>
      </div>
    </div>
  );
}
