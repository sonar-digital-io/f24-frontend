import type { ReactNode } from 'react';
import { FoldableSectionList, type FoldableSectionListProps } from '@/components/geometry/FoldableSectionList';

interface FoldablePanelShellProps<K extends string> extends FoldableSectionListProps<K> {
  header: ReactNode;
}

/**
 * Floating panel wrapper (fixed max-width that grows once expanded) + sticky
 * header + `FoldableSectionList` body — shared by `ProfileDistributionPanel`
 * and `StackingPanel`. Each caller only supplies its own header content.
 */
export function FoldablePanelShell<K extends string>({ header, ...sectionListProps }: FoldablePanelShellProps<K>) {
  const { folded } = sectionListProps;
  return (
    <div
      className={`flex w-full ${folded ? 'max-w-[516px]' : 'max-w-[924px]'} max-h-[calc(100vh_-_128px)] flex-col rounded-[14px] border border-[#e5e7eb] bg-white/95 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-[max-width] duration-150`}
    >
      {header}
      <FoldableSectionList {...sectionListProps} />
    </div>
  );
}
