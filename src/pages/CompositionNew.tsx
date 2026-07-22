import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Redo2, Settings, Undo2 } from 'lucide-react';
import { MainNav } from '@/components/common/MainNav';
import { OccViewer } from '@/components/common/OccViewer';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayupPickerDialog } from '@/components/composition/LayupPickerDialog';
import {
  DEFAULT_MAPPING_POINTS,
  LayupMappingBezierDialog,
} from '@/components/composition/LayupMappingBezierDialog';
import { TransversalMappingSection } from '@/components/composition/TransversalMappingSection';
import { CoordinateGizmo, RenderToggle } from '@/components/common/ViewerOverlayControls';
import type { RenderMode } from '@/types';
import { CompositionGeneralTab } from '@/components/composition/CompositionGeneralTab';
import { CompositionGeometryTab } from '@/components/composition/CompositionGeometryTab';
import { LayupMappingTable, type LayupMapping } from '@/components/composition/LayupMappingTable';
import { COMPOSITIONS, createComposition, updateComposition } from '@/data/compositions';
import { nextLocalId } from '@/lib/utils';

const DEFAULT_UPPER_MAPPINGS: LayupMapping[] = [
  { id: 'u0', name: 'OUTER-SHELL', layupId: 'biax-skin-04' },
  { id: 'u1', name: 'MID-SHELL',   layupId: 'biax-skin-08' },
  { id: 'u2', name: 'INNER-SHELL', layupId: 'hyb-trans-12' },
];

const DEFAULT_LOWER_MAPPINGS: LayupMapping[] = [
  { id: 'l0', name: 'OUTER-SHELL copy', layupId: 'biax-skin-04' },
  { id: 'l1', name: 'MID-SHELL copy',   layupId: 'biax-skin-08' },
  { id: 'l2', name: 'INNER-SHELL copy', layupId: 'hyb-trans-12' },
];

