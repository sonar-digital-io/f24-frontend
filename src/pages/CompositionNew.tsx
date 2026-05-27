import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Copy,
  GripVertical,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Search,
  SquareArrowOutUpRight,
  Trash2,
  X,
} from 'lucide-react';
import { MainNav } from '@/components/MainNav';
import { OccViewer } from '@/components/OccViewer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeometryCard } from '@/components/GeometryCard';
import { LayupPickerDialog } from '@/components/LayupPickerDialog';
import { LayupMappingBezierDialog } from '@/components/LayupMappingBezierDialog';
import { TransversalMappingSection } from '@/components/TransversalMappingSection';
import { GEOMETRIES } from '@/data/geometries';
import { LAYUPS } from '@/data/layups';
import { COMPOSITIONS, createComposition } from '@/data/compositions';

interface LayupMapping {
  id: string;
  name: string;
  layupId: string | null;
}

interface LayupMappingTableProps {
  title: string;
  copyLabel: string;
  mappings: LayupMapping[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, next: Partial<LayupMapping>) => void;
  onCopy: () => void;
  onDuplicate: (id: string) => void;
  onOpenBezier: (id: string) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
  onPickLayup: (mappingId: string) => void;
}

function LayupMappingTable({
  title,
  copyLabel,
  mappings,
  onAdd,
  onDelete,
  onUpdate,
  onCopy,
  onDuplicate,
  onOpenBezier,
  onReorder,
  onPickLayup,
}: LayupMappingTableProps) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dropOverIdx, setDropOverIdx] = useState<number | null>(null);

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
  function handleDrop(idx: number, e: React.DragEvent<HTMLTableRowElement>) {
    e.preventDefault();
    const fromIdx = Number(e.dataTransfer.getData('text/plain'));
    if (!Number.isNaN(fromIdx) && fromIdx !== idx) onReorder(fromIdx, idx);
    setDraggingIdx(null);
    setDropOverIdx(null);
  }
  function handleDragEnd() {
    setDraggingIdx(null);
    setDropOverIdx(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-semibold leading-6 text-[#0a0a0a]">{title}</h3>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-8 items-center rounded-md bg-[#f1f5f9] px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0]"
        >
          {copyLabel}
        </button>
      </div>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[#e5e7eb]">
            <th className="h-8 w-9 px-2" />
            <th className="h-8 w-12 px-2 text-left font-medium text-[#6b7280]">Index</th>
            <th className="h-8 px-2 text-left font-medium text-[#6b7280]">Name</th>
            <th className="h-8 w-[150px] px-2 text-left font-medium text-[#6b7280]">Layup</th>
            <th className="h-8 w-[120px] px-2" />
          </tr>
        </thead>
        <tbody>
          {mappings.map((m, idx) => {
            const layupLabel = LAYUPS.find((l) => l.id === m.layupId)?.name;
            const isDragging = draggingIdx === idx;
            const isDropOver = dropOverIdx === idx && draggingIdx !== idx;
            return (
              <tr
                key={m.id}
                draggable
                onDragStart={(e) => handleDragStart(idx, e)}
                onDragOver={(e) => handleDragOver(idx, e)}
                onDragLeave={() => setDropOverIdx(null)}
                onDrop={(e) => handleDrop(idx, e)}
                onDragEnd={handleDragEnd}
                className={`group border-b border-[#e5e7eb] last:border-b-0 transition-colors ${
                  isDragging ? 'opacity-40' : ''
                } ${isDropOver ? 'bg-[#eef9ff]' : ''}`}
              >
                <td className="px-2 py-2 align-middle">
                  <span
                    aria-label="Drag handle"
                    className="flex h-7 w-7 cursor-grab items-center justify-center text-[#cbd5e1] opacity-0 transition-opacity hover:text-[#0a0a0a] active:cursor-grabbing group-hover:opacity-100"
                  >
                    <GripVertical className="h-4 w-4" strokeWidth={2} />
                  </span>
                </td>
                <td className="px-2 py-2 text-[#0a0a0a]">{idx}</td>
                <td className="px-2 py-2">
                  <Input
                    value={m.name}
                    onChange={(e) => onUpdate(m.id, { name: e.target.value })}
                    placeholder="Placeholder"
                    className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    onClick={() => onPickLayup(m.id)}
                    className={`flex h-8 w-full items-center justify-between gap-2 rounded-md border border-[#e2e8f0] bg-white px-2 py-1 text-left text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f9fafb] ${
                      layupLabel ? 'text-[#0a0a0a]' : 'text-[#6b7280]'
                    }`}
                  >
                    <span className="truncate">{layupLabel ?? 'Select'}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#6b7280]" strokeWidth={1.5} />
                  </button>
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onDuplicate(m.id)}
                      aria-label="Duplicate mapping"
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
                    >
                      <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenBezier(m.id)}
                      aria-label="Open mapping bezier view"
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
                    >
                      <SquareArrowOutUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(m.id)}
                      aria-label="Delete mapping"
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#fef2f2] hover:text-[#dc2626]"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {mappings.length === 0 && (
            <tr>
              <td colSpan={5} className="px-2 py-4 text-center text-[12px] text-[#6b7280]">
                No mappings yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex h-8 items-center gap-2 self-start rounded-md border border-[#e2e8f0] bg-white px-3 text-[12px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Add layup mapping
      </button>
    </div>
  );
}

export function CompositionNew() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const existing = id ? COMPOSITIONS.find((c) => c.id === id) : undefined;
  const [activeTab, setActiveTab] = useState<
    'general' | 'geometry' | 'layup-mapping' | 'transversal-mapping'
  >('general');

  // General
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [solidCore, setSolidCore] = useState(false);
  const [targetWeight, setTargetWeight] = useState('');

  // Geometry pick
  const [geomQuery, setGeomQuery] = useState('');
  const [geomView, setGeomView] = useState<'list' | 'grid'>('grid');
  const [selectedGeometryId, setSelectedGeometryId] = useState<string | null>(null);

  // Layup mapping
  const [upperMappings, setUpperMappings] = useState<LayupMapping[]>([
    { id: 'u0', name: '', layupId: null },
  ]);
  const [lowerMappings, setLowerMappings] = useState<LayupMapping[]>([
    { id: 'l0', name: '', layupId: null },
  ]);
  const [layupPicker, setLayupPicker] = useState<{
    side: 'upper' | 'lower';
    mappingId: string;
  } | null>(null);

  const [bezierFor, setBezierFor] = useState<{
    side: 'upper' | 'lower';
    mappingId: string;
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

  function duplicateMapping(side: 'upper' | 'lower', id: string) {
    const setter = side === 'upper' ? setUpperMappings : setLowerMappings;
    setter((arr) => {
      const idx = arr.findIndex((m) => m.id === id);
      if (idx === -1) return arr;
      const src = arr[idx];
      const dup: LayupMapping = {
        ...src,
        id: `${side[0]}-${Date.now()}`,
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
      navigate('/composition');
      return;
    }
    // Mock stand-in for a POST: append to the list, then open the new composition.
    const composition = createComposition(name, description);
    navigate(`/composition/${composition.id}`);
  }

  const filteredGeometries = GEOMETRIES.filter(
    (g) =>
      !geomQuery.trim() ||
      g.name.toLowerCase().includes(geomQuery.trim().toLowerCase()) ||
      g.description.toLowerCase().includes(geomQuery.trim().toLowerCase())
  );

  function addUpper() {
    setUpperMappings((arr) => [
      ...arr,
      { id: `u-${Date.now()}`, name: '', layupId: null },
    ]);
  }
  function addLower() {
    setLowerMappings((arr) => [
      ...arr,
      { id: `l-${Date.now()}`, name: '', layupId: null },
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
    setLowerMappings(upperMappings.map((m, i) => ({ ...m, id: `l-copy-${i}-${Date.now()}` })));
  }
  function copyLowerToUpper() {
    setUpperMappings(lowerMappings.map((m, i) => ({ ...m, id: `u-copy-${i}-${Date.now()}` })));
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <MainNav />

      {/* Body: full-bleed OCC canvas + floating overlays */}
      <main className="relative flex-1 overflow-hidden">
        {/* OCC canvas fills the whole area */}
        <OccViewer className="absolute inset-0 w-full h-full" />

      {/* Sub-toolbar floating above the canvas */}
      <div className="absolute inset-x-0 top-0 z-40 h-[52px] border-b border-[#e5e7eb]/70">
        <div className="absolute inset-y-0 left-4 flex items-center">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="h-9">
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

        <div className="absolute inset-y-0 right-4 flex items-center">
          <Link
            to="/composition"
            className="inline-flex h-8 items-center gap-2 rounded-md bg-[#f1f5f9] px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0]"
          >
            Exit edit mode
            <X className="h-4 w-4 opacity-70" strokeWidth={1.33} />
          </Link>
        </div>
      </div>

      {/* Tab content panels — pointer-events-none on wrapper so the canvas
           behind receives orbit/zoom events; each panel restores pointer-events */}
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 top-[60px]">
        {activeTab === 'general' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGeneralSubmit();
            }}
            className="pointer-events-auto flex w-full max-w-[468px] flex-col gap-4 overflow-y-auto rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur-sm [max-height:calc(100vh-145px)]"
          >
            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="comp-name" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
                Name<span className="text-[#dc2626]">*</span>
              </Label>
              <Input
                id="comp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Name the composition"
                className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              />
            </div>

            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="comp-description" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
                Description<span className="text-[#dc2626]">*</span>
              </Label>
              <Textarea
                id="comp-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                placeholder="Placeholder"
                className="min-h-[76px] rounded-md border-[#e2e8f0] px-3 py-2 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="comp-solid-core"
                  checked={solidCore}
                  onCheckedChange={(c) => setSolidCore(Boolean(c))}
                  className="size-4 rounded border-[#e2e8f0] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
                />
                <Label htmlFor="comp-solid-core" className="cursor-pointer text-[14px] font-medium text-[#0a0a0a]">
                  Solid core
                </Label>
              </div>
              <button
                type="button"
                disabled={!solidCore}
                className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-[#0a0a0a] hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Select material
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="comp-target-weight" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
                Target weight (kg)
              </Label>
              <Input
                id="comp-target-weight"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="Placeholder"
                className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              />
              <p className="text-[14px] leading-5 text-[#6b7280]">
                Helper text: explain why is it important to add the target weight and what are the risks
                of a miscalculated weight
              </p>
            </div>
          </form>
        )}

        {activeTab === 'geometry' && (
          <div className="pointer-events-auto max-h-[calc(100vh-145px)] overflow-y-auto rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Geometries</h2>
              <div className="flex items-center gap-1 rounded-md border border-[#e5e7eb] bg-white p-1 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                <button
                  type="button"
                  onClick={() => setGeomView('list')}
                  aria-label="List view"
                  aria-pressed={geomView === 'list'}
                  className={`flex h-7 w-7 items-center justify-center rounded ${
                    geomView === 'list'
                      ? 'bg-[#eef9ff] text-[#171717]'
                      : 'text-[#6b7280] hover:bg-[#f1f5f9]'
                  }`}
                >
                  <ListIcon className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setGeomView('grid')}
                  aria-label="Grid view"
                  aria-pressed={geomView === 'grid'}
                  className={`flex h-7 w-7 items-center justify-center rounded ${
                    geomView === 'grid'
                      ? 'bg-[#eef9ff] text-[#171717]'
                      : 'text-[#6b7280] hover:bg-[#f1f5f9]'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="mt-4 max-w-[384px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
                <Input
                  value={geomQuery}
                  onChange={(e) => setGeomQuery(e.target.value)}
                  placeholder="Placeholder"
                  className="h-9 rounded-md border-[#e2e8f0] pl-9 text-[14px]"
                />
              </div>
            </div>

            {geomView === 'grid' ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {filteredGeometries.map((g) => (
                  <GeometryCard
                    key={g.id}
                    geometry={g}
                    onClick={() => setSelectedGeometryId(g.id)}
                    selected={selectedGeometryId === g.id}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-md border border-[#e5e7eb]">
                <table className="w-full border-collapse text-[14px]">
                  <thead>
                    <tr className="border-b border-[#e5e7eb]">
                      <th className="h-10 w-[240px] px-3 text-left font-medium text-[#6b7280]">
                        Name
                      </th>
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                        Description
                      </th>
                      <th className="h-10 w-[160px] px-3 text-left font-medium text-[#6b7280]">
                        Last updated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGeometries.map((g) => (
                      <tr
                        key={g.id}
                        onClick={() => setSelectedGeometryId(g.id)}
                        className={`cursor-pointer border-b border-[#e5e7eb] last:border-b-0 ${
                          selectedGeometryId === g.id ? 'bg-[#eef9ff]' : 'hover:bg-[#f9fafb]'
                        }`}
                      >
                        <td className="px-3 py-3 font-medium text-[#0a0a0a]">{g.name}</td>
                        <td className="px-3 py-3 text-[#0a0a0a]">{g.description}</td>
                        <td className="px-3 py-3 text-[#0a0a0a]">{g.lastUpdated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'layup-mapping' && (
          <div className="pointer-events-auto flex max-h-[calc(100vh-145px)] w-full max-w-[480px] flex-col gap-6 overflow-y-auto rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur-sm">
            <button
              type="button"
              aria-label="Settings"
              className="inline-flex h-9 w-9 items-center justify-center self-start rounded-md bg-[#006496] text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </button>

            <LayupMappingTable
              title="Upper side"
              copyLabel="Copy to lower side"
              mappings={upperMappings}
              onAdd={addUpper}
              onDelete={(id) => deleteMapping('upper', id)}
              onUpdate={(id, next) => updateMapping('upper', id, next)}
              onCopy={copyUpperToLower}
              onDuplicate={(id) => duplicateMapping('upper', id)}
              onOpenBezier={(id) => setBezierFor({ side: 'upper', mappingId: id })}
              onReorder={(from, to) => reorderMapping('upper', from, to)}
              onPickLayup={(id) => setLayupPicker({ side: 'upper', mappingId: id })}
            />

            <LayupMappingTable
              title="Lower side"
              copyLabel="Copy to upper side"
              mappings={lowerMappings}
              onAdd={addLower}
              onDelete={(id) => deleteMapping('lower', id)}
              onUpdate={(id, next) => updateMapping('lower', id, next)}
              onCopy={copyLowerToUpper}
              onDuplicate={(id) => duplicateMapping('lower', id)}
              onOpenBezier={(id) => setBezierFor({ side: 'lower', mappingId: id })}
              onReorder={(from, to) => reorderMapping('lower', from, to)}
              onPickLayup={(id) => setLayupPicker({ side: 'lower', mappingId: id })}
            />
          </div>
        )}

        {activeTab === 'transversal-mapping' && (
          <div className="pointer-events-auto max-h-[calc(100vh-145px)] overflow-y-auto">
            <TransversalMappingSection />
          </div>
        )}
      </div>
      </main>

      <LayupPickerDialog
        open={layupPicker !== null}
        currentLayupId={pickerCurrentLayupId}
        onSelect={(layupId) => {
          if (layupPicker) {
            updateMapping(layupPicker.side, layupPicker.mappingId, { layupId });
          }
          setLayupPicker(null);
        }}
        onClose={() => setLayupPicker(null)}
      />

      <LayupMappingBezierDialog
        open={bezierFor !== null}
        title={bezierTitle}
        onClose={() => setBezierFor(null)}
      />
    </div>
  );
}
