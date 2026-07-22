import { useState } from 'react';
import { ChevronRight, Plus, Spline, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CrossSectionDialog } from '@/components/composition/CrossSectionDialog';
import { LayupPickerDialog } from '@/components/composition/LayupPickerDialog';
import { SelectField } from '@/components/composition/SelectField';
import { ProfileEditorPopover } from '@/components/composition/ProfileEditorPopover';
import { INITIAL_PROFILES } from '@/data/profiles';
import { LAYUPS } from '@/data/layups';
import { nextLocalId } from '@/lib/utils';

interface TransversalMapping {
  id: string;
  name: string;
  layupId: string | null;
  startProfileId: string | null;
  endProfileId: string | null;
  chordStart: number;
  chordEnd: number;
  chordStartLock: string;
  chordEndLock: string;
}

// Empty starting state for new compositions
const INITIAL_MAPPINGS: TransversalMapping[] = [
  {
    id: 'tm-0',
    name: 'SHELL-REINFORCED',
    layupId: null,
    startProfileId: null,
    endProfileId: null,
    chordStart: -0.2,
    chordEnd: 0.2,
    chordStartLock: 'Unlocked',
    chordEndLock: 'Unlocked',
  },
];

// Pre-filled state for existing compositions (matches the cross-section mock data)
const DEFAULT_MAPPINGS: TransversalMapping[] = [
  {
    id: 'tm-0',
    name: 'SHELL-REINFORCED',
    layupId: 'le-rein-06',
    startProfileId: 'p0',
    endProfileId: 'p5',
    chordStart: -0.2,
    chordEnd: 0.2,
    chordStartLock: 'Unlocked',
    chordEndLock: 'Unlocked',
  },
];

interface TransversalMappingSectionProps {
  useDefaultData?: boolean;
  upperMappingNames?: string[];
}