export function CompositionNew() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const existing = id ? COMPOSITIONS.find((c) => c.id === id) : undefined;
  const [activeTab, setActiveTab] = useState<
    'general' | 'geometry' | 'layup-mapping' | 'transversal-mapping'
  >('general');
  const [renderMode, setRenderMode] = useState<RenderMode>('wireframe');

  // General
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [solidCore, setSolidCore] = useState(false);
  const [targetWeight, setTargetWeight] = useState('');

  // Geometry pick
  const [geomQuery, setGeomQuery] = useState('');
  const [geomView, setGeomView] = useState<'list' | 'grid'>('grid');
  const [selectedGeometryId, setSelectedGeometryId] = useState<string | null>(null);

  // Layup mapping — pre-filled with defaults for existing compositions
  const [upperMappings, setUpperMappings] = useState<LayupMapping[]>(
    existing ? DEFAULT_UPPER_MAPPINGS : [{ id: 'u0', name: '', layupId: null }],
  );
  const [lowerMappings, setLowerMappings] = useState<LayupMapping[]>(
    existing ? DEFAULT_LOWER_MAPPINGS : [{ id: 'l0', name: '', layupId: null }],
  );
  const [layupPicker, setLayupPicker] = useState<{
    side: 'upper' | 'lower';
    mappingId: string;
  } | null>(null);

  const layupPanelRef = useRef<HTMLDivElement>(null);

  const [bezierFor, setBezierFor] = useState<{
    side: 'upper' | 'lower';
    mappingId: string;
    anchorRight?: number;
    anchorTop?: number;
    anchorLeft?: number;
  } | null>(null);

  const pickerCurrentLayupId = (() => {
    if (!layupPicker) return null;
    const arr = layupPicker.side === 'upper' ? upperMappings : lowerMappings;
    return arr.find((m) => m.id === layupPicker.mappingId)?.layupId ?? null;
  })();

  const bezierTitle = (() => {
    if (!bezierFor) return '';
    const arr = bezierFor.side === 'upper' ? upperMappings : lowerMappings;
    const m = arr.find((x) => x.id === bezierFor.mappingId);
    const sideLabel = bezierFor.side === 'upper' ? 'Upper side' : 'Lower side';
    return `${sideLabel} / ${m?.name?.trim() || 'untitled'}`;
  })();

  const bezierPoints = (() => {
    if (!bezierFor) return DEFAULT_MAPPING_POINTS;
    const arr = bezierFor.side === 'upper' ? upperMappings : lowerMappings;
    return arr.find((x) => x.id === bezierFor.mappingId)?.points ?? DEFAULT_MAPPING_POINTS;
  })();

  function duplicateMapping(side: 'upper' | 'lower', id: string) {
    const setter = side === 'upper' ? setUpperMappings : setLowerMappings;
    setter((arr) => {
      const idx = arr.findIndex((m) => m.id === id);
      if (idx === -1) return arr;
      const src = arr[idx];
      const dup: LayupMapping = {
        ...src,
        id: nextLocalId(side[0]),
        name: src.name ? `${src.name} (copy)` : '',
      };
      const next = [...arr];
      next.splice(idx + 1, 0, dup);
      return next;
    });
  }

  function reorderMapping(side: 'upper' | 'lower', fromIdx: number, toIdx: number) {
    const setter = side === 'upper' ? setUpperMappings : setLowerMappings;
    setter((arr) => {
      const next = [...arr];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }

  const titleText = name.trim() || existing?.name || 'New composition';

  function handleGeneralSubmit() {
    if (existing) {
      updateComposition(existing.id, { name, description });
      navigate('/composition');
      return;
    }
    // Mock stand-in for a POST: append to the list, then open the new composition.
    const composition = createComposition(name, description);
    navigate(`/composition/${composition.id}`);
  }

  /** Save (create or update) then go back to the list — called by Exit edit mode. */
  function handleExit() {
    if (existing) {
      updateComposition(existing.id, { name, description });
    } else if (name.trim()) {
      createComposition(name, description);
    }
    navigate('/composition');
  }

  function addUpper() {
    setUpperMappings((arr) => [
      ...arr,
      { id: nextLocalId('u'), name: '', layupId: null },
    ]);
  }
  function addLower() {
    setLowerMappings((arr) => [
      ...arr,
      { id: nextLocalId('l'), name: '', layupId: null },
    ]);
  }
  function updateMapping(side: 'upper' | 'lower', id: string, next: Partial<LayupMapping>) {
    const setter = side === 'upper' ? setUpperMappings : setLowerMappings;
    setter((arr) => arr.map((m) => (m.id === id ? { ...m, ...next } : m)));
  }
  function deleteMapping(side: 'upper' | 'lower', id: string) {
    const setter = side === 'upper' ? setUpperMappings : setLowerMappings;
    setter((arr) => arr.filter((m) => m.id !== id));
  }
  function copyUpperToLower() {
    setLowerMappings(upperMappings.map((m) => ({ ...m, id: nextLocalId('l-copy'), name: m.name ? `${m.name} copy` : '' })));
  }
  function copyLowerToUpper() {
    setUpperMappings(lowerMappings.map((m) => ({ ...m, id: nextLocalId('u-copy'), name: m.name ? `${m.name} copy` : '' })));
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <MainNav />

      {/* Body: full-bleed OCC canvas + floating overlays */}
      <main className="relative flex-1 overflow-hidden">
        {/* OCC canvas fills the whole area */}
        <OccViewer wireframe={renderMode === 'wireframe'} className="absolute inset-0 w-full h-full" />

      {/* Sub-toolbar floating above the canvas */}
      <div className="absolute inset-x-0 top-0 z-40 h-[52px] border-b border-[#e5e7eb]/70">
        <div className="absolute inset-y-0 left-4 flex items-center">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as typeof activeTab); setBezierFor(null); }} className="h-9">
            <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
              {[
                { value: 'general', label: 'General' },
                { value: 'geometry', label: 'Geometry' },
                { value: 'layup-mapping', label: 'Layup mapping' },
                { value: 'transversal-mapping', label: 'Transversal mapping' },
              ].map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
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
            <Check className="h-4 w-4 text-[#737373]" strokeWidth={2} />
            <span className="text-[14px] leading-5 text-[#737373]">Saved</span>
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
            onClick={handleExit}
            className="inline-flex h-8 items-center rounded-md bg-[#f1f5f9]/95 px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:bg-[#e2e8f0]"
          >
            Back to Compositions
          </button>
        </div>
      </div>

      {/* Render toggle + settings (top-center, below sub-toolbar) */}
      <div className={`absolute left-1/2 top-[60px] z-20 flex -translate-x-1/2 items-center gap-2 pt-2${activeTab === 'geometry' ? ' hidden' : ''}`}>
        <RenderToggle value={renderMode} onChange={setRenderMode} />
        <button
          type="button"
          aria-label="Viewer settings"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e7eb] bg-white/95 text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:bg-[#f1f5f9]"
        >
          <Settings className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Coordinate gizmo (bottom-left) */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-20">
        <CoordinateGizmo />
      </div>

      {/* Tab content panels — pointer-events-none on wrapper so the canvas
           behind receives orbit/zoom events; each panel restores pointer-events */}
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 top-[60px]">
        {activeTab === 'general' && (
          <CompositionGeneralTab
            name={name}
            onNameChange={setName}
            description={description}
            onDescriptionChange={setDescription}
            solidCore={solidCore}
            onSolidCoreChange={setSolidCore}
            targetWeight={targetWeight}
            onTargetWeightChange={setTargetWeight}
            onSubmit={handleGeneralSubmit}
          />
        )}

        {activeTab === 'geometry' && (
          <CompositionGeometryTab
            geomQuery={geomQuery}
            onGeomQueryChange={setGeomQuery}
            geomView={geomView}
            onGeomViewChange={setGeomView}
            selectedGeometryId={selectedGeometryId}
            onSelectGeometry={setSelectedGeometryId}
          />
        )}

        {/* Always mounted — hidden instead of unmounted so mapping state survives tab switches */}
        <div ref={layupPanelRef} className={`pointer-events-auto flex max-h-[calc(100vh-145px)] w-full max-w-[560px] flex-col gap-6 overflow-y-auto rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur-sm${activeTab !== 'layup-mapping' ? ' hidden' : ''}`}>
            <LayupMappingTable
              title="Upper side"
              copyLabel="Copy to lower side"
              mappings={upperMappings}
              activeMappingId={bezierFor?.side === 'upper' ? bezierFor.mappingId : null}
              onAdd={addUpper}
              onDelete={(id) => deleteMapping('upper', id)}
              onUpdate={(id, next) => updateMapping('upper', id, next)}
              onCopy={copyUpperToLower}
              onDuplicate={(id) => duplicateMapping('upper', id)}
              onOpenBezier={(id) => {
                const rect = layupPanelRef.current?.getBoundingClientRect();
                setBezierFor({ side: 'upper', mappingId: id, anchorRight: rect?.right, anchorTop: rect?.top, anchorLeft: rect?.left });
              }}
              onReorder={(from, to) => reorderMapping('upper', from, to)}
              onPickLayup={(id) => setLayupPicker({ side: 'upper', mappingId: id })}
            />

            <LayupMappingTable
              title="Lower side"
              copyLabel="Copy to upper side"
              mappings={lowerMappings}
              activeMappingId={bezierFor?.side === 'lower' ? bezierFor.mappingId : null}
              onAdd={addLower}
              onDelete={(id) => deleteMapping('lower', id)}
              onUpdate={(id, next) => updateMapping('lower', id, next)}
              onCopy={copyLowerToUpper}
              onDuplicate={(id) => duplicateMapping('lower', id)}
              onOpenBezier={(id) => {
                const rect = layupPanelRef.current?.getBoundingClientRect();
                setBezierFor({ side: 'lower', mappingId: id, anchorRight: rect?.right, anchorTop: rect?.top, anchorLeft: rect?.left });
              }}
              onReorder={(from, to) => reorderMapping('lower', from, to)}
              onPickLayup={(id) => setLayupPicker({ side: 'lower', mappingId: id })}
            />
          </div>

        {/* Always mounted — hidden instead of unmounted so internal state survives tab switches */}
        <div className={`pointer-events-auto max-h-[calc(100vh-145px)] overflow-y-auto${activeTab !== 'transversal-mapping' ? ' hidden' : ''}`}>
          <TransversalMappingSection
            useDefaultData={!!existing}
            upperMappingNames={upperMappings.map((m) => m.name)}
          />
        </div>
      </div>
      </main>

      <LayupPickerDialog
        open={layupPicker !== null}
        currentLayupId={pickerCurrentLayupId}
        onSelect={(layupId) => {
          if (layupPicker) {
            updateMapping(layupPicker.side, layupPicker.mappingId, { layupId });
            const rect = layupPanelRef.current?.getBoundingClientRect();
            setBezierFor({
              side: layupPicker.side,
              mappingId: layupPicker.mappingId,
              anchorRight: rect?.right,
              anchorTop: rect?.top,
              anchorLeft: rect?.left,
            });
          }
          setLayupPicker(null);
        }}
        onClose={() => setLayupPicker(null)}
      />

      {bezierFor && (
        <LayupMappingBezierDialog
          key={`${bezierFor.side}-${bezierFor.mappingId}`}
          open
          title={bezierTitle}
          points={bezierPoints}
          onChange={(pts) => updateMapping(bezierFor.side, bezierFor.mappingId, { points: pts })}
          anchorRight={bezierFor.anchorRight}
          anchorTop={bezierFor.anchorTop}
          anchorLeft={bezierFor.anchorLeft}
          onClose={() => setBezierFor(null)}
        />
      )}
    </div>
  );
}
