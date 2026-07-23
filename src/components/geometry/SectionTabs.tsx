import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TRIGGER_CLASS =
  'h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]';

interface SectionTabsProps<K extends string> {
  sectionKeys: K[];
  sectionLabels: Record<K, string>;
  value: K;
  onValueChange: (value: K) => void;
}

/** Sub-tab row switching between a panel's sections, shared by ProfileDistributionPanel/StackingPanel. */
export function SectionTabs<K extends string>({
  sectionKeys,
  sectionLabels,
  value,
  onValueChange,
}: SectionTabsProps<K>) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as K)}>
      <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
        {sectionKeys.map((key) => (
          <TabsTrigger key={key} value={key} className={TRIGGER_CLASS}>
            {sectionLabels[key]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
