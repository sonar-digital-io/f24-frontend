import { useRef, useState } from 'react';
import { ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlyStackViz } from '@/components/layup/PlyStackViz';
import { BufferedNumberInput } from '@/components/common/BufferedNumberInput';
import { nextLocalId } from '@/lib/utils';
import { MaterialPickerDialog } from '@/components/layup/MaterialPickerDialog';
import { MATERIALS } from '@/data/materials';

const MATERIAL_TYPE_COLORS: Record<string, string> = {
  'UD Carbon Ply':      '#0066cc',
  'UD Ply':             '#0066cc',
  'Biaxial Ply (±45°)': '#22c55e',
  'Core (PET Foam)':    '#f59e0b',
  'Core (Balsa)':       '#f59e0b',
  'Surface Ply':        '#9333ea',
  'Hybrid Ply':         '#06b6d4',
  'Random Mat Ply':     '#ec4899',
  'Consolidated Ply':   '#1e3a8a',
};
const FALLBACK_COLOR = '#6b7280';

function getMaterialColor(materialName: string): string {
  const m = MATERIALS.find((mat) => mat.name === materialName);
  if (m) return MATERIAL_TYPE_COLORS[m.type] ?? FALLBACK_COLOR;
  return FALLBACK_COLOR;
}

export interface Ply {
  id: string;
  name: string;
  material: string;
  thickness: number; // mm
  orientation: number; // degrees, 0..180
  color: string; // hex
}


const INITIAL_PLIES: Ply[] = [
  {
    id: 'p1',
    name: 'Placeholder',
    material: 'Select',
    thickness: 0,
    orientation: 0,
    color: FALLBACK_COLOR,
  },
];

/**
 * Drag-and-drop reorderable ply list + isometric schematic.
 *
 * - HTML5 native DnD on each row. `draggable={true}` on the `<tr>`, plus
 *   onDragStart sets the source index in the dataTransfer payload.
 *   onDragOver previews the drop slot; onDrop performs the reorder.
 * - The same `plies` state drives both the table and `<PlyStackViz>`, so
 *   colors and ordering stay in sync automatically.
 * - Touch devices: HTML5 DnD doesn't fire on mobile. If touch support is
 *   needed, swap to `dnd-kit` (modular drop-in) — see lessons.md.
 */
