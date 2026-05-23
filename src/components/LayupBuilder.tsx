import { useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlyStackViz } from '@/components/PlyStackViz';

export interface Ply {
  id: string;
  name: string;
  material: string;
  thickness: number; // mm
  orientation: number; // degrees, 0..180
  color: string; // hex
}

/** Map orientation (deg) to a base color used in both the table swatch and viz. */
function defaultColorForOrientation(o: number): string {
  // 0  -> blue, 45 -> green, 90 -> yellow, anything else: interpolate-ish
  if (o <= 22.5) return '#0066cc';
  if (o <= 67.5) return '#22c55e';
  if (o <= 112.5) return '#f59e0b';
  if (o <= 157.5) return '#22c55e';
  return '#0066cc';
}

const INITIAL_PLIES: Ply[] = [
  {
    id: 'p1',
    name: 'Top skin',
    material: 'Torayca T700S / Epoxy',
    thickness: 0.2,
    orientation: 0,
    color: '#0066cc',
  },
  {
    id: 'p2',
    name: 'Biax Layer',
    material: 'E-Glass 1200gsm (Biax)',
    thickness: 0.25,
    orientation: 45,
    color: '#22c55e',
  },
  {
    id: 'p3',
    name: 'Core Ply (Mid)',
    material: 'Torayca T700S / Epoxy',
    thickness: 0.85,
    orientation: 90,
    color: '#f59e0b',
  },
  {
    id: 'p4',
    name: 'Biax Layer',
    material: 'E-Glass 1200gsm (Biax)',
    thickness: 0.25,
    orientation: 45,
    color: '#22c55e',
  },
  {
    id: 'p5',
    name: 'Bottom skin',
    material: 'Torayca T700S / Epoxy',
    thickness: 0.2,
    orientation: 0,
    color: '#0066cc',
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
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dropOverIdx, setDropOverIdx] = useState<number | null>(null);

  function updatePly<K extends keyof Ply>(idx: number, key: K, value: Ply[K]) {
    setPlies((current) =>
      current.map((p, i) => {
        if (i !== idx) return p;
        const next = { ...p, [key]: value };
        // Keep color in sync with orientation if it was at the default value
        if (key === 'orientation') {
          next.color = defaultColorForOrientation(value as number);
        }
        return next;
      })
    );
  }

  function handleDelete(idx: number) {
    setPlies((current) => current.filter((_, i) => i !== idx));
  }

  function handleAdd() {
    const newPly: Ply = {
      id: `p-${Date.now()}`,
      name: `Layer ${plies.length + 1}`,
      material: 'Torayca T700S / Epoxy',
      thickness: 0.2,
      orientation: 0,
      color: '#0066cc',
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
    if (dropOverIdx !== idx) setDropOverIdx(idx);
  }
  function handleDragLeave() {
    setDropOverIdx(null);
  }
  function handleDrop(idx: number, e: React.DragEvent<HTMLTableRowElement>) {
    e.preventDefault();
    const fromIdx = Number(e.dataTransfer.getData('text/plain'));
    setPlies((current) => {
      if (Number.isNaN(fromIdx) || fromIdx === idx) return current;
      const next = [...current];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDraggingIdx(null);
    setDropOverIdx(null);
  }
  function handleDragEnd() {
    setDraggingIdx(null);
    setDropOverIdx(null);
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
                <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Layer name</th>
                <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Material</th>
                <th className="h-10 w-[110px] px-3 text-left font-medium text-[#6b7280]">
                  Thickness (mm)
                </th>
                <th className="h-10 w-[120px] px-3 text-left font-medium text-[#6b7280]">
                  Orientation (deg)
                </th>
                <th className="h-10 w-12 px-2" />
              </tr>
            </thead>
            <tbody>
              {plies.map((ply, idx) => {
                const isDragging = draggingIdx === idx;
                const isDropOver = dropOverIdx === idx && draggingIdx !== idx;
                return (
                  <tr
                    key={ply.id}
                    draggable
                    onDragStart={(e) => handleDragStart(idx, e)}
                    onDragOver={(e) => handleDragOver(idx, e)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(idx, e)}
                    onDragEnd={handleDragEnd}
                    className={`border-b border-[#e5e7eb] transition-colors last:border-b-0 ${
                      isDragging ? 'opacity-40' : ''
                    } ${isDropOver ? 'bg-[#eef9ff]' : ''}`}
                  >
                    <td className="px-2 py-2 align-middle">
                      <span
                        aria-label="Drag handle"
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
                      <Label htmlFor={`ply-material-${ply.id}`} className="sr-only">
                        Material
                      </Label>
                      <Input
                        id={`ply-material-${ply.id}`}
                        value={ply.material}
                        onChange={(e) => updatePly(idx, 'material', e.target.value)}
                        className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                      />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <Label htmlFor={`ply-thick-${ply.id}`} className="sr-only">
                        Thickness
                      </Label>
                      <Input
                        id={`ply-thick-${ply.id}`}
                        type="number"
                        step="0.01"
                        min={0}
                        value={ply.thickness}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (Number.isFinite(v)) updatePly(idx, 'thickness', v);
                        }}
                        className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                      />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <Label htmlFor={`ply-orient-${ply.id}`} className="sr-only">
                        Orientation
                      </Label>
                      <Input
                        id={`ply-orient-${ply.id}`}
                        type="number"
                        step="1"
                        min={0}
                        max={180}
                        value={ply.orientation}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (Number.isFinite(v)) updatePly(idx, 'orientation', v);
                        }}
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
        <PlyStackViz plies={plies} className="h-auto w-full" />
      </div>
    </div>
  );
}
