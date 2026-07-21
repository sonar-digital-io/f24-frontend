import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, Check, Undo2, Redo2 } from 'lucide-react';
import { MainNav } from '@/components/MainNav';
import { PropertyFormTab } from '@/components/PropertyFormTab';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MECHANICAL_SECTIONS, FATIGUE_SECTIONS } from '@/data/materialFormFields';
import { MATERIALS, createMaterial, updateMaterial } from '@/data/materials';

const MATERIAL_TYPES = [
  'UD ply',
  'Biaxial Ply (±45°)',
  'Consolidated Ply',
  'Hybrid Ply',
  'Random Mat Ply',
  'Surface Ply',
  'Core (PET Foam)',
  'Core (Balsa)',
];

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

function Select({ value, onChange, options, placeholder = 'Select…' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center justify-between rounded-md border border-[#e2e8f0] bg-white px-3 py-1 text-left text-[14px] font-normal text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#006496] focus:ring-offset-1"
      >
        <span className={value ? 'text-[#0a0a0a]' : 'text-[#6b7280]'}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#6b7280] transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-64 overflow-y-auto rounded-md border border-[#e5e7eb] bg-white py-1 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]"
        >
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <li key={opt} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[14px] leading-5 ${
                    selected ? 'bg-[#eef9ff] text-[#171717]' : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                  }`}
                >
                  <span>{opt}</span>
                  {selected && <Check className="h-4 w-4" strokeWidth={2} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function MaterialNew() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const existing = id ? MATERIALS.find((m) => m.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState(existing?.type ?? 'UD ply');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [activeTab, setActiveTab] = useState('general');
  const [mechValues, setMechValues] = useState<Record<string, string>>({});
  const [fatigueValues, setFatigueValues] = useState<Record<string, string>>({});

  // Title: editing shows the material name everywhere; creating shows "New material" on General.
  const titleText = existing
    ? name || existing.name
    : activeTab === 'general'
      ? 'New material'
      : name || 'New material';

  function handleGeneralSubmit() {
    if (existing) {
      updateMaterial(existing.id, { name, type, description });
      navigate('/material');
      return;
    }
    // Mock stand-in for a POST: append to the list, then open the new material.
    const material = createMaterial({ name, type, description });
    navigate(`/material/${material.id}`);
  }

  /** Save (create or update) then go back to the list — called by Exit edit mode. */
  function handleExit() {
    if (existing) {
      updateMaterial(existing.id, { name, type, description });
    } else if (name.trim()) {
      createMaterial({ name, type, description });
    }
    navigate('/material');
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#f8fafc]">
      <MainNav />

      {/* Sub-toolbar row: tabs + title + actions */}
      <div className="relative flex h-[52px] w-full shrink-0 items-center justify-between bg-[#f8fafc] px-4 py-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-9 shrink-0">
          <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
            <TabsTrigger
              value="general"
              className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="mechanical"
              className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
            >
              Mechanical properties
            </TabsTrigger>
            <TabsTrigger
              value="fatigue"
              className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
            >
              Fatigue properties
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <h1 className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-[18px] font-semibold leading-7 text-[#0a0a0a] lg:block">
          {titleText}
        </h1>

        <div className="flex shrink-0 items-center gap-4">
          <div className="flex items-center gap-[6px]">
            <Check className="h-4 w-4 text-[#737373]" strokeWidth={2} />
            <span className="text-[14px] leading-5 text-[#737373]">Saved</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Undo"
              className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f5f9] text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0] hover:text-[#0a0a0a]"
            >
              <Undo2 className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Redo"
              className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f5f9] text-[#6b7280] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0] hover:text-[#0a0a0a]"
            >
              <Redo2 className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleExit}
            className="inline-flex h-8 items-center rounded-md bg-[#f1f5f9] px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#e2e8f0]"
          >
            Back to Materials
          </button>
        </div>
      </div>

      {/* Main content area */}
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
                htmlFor="material-name"
                className="text-[14px] font-medium leading-none text-[#0a0a0a]"
              >
                Name<span className="text-[#dc2626]">*</span>
              </Label>
              <Input
                id="material-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ST-UD-C600-EP"
                required
                className="h-9 rounded-md border-[#e2e8f0] bg-white px-3 py-1 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              />
            </div>

            <div className="flex w-full flex-col gap-2">
              <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
                Type<span className="text-[#dc2626]">*</span>
              </Label>
              <Select value={type} onChange={setType} options={MATERIAL_TYPES} />
            </div>

            <div className="flex w-full flex-col gap-2">
              <Label
                htmlFor="material-description"
                className="text-[14px] font-medium leading-none text-[#0a0a0a]"
              >
                Description<span className="text-[#dc2626]">*</span>
              </Label>
              <Textarea
                id="material-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Carbon/Epoxy UD lamina. Fiber: Toray T700 (600gsm). Matrix: ST-Epoxy-Standard."
                required
                rows={4}
                className="min-h-[98px] rounded-md border-[#e2e8f0] bg-white px-3 py-2 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              />
            </div>
          </form>
        )}

        {activeTab === 'mechanical' && (
          <PropertyFormTab
            sections={MECHANICAL_SECTIONS}
            values={mechValues}
            onChange={(name, value) => setMechValues((prev) => ({ ...prev, [name]: value }))}
            optionalAfterIndex={0}
          />
        )}

        {activeTab === 'fatigue' && (
          <PropertyFormTab
            sections={FATIGUE_SECTIONS}
            values={fatigueValues}
            onChange={(name, value) => setFatigueValues((prev) => ({ ...prev, [name]: value }))}
            optionalAfterIndex={-1}
          />
        )}
      </main>
    </div>
  );
}
