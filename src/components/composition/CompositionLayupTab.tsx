import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LayupBuilder, type Ply } from '@/components/layup/LayupBuilder';
import { useMaterialList } from '@/hooks/api/useMaterials';
import { useUpdateCompositionLayup } from '@/hooks/api/useComposition';

export interface CompositionLayup {
  id: string;
  name: string;
  plies: Ply[];
}

export interface CompositionLayupTabProps {
  compositionId: number;
  layups: CompositionLayup[];
  onAddLayup: (name: string) => string;
  onRenameLayup: (layupId: string, name: string) => void;
  onDeleteLayup: (layupId: string) => void;
  onUpdateLayupPlies: (layupId: string, updater: (current: Ply[]) => Ply[]) => void;
  onSaved: () => void;
  onSaveStatusChange: (status: { pending: boolean; error: boolean }) => void;
}

export function CompositionLayupTab({
  compositionId,
  layups,
  onAddLayup,
  onRenameLayup,
  onDeleteLayup,
  onUpdateLayupPlies,
  onSaved,
  onSaveStatusChange,
}: CompositionLayupTabProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: materialData } = useMaterialList();
  const materials = materialData ?? [];
  const saveMutation = useUpdateCompositionLayup(compositionId);

  function handleAdd() {
    if (!name.trim()) return;
    setExpandedId(onAddLayup(name.trim()));
    setName('');
    setFormOpen(false);
  }

  // Autosave — debounced so it fires after the user pauses editing (adding a
  // layup, tweaking a ply) rather than on every keystroke. The saved snapshot
  // starts at the hydrated value so mounting on an already-saved composition
  // doesn't immediately re-save.
  const layupsKey = JSON.stringify(layups);
  const [savedSnapshot, setSavedSnapshot] = useState(layupsKey);
  // A layup needs at least one ply to be worth persisting, and a ply still
  // on the "Select" material placeholder has no valid material id yet —
  // saving either would just be rejected by the backend, so hold off until
  // the user has actually built the layup out. Deleting every layup down to
  // none is a valid, save-worthy state (it clears them on the backend too) —
  // only a non-empty-but-incomplete layup blocks the autosave.
  const layupsReadyToSave = layups.every(
    (l) => l.plies.length > 0 && l.plies.every((p) => p.material !== 'Select')
  );
  const hasUnsavedLayups = layupsReadyToSave && layupsKey !== savedSnapshot;

  async function handleSave() {
    await saveMutation.mutateAsync({
      layups: layups.map((l) => ({
        name: l.name,
        layers: l.plies.map((p) => ({
          name: p.name,
          material: materials.find((m) => m.name === p.material)?.id ?? 0,
          thickness: p.thickness,
          orientation: p.orientation,
        })),
      })),
    });
    setSavedSnapshot(layupsKey);
    onSaved();
  }

  useEffect(() => {
    onSaveStatusChange({ pending: saveMutation.isPending, error: saveMutation.isError });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveMutation.isPending, saveMutation.isError]);

  // A failed save is attempted once per distinct layups state — it does not
  // retry in a loop; it tries again only once the user changes something.
  const lastAttemptRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hasUnsavedLayups || saveMutation.isPending) return;
    if (saveMutation.isError && lastAttemptRef.current === layupsKey) return;
    const timer = setTimeout(() => {
      lastAttemptRef.current = layupsKey;
      handleSave();
    }, 800);
    return () => clearTimeout(timer);
    // handleSave is a fresh closure every render; only the tracked values
    // below should gate the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layupsKey, hasUnsavedLayups, saveMutation.isPending, saveMutation.isError]);

  return (
    <div className="pointer-events-auto flex max-h-[calc(100vh_-_145px)] w-full max-w-[1300px] flex-col gap-4 overflow-y-auto rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Layups</h2>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#006496] px-3 text-[13px] font-medium text-[#fafafa] hover:bg-[#005580]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add layup
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd();
          }}
          className="flex flex-col gap-2 rounded-[10px] border border-[#e5e7eb] p-4"
        >
          <Label htmlFor="new-layup-name" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
            Name
          </Label>
          <Input
            id="new-layup-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => (name.trim() ? handleAdd() : setFormOpen(false))}
            autoFocus
            placeholder="Name the layup"
            className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px]"
          />
        </form>
      )}

      {layups.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-[#6b7280]">No layups yet. Add one to get started.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {layups.map((l) => {
            const expanded = expandedId === l.id;
            return (
              <li key={l.id} className="rounded-md border border-[#e5e7eb]">
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : l.id)}
                    aria-label={expanded ? `Collapse ${l.name}` : `Expand ${l.name}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-[#6b7280] hover:text-[#0a0a0a]"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                      strokeWidth={2}
                    />
                  </button>
                  <Label htmlFor={`layup-name-${l.id}`} className="sr-only">
                    Layup name
                  </Label>
                  <Input
                    id={`layup-name-${l.id}`}
                    value={l.name}
                    onChange={(e) => onRenameLayup(l.id, e.target.value)}
                    className="h-8 flex-1 rounded-md border-transparent px-2 text-[14px] font-medium text-[#0a0a0a] shadow-none hover:border-[#e2e8f0] focus-visible:border-[#e2e8f0]"
                  />
                  <button
                    type="button"
                    onClick={() => onDeleteLayup(l.id)}
                    aria-label={`Delete ${l.name}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#6b7280] hover:bg-[#fef2f2] hover:text-[#dc2626]"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
                {/* Always mounted — hidden instead of unmounted so each layup's ply state survives collapsing */}
                <div className={expanded ? 'border-t border-[#e5e7eb] p-4' : 'hidden'}>
                  <LayupBuilder plies={l.plies} onPliesChange={(updater) => onUpdateLayupPlies(l.id, updater)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
