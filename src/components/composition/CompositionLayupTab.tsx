import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LayupBuilder } from '@/components/layup/LayupBuilder';

export interface CompositionLayup {
  id: string;
  name: string;
}

export interface CompositionLayupTabProps {
  layups: CompositionLayup[];
  onAddLayup: (name: string) => void;
}

export function CompositionLayupTab({ layups, onAddLayup }: CompositionLayupTabProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleAdd() {
    if (!name.trim()) return;
    onAddLayup(name.trim());
    setName('');
    setFormOpen(false);
  }

  return (
    <div className="pointer-events-auto flex max-h-[calc(100vh-145px)] w-full max-w-[1300px] flex-col gap-4 overflow-y-auto rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] backdrop-blur-sm">
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
          className="flex flex-col gap-3 rounded-[10px] border border-[#e5e7eb] p-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-layup-name" className="text-[14px] font-medium leading-none text-[#0a0a0a]">
              Name
            </Label>
            <Input
              id="new-layup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Name the layup"
              className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setName('');
              }}
              className="inline-flex h-8 items-center rounded-md px-3 text-[12px] font-medium text-[#0a0a0a] hover:bg-[#f1f5f9]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="inline-flex h-8 items-center rounded-md bg-[#006496] px-3 text-[12px] font-medium text-[#fafafa] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save
            </button>
          </div>
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
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : l.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[14px] font-medium text-[#0a0a0a] hover:bg-[#f9fafb]"
                >
                  {l.name}
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#6b7280] transition-transform ${expanded ? 'rotate-180' : ''}`}
                    strokeWidth={2}
                  />
                </button>
                {/* Always mounted — hidden instead of unmounted so each layup's ply state survives collapsing */}
                <div className={expanded ? 'border-t border-[#e5e7eb] p-4' : 'hidden'}>
                  <LayupBuilder />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
