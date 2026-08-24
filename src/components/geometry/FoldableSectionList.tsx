import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface FoldableSectionListProps<K extends string> {
  folded: boolean;
  sectionKeys: K[];
  sectionLabels: Record<K, string>;
  openSections: Record<K, boolean>;
  onToggleSection: (key: K) => void;
  activeTab: K;
  renderSectionBody: (key: K) => ReactNode;
}

/**
 * Scrollable section area shared by ProfileDistributionPanel/StackingPanel:
 * folded mode stacks every section as an accordion, expanded mode shows only
 * the active sub-tab's section.
 */
export function FoldableSectionList<K extends string>({
  folded,
  sectionKeys,
  sectionLabels,
  openSections,
  onToggleSection,
  activeTab,
  renderSectionBody,
}: FoldableSectionListProps<K>) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
      {folded ? (
        <div className="flex flex-col gap-3">
          {sectionKeys.map((key) => {
            const open = openSections[key];
            return (
              <div key={key} className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
                <button
                  type="button"
                  onClick={() => onToggleSection(key)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[#f9fafb]"
                >
                  <span className="text-[16px] font-semibold leading-6 text-[#0a0a0a]">
                    {sectionLabels[key]}
                  </span>
                  {open ? (
                    <ChevronUp className="h-4 w-4 text-[#6b7280]" strokeWidth={2} />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#6b7280]" strokeWidth={2} />
                  )}
                </button>
                {open && <div className="border-t border-[#e5e7eb] p-4">{renderSectionBody(key)}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        renderSectionBody(activeTab)
      )}
    </div>
  );
}