export function LayupBuilder() {
  const [plies, setPlies] = useState<Ply[]>(INITIAL_PLIES);
  const [unifiedVisualization, setUnifiedVisualization] = useState(true);
  const dragFromHandleRef = useRef<string | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [insertBeforeIdx, setInsertBeforeIdx] = useState<number | null>(null);
  const [materialPickerPlyId, setMaterialPickerPlyId] = useState<string | null>(null);

  function updatePly<K extends keyof Ply>(idx: number, key: K, value: Ply[K]) {
    setPlies((current) =>
      current.map((p, i) => {
        if (i !== idx) return p;
        return { ...p, [key]: value };
      })
    );
  }

  function handleDelete(idx: number) {
    setPlies((current) => current.filter((_, i) => i !== idx));
  }

  function handleAdd() {
    const newPly: Ply = {
      id: nextLocalId('p'),
      name: 'Placeholder',
      material: 'Select',
      thickness: 0,
      orientation: 0,
      color: FALLBACK_COLOR,
    };
    setPlies((current) => [...current, newPly]);
  }

  // --- DnD handlers ---
  function handleDragStart(idx: number, e: React.DragEvent<HTMLTableRowElement>) {
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }
  function handleDragOver(idx: number, e: React.DragEvent<HTMLTableRowElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const newInsert = e.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
    if (insertBeforeIdx !== newInsert) setInsertBeforeIdx(newInsert);
  }
  function handleDragLeave() {
    setInsertBeforeIdx(null);
  }
  function handleDrop(e: React.DragEvent<HTMLTableRowElement>) {
    e.preventDefault();
    const fromIdx = Number(e.dataTransfer.getData('text/plain'));
    setPlies((current) => {
      if (insertBeforeIdx === null || Number.isNaN(fromIdx)) return current;
      if (insertBeforeIdx === fromIdx || insertBeforeIdx === fromIdx + 1) return current;
      const next = [...current];
      const [moved] = next.splice(fromIdx, 1);
      const adjustedIdx = insertBeforeIdx > fromIdx ? insertBeforeIdx - 1 : insertBeforeIdx;
      next.splice(adjustedIdx, 0, moved);
      return next;
    });
    setDraggingIdx(null);
    setInsertBeforeIdx(null);
  }
  function handleDragEnd() {
    setDraggingIdx(null);
    setInsertBeforeIdx(null);
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Left: ply table */}
      <div className="flex w-full max-w-[812px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        {/* Add layer */}
        <button
          type="button"
          onClick={handleAdd}
          aria-label="Add new layer"
          className="inline-flex h-9 w-9 items-center justify-center self-start rounded-md bg-[#006496] text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </button>

        {/* Ply table */}
        <div className="overflow-hidden">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                <th className="h-10 w-9 px-2" />
                <th className="h-10 w-9 px-2" />
                <th className="h-10 w-[140px] px-3 text-left font-medium text-[#6b7280]">
                  Layer name
                </th>
                <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Material</th>
                <th className="h-10 w-[120px] whitespace-nowrap px-3 text-left font-medium text-[#6b7280]">
                  Thickness (mm)
                </th>
                <th className="h-10 w-[140px] whitespace-nowrap px-3 text-left font-medium text-[#6b7280]">
                  Orientation (deg)
                </th>
                <th className="h-10 w-12 px-2" />
              </tr>
            </thead>
            <tbody>
              {plies.flatMap((ply, idx) => {
                const isDragging = draggingIdx === idx;
                const insertLine = (key: string) => (
                  <tr key={key} className="pointer-events-none">
                    <td colSpan={7} className="p-0">
                      <div className="mx-2 h-0.5 rounded-full bg-[#006496]" />
                    </td>
                  </tr>
                );
                const row = (
                  <tr
                    key={ply.id}
                    draggable
                    onDragStart={(e) => {
                      if (dragFromHandleRef.current !== ply.id) {
                        e.preventDefault();
                        return;
                      }
                      handleDragStart(idx, e);
                    }}
                    onDragOver={(e) => handleDragOver(idx, e)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDragEnd={() => { dragFromHandleRef.current = null; handleDragEnd(); }}
                    className={`border-b border-[#e5e7eb] transition-colors last:border-b-0 ${
                      isDragging ? 'opacity-40' : ''
                    }`}
                  >
                    <td className="px-2 py-2 align-middle">
                      <span
                        data-drag-handle
                        aria-label="Drag handle"
                        onMouseDown={() => { dragFromHandleRef.current = ply.id; }}
                        onMouseUp={() => { dragFromHandleRef.current = null; }}
                        className="flex h-7 w-7 cursor-grab items-center justify-center text-[#6b7280] hover:text-[#0a0a0a] active:cursor-grabbing"
                      >
                        <GripVertical className="h-4 w-4" strokeWidth={2} />
                      </span>
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <span
                        aria-label={`Ply color ${ply.color}`}
                        className="block h-4 w-4 rounded-sm"
                        style={{ backgroundColor: ply.color }}
                      />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <Label htmlFor={`ply-name-${ply.id}`} className="sr-only">
                        Layer name
                      </Label>
                      <Input
                        id={`ply-name-${ply.id}`}
                        value={ply.name}
                        onChange={(e) => updatePly(idx, 'name', e.target.value)}
                        className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] font-medium shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                      />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <button
                        type="button"
                        aria-label={`Select material for ${ply.name}`}
                        onClick={() => setMaterialPickerPlyId(ply.id)}
                        className="flex h-8 w-full items-center justify-between gap-1 rounded-md border border-[#e2e8f0] bg-white px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:border-[#006496]"
                      >
                        <span className={`truncate text-left ${ply.material === 'Select' ? 'text-[#9ca3af]' : 'text-[#0a0a0a]'}`}>
                          {ply.material}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#6b7280]" strokeWidth={2} />
                      </button>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <Label htmlFor={`ply-thick-${ply.id}`} className="sr-only">
                        Thickness
                      </Label>
                      <BufferedNumberInput
                        id={`ply-thick-${ply.id}`}
                        step="0.01"
                        min={0}
                        value={ply.thickness}
                        onCommit={(v) => updatePly(idx, 'thickness', v)}
                        className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                      />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <Label htmlFor={`ply-orient-${ply.id}`} className="sr-only">
                        Orientation
                      </Label>
                      <BufferedNumberInput
                        id={`ply-orient-${ply.id}`}
                        step="1"
                        min={0}
                        max={180}
                        value={ply.orientation}
                        onCommit={(v) => updatePly(idx, 'orientation', v)}
                        className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <button
                        type="button"
                        aria-label={`Delete ${ply.name}`}
                        onClick={() => handleDelete(idx)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b7280] hover:bg-[#fef2f2] hover:text-[#dc2626]"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                );
                const result = [];
                if (draggingIdx !== null && insertBeforeIdx === idx) result.push(insertLine(`insert-before-${idx}`));
                result.push(row);
                if (draggingIdx !== null && idx === plies.length - 1 && insertBeforeIdx === plies.length) result.push(insertLine('insert-end'));
                return result;
              })}
              {plies.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
                    No plies yet. Click the + button to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Unified visualization toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="unified-visualization"
            checked={unifiedVisualization}
            onCheckedChange={(checked) => setUnifiedVisualization(Boolean(checked))}
            className="size-4 rounded border-[#e2e8f0] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
          />
          <Label
            htmlFor="unified-visualization"
            className="cursor-pointer text-[14px] font-medium text-[#0a0a0a]"
          >
            Unified visualization
          </Label>
        </div>
      </div>

      {/* Right: isometric ply stack viz */}
      <div className="flex w-full max-w-[440px] shrink-0 flex-col items-center">
        <PlyStackViz plies={plies} unified={unifiedVisualization} className="h-auto w-full" />
      </div>

      <MaterialPickerDialog
        open={materialPickerPlyId !== null}
        currentMaterialName={plies.find((p) => p.id === materialPickerPlyId)?.material}
        onSelect={(materialName) => {
          const idx = plies.findIndex((p) => p.id === materialPickerPlyId);
          if (idx !== -1) {
            updatePly(idx, 'material', materialName);
            updatePly(idx, 'color', getMaterialColor(materialName));
          }
          setMaterialPickerPlyId(null);
        }}
        onClose={() => setMaterialPickerPlyId(null)}
      />
    </div>
  );
}
