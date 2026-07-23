import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainNav } from '@/components/common/layout/MainNav';
import { EditPageToolbar } from '@/components/common/layout/EditPageToolbar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LayupBuilder } from '@/components/layup/LayupBuilder';
import { LAYUPS, createLayup, updateLayup } from '@/data/layups';

const TABS = [
  { value: 'general', label: 'General' },
  { value: 'layup-building', label: 'Layup building' },
];

type LaminateArchitecture = 'even-symmetrical' | 'odd-symmetrical' | 'asymmetrical';

const LAMINATE_OPTIONS: { value: LaminateArchitecture; label: string }[] = [
  { value: 'asymmetrical', label: 'Asymmetrical' },
  { value: 'even-symmetrical', label: 'Even symmetrical' },
  { value: 'odd-symmetrical', label: 'Odd symmetrical' },
];

interface RadioGroupProps {
  value: LaminateArchitecture | '';
  onChange: (value: LaminateArchitecture) => void;
}

function RadioGroup({ value, onChange }: RadioGroupProps) {
  return (
    <div role="radiogroup" aria-label="Laminate architecture" className="flex flex-col gap-2">
      {LAMINATE_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className="inline-flex items-center gap-2 text-left focus:outline-none"
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                selected ? 'border-[#006496]' : 'border-[#cbd5e1]'
              }`}
            >
              {selected && <span className="h-2 w-2 rounded-full bg-[#006496]" />}
            </span>
            <span className="text-[14px] leading-5 text-[#0a0a0a]">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function LayupNew() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const existing = id ? LAYUPS.find((l) => l.id === id) : undefined;

  // Editing an existing layup opens straight on the building view; creating starts on General.
  const [activeTab, setActiveTab] = useState(existing ? 'layup-building' : 'general');
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [laminateArchitecture, setLaminateArchitecture] = useState<LaminateArchitecture | ''>('');

  // Sub-toolbar title: current name when set, else the existing layup name, else "New layup"
  const titleText = name.trim() || existing?.name || 'New layup';

  function handleGeneralSubmit() {
    if (existing) {
      updateLayup(existing.id, { name, description });
      navigate('/layup');
      return;
    }
    // Mock stand-in for a POST: append to the list, then open the new layup in the editor.
    const layup = createLayup(name, description);
    navigate(`/layup/${layup.id}`);
  }

  /** Save (create or update) then go back to the list — called by Exit edit mode. */
  function handleExit() {
    if (existing) {
      updateLayup(existing.id, { name, description });
    } else if (name.trim()) {
      createLayup(name, description);
    }
    navigate('/layup');
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#f8fafc]">
      <MainNav />

      <EditPageToolbar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title={titleText}
        backLabel="Back to Layups"
        onBack={handleExit}
      />

      <main className="flex-1 overflow-hidden px-4 pb-6 pt-4">
        {activeTab === 'general' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGeneralSubmit();
            }}
            className="flex w-full max-w-[468px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
          >
            <div className="flex w-full flex-col gap-2">
              <Label
                htmlFor="layup-name"
                className="text-[14px] font-medium leading-none text-[#0a0a0a]"
              >
                Name<span className="text-[#dc2626]">*</span>
              </Label>
              <Input
                id="layup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 rounded-md border-[#e2e8f0] bg-white px-3 py-1 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              />
            </div>

            <div className="flex w-full flex-col gap-2">
              <Label
                htmlFor="layup-description"
                className="text-[14px] font-medium leading-none text-[#0a0a0a]"
              >
                Description<span className="text-[#dc2626]">*</span>
              </Label>
              <Textarea
                id="layup-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="min-h-[98px] rounded-md border-[#e2e8f0] bg-white px-3 py-2 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              />
            </div>

            <div className="flex w-full flex-col gap-2">
              <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
                Laminate architecture<span className="text-[#dc2626]">*</span>
              </Label>
              <RadioGroup value={laminateArchitecture} onChange={setLaminateArchitecture} />
            </div>
          </form>
        )}

        {activeTab === 'layup-building' && <LayupBuilder />}
      </main>
    </div>
  );
}