export function TransversalMappingSection({ useDefaultData = false, upperMappingNames }: TransversalMappingSectionProps) {
  const [mappings, setMappings] = useState<TransversalMapping[]>(
    useDefaultData ? DEFAULT_MAPPINGS : INITIAL_MAPPINGS,
  );
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingProfileFor, setEditingProfileFor] = useState<{
    mappingId: string;
    side: 'start' | 'end';
  } | null>(null);
  const [layupPickerFor, setLayupPickerFor] = useState<string | null>(null);
  const [crossSectionProfile, setCrossSectionProfile] = useState<string | null>(null);

  const profileOptions = INITIAL_PROFILES.map((p) => ({ value: p.id, label: p.name }));

  function updateMapping(id: string, next: Partial<TransversalMapping>) {
    setMappings((arr) => arr.map((m) => (m.id === id ? { ...m, ...next } : m)));
  }

  function addMapping() {
    const id = nextLocalId('tm');
    setMappings((arr) => [
      ...arr,
      {
        id,
        name: '',
        layupId: null,
        startProfileId: null,
        endProfileId: null,
        chordStart: -0.2,
        chordEnd: 0.2,
        chordStartLock: 'Unlocked',
        chordEndLock: 'Unlocked',
      },
    ]);
    setEditingNameId(id);
  }

  function deleteMapping(id: string) {
    setMappings((arr) => arr.filter((m) => m.id !== id));
  }

  // Resolve the currently-edited mapping + profile for the popover
  const editingMapping = editingProfileFor
    ? (mappings.find((m) => m.id === editingProfileFor.mappingId) ?? null)
    : null;
  const editingProfile = (() => {
    if (!editingProfileFor || !editingMapping) return null;
    const profileId =
      editingProfileFor.side === 'start' ? editingMapping.startProfileId : editingMapping.endProfileId;
    if (!profileId) return null;
    return INITIAL_PROFILES.find((p) => p.id === profileId) ?? null;
  })();

  return (
    <div className="flex flex-col gap-6">
      {/* Top: transversal mapping table */}
      <div className="flex w-full max-w-[830px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#e5e7eb]">
              <th className="h-8 w-[160px] px-2 text-left font-medium text-[#6b7280]">Name</th>
              <th className="h-8 px-2 text-left font-medium text-[#6b7280]">Layup</th>
              <th className="h-8 w-[200px] px-2 text-left font-medium text-[#6b7280]">Start profile</th>
              <th className="h-8 w-[200px] px-2 text-left font-medium text-[#6b7280]">End profile</th>
              <th className="h-8 w-9 px-2" />
            </tr>
          </thead>
          <tbody>
            {mappings.map((m) => {
              const editingThisStart =
                editingProfileFor?.mappingId === m.id && editingProfileFor.side === 'start';
              const editingThisEnd =
                editingProfileFor?.mappingId === m.id && editingProfileFor.side === 'end';
              return (
                <tr key={m.id} className="group border-b border-[#e5e7eb] last:border-b-0">
                  <td className="px-2 py-2">
                    {m.name && editingNameId !== m.id ? (
                      <button
                        type="button"
                        onClick={() => setEditingNameId(m.id)}
                        title="Edit name"
                        className="inline-flex h-8 items-center rounded-md bg-[#ede9fe] px-2 text-[12px] font-semibold uppercase tracking-wide text-[#5b21b6] hover:bg-[#ddd6fe]"
                      >
                        {m.name}
                      </button>
                    ) : (
                      <Input
                        value={m.name}
                        autoFocus={editingNameId === m.id}
                        onFocus={() => setEditingNameId(m.id)}
                        onChange={(e) => updateMapping(m.id, { name: e.target.value })}
                        onBlur={() => setEditingNameId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingNameId(null);
                        }}
                        placeholder="Name"
                        className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                      />
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {(() => {
                      const layupLabel = LAYUPS.find((l) => l.id === m.layupId)?.name;
                      return (
                        <button
                          type="button"
                          onClick={() => setLayupPickerFor(m.id)}
                          className={`flex h-8 w-full items-center justify-between gap-2 rounded-md border border-[#e2e8f0] bg-white px-2 py-1 text-left text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f9fafb] ${
                            layupLabel ? 'text-[#0a0a0a]' : 'text-[#6b7280]'
                          }`}
                        >
                          <span className="truncate">{layupLabel ?? 'Select'}</span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#6b7280]" strokeWidth={1.5} />
                        </button>
                      );
                    })()}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <div className="min-w-0 flex-1">
                        <SelectField
                          value={m.startProfileId ?? ''}
                          onChange={(v) => {
                            updateMapping(m.id, { startProfileId: v });
                            setEditingProfileFor({ mappingId: m.id, side: 'start' });
                          }}
                          options={profileOptions}
                          highlight={editingThisStart}
                        />
                      </div>
                      <button
                        type="button"
                        aria-label="Edit start profile"
                        disabled={!m.startProfileId}
                        onClick={() =>
                          setEditingProfileFor((cur) =>
                            cur?.mappingId === m.id && cur.side === 'start'
                              ? null
                              : { mappingId: m.id, side: 'start' },
                          )
                        }
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:cursor-not-allowed disabled:opacity-40 ${
                          editingThisStart
                            ? 'bg-[#006496] text-[#fafafa] hover:bg-[#005580]'
                            : 'bg-white text-[#6b7280] hover:bg-[#f1f5f9]'
                        }`}
                      >
                        <Spline className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <div className="min-w-0 flex-1">
                        <SelectField
                          value={m.endProfileId ?? ''}
                          onChange={(v) => {
                            updateMapping(m.id, { endProfileId: v });
                            setEditingProfileFor({ mappingId: m.id, side: 'end' });
                          }}
                          options={profileOptions}
                          highlight={editingThisEnd}
                        />
                      </div>
                      <button
                        type="button"
                        aria-label="Edit end profile"
                        disabled={!m.endProfileId}
                        onClick={() =>
                          setEditingProfileFor((cur) =>
                            cur?.mappingId === m.id && cur.side === 'end'
                              ? null
                              : { mappingId: m.id, side: 'end' },
                          )
                        }
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:cursor-not-allowed disabled:opacity-40 ${
                          editingThisEnd
                            ? 'bg-[#006496] text-[#fafafa] hover:bg-[#005580]'
                            : 'bg-white text-[#6b7280] hover:bg-[#f1f5f9]'
                        }`}
                      >
                        <Spline className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => deleteMapping(m.id)}
                      aria-label="Delete mapping"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b7280] opacity-0 transition-opacity hover:bg-[#fef2f2] hover:text-[#dc2626] group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={addMapping}
          className="inline-flex h-8 items-center gap-2 self-start rounded-md border border-[#e2e8f0] bg-white px-3 text-[12px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add transversal mapping
        </button>
      </div>

      {/* Side-by-side: Cross-section view list + Editor popover (when open) */}
      <div className="flex flex-row items-start gap-6">
        <div className="flex w-[150px] shrink-0 flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
          <span className="text-[12px] font-medium leading-none text-[#6b7280]">Cross-section view</span>
          <ul className="flex flex-col gap-1">
            {INITIAL_PROFILES.map((prof) => (
              <li key={prof.id}>
                <button
                  type="button"
                  onClick={() => setCrossSectionProfile(prof.id)}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
                    crossSectionProfile === prof.id
                      ? 'bg-[#eef9ff] text-[#0a0a0a]'
                      : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                  }`}
                >
                  {prof.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {editingProfile && editingMapping && (
          <ProfileEditorPopover
            key={editingProfile.id}
            profile={editingProfile}
            startPosition={editingMapping.chordStart}
            endPosition={editingMapping.chordEnd}
            startLockedTo={editingMapping.chordStartLock}
            endLockedTo={editingMapping.chordEndLock}
            onStartChange={(v) => updateMapping(editingMapping.id, { chordStart: v })}
            onEndChange={(v) => updateMapping(editingMapping.id, { chordEnd: v })}
            onStartLockedToChange={(v) => updateMapping(editingMapping.id, { chordStartLock: v })}
            onEndLockedToChange={(v) => updateMapping(editingMapping.id, { chordEndLock: v })}
            onClose={() => setEditingProfileFor(null)}
          />
        )}
      </div>

      {/* Cross-section view dialog */}
      {crossSectionProfile && (() => {
        const prof = INITIAL_PROFILES.find((p) => p.id === crossSectionProfile);
        if (!prof) return null;
        // Only include transversal mappings whose profile span covers this profile
        const transversalEntries = mappings
          .filter((m) => {
            if (!m.startProfileId || !m.endProfileId) return false;
            const startIdx = INITIAL_PROFILES.findIndex((p) => p.id === m.startProfileId);
            const endIdx = INITIAL_PROFILES.findIndex((p) => p.id === m.endProfileId);
            const profIdx = INITIAL_PROFILES.findIndex((p) => p.id === crossSectionProfile);
            if (startIdx < 0 || endIdx < 0 || profIdx < 0) return false;
            return profIdx >= Math.min(startIdx, endIdx) && profIdx <= Math.max(startIdx, endIdx);
          })
          .map((m) => ({
            id: m.id,
            name: m.name,
            layupName: LAYUPS.find((l) => l.id === m.layupId)?.name ?? 'Unknown layup',
            startPos: m.chordStart,
            endPos: m.chordEnd,
          }));
        return (
          <CrossSectionDialog
            profile={prof}
            transversalEntries={transversalEntries}
            layupMappingNames={upperMappingNames}
            onClose={() => setCrossSectionProfile(null)}
          />
        );
      })()}

      <LayupPickerDialog
        open={layupPickerFor !== null}
        currentLayupId={mappings.find((m) => m.id === layupPickerFor)?.layupId}
        onSelect={(layupId) => {
          if (layupPickerFor) updateMapping(layupPickerFor, { layupId });
          setLayupPickerFor(null);
        }}
        onClose={() => setLayupPickerFor(null)}
      />
    </div>
  );
}
