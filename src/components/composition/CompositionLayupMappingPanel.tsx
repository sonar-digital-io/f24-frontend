import { forwardRef } from 'react';
import { LayupMappingTable, type LayupMapping } from '@/components/composition/LayupMappingTable';

interface CompositionLayupMappingPanelProps {
  visible: boolean;
  upperMappings: LayupMapping[];
  lowerMappings: LayupMapping[];
  layupOptions: { id: number; name: string }[];
  activeBezierSide: 'upper' | 'lower' | null;
  activeBezierMappingId: string | null;
  onAdd: (side: 'upper' | 'lower') => void;
  onDelete: (side: 'upper' | 'lower', id: string) => void;
  onUpdate: (side: 'upper' | 'lower', id: string, next: Partial<LayupMapping>) => void;
  onCopyUpperToLower: () => void;
  onCopyLowerToUpper: () => void;
  onDuplicate: (side: 'upper' | 'lower', id: string) => void;
  onOpenBezier: (side: 'upper' | 'lower', id: string) => void;
  onReorder: (side: 'upper' | 'lower', from: number, to: number) => void;
  onPickLayup: (side: 'upper' | 'lower', id: string) => void;
}

/**
 * Upper + lower side layup-mapping tables. Always mounted (visibility via
 * `hidden`, not conditional render) so table/bezier state survives tab
 * switches — the ref is forwarded so the parent can anchor the bezier dialog
 * popover to this panel's bounding rect.
 */
export const CompositionLayupMappingPanel = forwardRef<HTMLDivElement, CompositionLayupMappingPanelProps>(
  function CompositionLayupMappingPanel(
    {
      visible,
      upperMappings,
      lowerMappings,
      layupOptions,
      activeBezierSide,
      activeBezierMappingId,
      onAdd,
      onDelete,
      onUpdate,
      onCopyUpperToLower,
      onCopyLowerToUpper,
      onDuplicate,
      onOpenBezier,
      onReorder,
      onPickLayup,
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={`pointer-events-auto flex max-h-[calc(100vh_-_145px)] w-full max-w-[560px] flex-col gap-6 overflow-y-auto rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur-sm${visible ? '' : ' hidden'}`}
      >
        <LayupMappingTable
          title="Upper side"
          copyLabel="Copy to lower side"
          mappings={upperMappings}
          layupOptions={layupOptions}
          activeMappingId={activeBezierSide === 'upper' ? activeBezierMappingId : null}
          onAdd={() => onAdd('upper')}
          onDelete={(id) => onDelete('upper', id)}
          onUpdate={(id, next) => onUpdate('upper', id, next)}
          onCopy={onCopyUpperToLower}
          onDuplicate={(id) => onDuplicate('upper', id)}
          onOpenBezier={(id) => onOpenBezier('upper', id)}
          onReorder={(from, to) => onReorder('upper', from, to)}
          onPickLayup={(id) => onPickLayup('upper', id)}
        />

        <LayupMappingTable
          title="Lower side"
          copyLabel="Copy to upper side"
          mappings={lowerMappings}
          layupOptions={layupOptions}
          activeMappingId={activeBezierSide === 'lower' ? activeBezierMappingId : null}
          onAdd={() => onAdd('lower')}
          onDelete={(id) => onDelete('lower', id)}
          onUpdate={(id, next) => onUpdate('lower', id, next)}
          onCopy={onCopyLowerToUpper}
          onDuplicate={(id) => onDuplicate('lower', id)}
          onOpenBezier={(id) => onOpenBezier('lower', id)}
          onReorder={(from, to) => onReorder('lower', from, to)}
          onPickLayup={(id) => onPickLayup('lower', id)}
        />
      </div>
    );
  },
);
