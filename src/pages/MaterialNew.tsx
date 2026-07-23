import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainNav } from '@/components/common/layout/MainNav';
import { EditPageToolbar } from '@/components/common/layout/EditPageToolbar';
import { PropertyFormTab } from '@/components/material/PropertyFormTab';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownSelect as Select } from '@/components/common/form/DropdownSelect';
import { MECHANICAL_SECTIONS, FATIGUE_SECTIONS } from '@/data/materialFormFields';
import { MATERIALS, createMaterial, updateMaterial } from '@/data/materials';

const TABS = [
  { value: 'general', label: 'General' },
  { value: 'mechanical', label: 'Mechanical properties' },
  { value: 'fatigue', label: 'Fatigue properties' },
];

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

      <EditPageToolbar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title={titleText}
        backLabel="Back to Materials"
        onBack={handleExit}
      />

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
