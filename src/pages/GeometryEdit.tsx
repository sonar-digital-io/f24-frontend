import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Settings, Check, Undo2, Redo2 } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { OccViewer } from '@/components/common/viewer/OccViewer';
import { ProfileDistributionPanel } from '@/components/geometry/ProfileDistributionPanel';
import { ProfilesPanel } from '@/components/geometry/ProfilesPanel';
import { StackingPanel } from '@/components/geometry/StackingPanel';
import { CoordinateGizmo } from '@/components/common/viewer/CoordinateGizmo';
import { RenderToggle } from '@/components/common/viewer/RenderToggle';
import type { RenderMode } from '@/types';
import { Select, Tip, FormField } from '@/components/geometry/GeometryEditControls';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BLADE_TYPES, GEOMETRIES, createGeometry, updateGeometry } from '@/data/geometries';
import type { BladeType } from '@/data/geometries';


const MANUFACTURING_TECHNOLOGIES = [
  'To be determined',
  'Vacuum infusion',
  'Prepreg autoclave',
  'Filament winding',
  'Resin transfer moulding',
];

interface GlobalProperties {
  nominalRadius: string;
  rootRadius: string;
  stackingReference: string;
}

export function GeometryEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const geometry = isNew ? undefined : GEOMETRIES.find((g) => g.id === id);
  const name = isNew ? 'New geometry' : (geometry?.name ?? id ?? 'New geometry');

  const [activeTab, setActiveTab] = useState(isNew ? 'create' : 'global-properties');
  const [renderMode, setRenderMode] = useState<RenderMode>('wireframe');
  const [profileFolded, setProfileFolded] = useState(false);
  const [stackingFolded, setStackingFolded] = useState(true);
  const [props, setProps] = useState<GlobalProperties>({
    nominalRadius: '75.0',
    rootRadius: '5.0',
    stackingReference: '0.3',
  });

  // New geometry project config state — pre-filled from existing geometry when returning to this tab
  const [newBladeType, setNewBladeType] = useState(geometry?.type ?? '');
  const [newManufacturing, setNewManufacturing] = useState('To be determined');
  const [newName, setNewName] = useState(geometry?.name ?? '');
  const [newDescription, setNewDescription] = useState(geometry?.description ?? '');

  // When Create is clicked, navigate replaces /geometry/new → /geometry/:id without
  // remounting (same route pattern). Switch to Global properties once isNew turns false.
  useEffect(() => {
    if (!isNew && activeTab === 'create') {
      setActiveTab('global-properties');
    }
  }, [isNew]);

  function updateField(key: keyof GlobalProperties, value: string) {
    setProps((p) => ({ ...p, [key]: value }));
  }

  function handleCreate() {
    if (!newBladeType || !newName.trim()) return;
    const geom = createGeometry(newName.trim(), newDescription.trim(), newBladeType as BladeType);
    // /geometry/new and /geometry/:id share a route, so this navigate does NOT
    // remount the component — leave the create tab and clear the form explicitly,
    // otherwise the create panel stays up and a second click creates a duplicate.
    setActiveTab('global-properties');
    setNewBladeType('');
    setNewName('');
    setNewDescription('');
    navigate(`/geometry/${geom.id}`, { replace: true });
  }

  function handleExit() {
    if (!isNew && geometry) {
      // Touch lastUpdated to signal it was worked on (physics props aren't in the data model yet)
      updateGeometry(geometry.id, {});
    }
    navigate('/geometry');
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      {/* Body: full-bleed 3D scene with floating overlays (incl. sub-toolbar) */}
      <main className="relative flex-1 overflow-hidden">
        {/* Three.js canvas fills the whole body, including under the sub-toolbar */}
        <OccViewer wireframe={renderMode === 'wireframe'} />

        {/* Floating sub-toolbar — transparent bg so the canvas shows through.
            Title is absolutely positioned at viewport center, independent of
            left/right element widths. */}
        <div className="absolute inset-x-0 top-0 z-30 h-[52px]">
          <div className="absolute inset-y-0 left-4 flex items-center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-9">
              <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6]/95 p-[3px] backdrop-blur-sm">
                {[
                  { value: 'create', label: 'Project configuration' },
                  { value: 'global-properties', label: 'Global properties' },
                  { value: 'profile-distribution', label: 'Profile distribution' },
                  { value: 'profiles', label: 'Profiles' },
                  { value: 'stacking', label: 'Stacking' },
                  { value: 'spars', label: 'Spars' },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    disabled={isNew && tab.value !== 'create'}
                    className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] disabled:pointer-events-none disabled:opacity-40"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <h1 className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden text-[18px] font-semibold leading-7 text-[#0a0a0a] lg:block">
            {name}
          </h1>

          <div className="absolute inset-y-0 right-4 flex items-center gap-4">
            {!isNew && (
              <div className="flex items-center gap-[6px]">
                <Check className="h-4 w-4 text-[#737373]" strokeWidth={2} />
                <span className="text-[14px] leading-5 text-[#737373]">Saved</span>
              </div>
            )}
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
              Back to Geometries
            </button>
          </div>
        </div>

        {/* Floating properties panel (top-left, gap below toolbar matches gap above tab pill = 8px).
            Width depends on the active tab. z-30 so it sits above the render toggle (z-20). */}
        <aside
          className={`absolute left-4 top-[52px] z-30 ${
            activeTab === 'create'
              ? 'w-[468px] max-w-[calc(100vw-2rem)]'
              : activeTab === 'profile-distribution'
                ? profileFolded
                  ? 'w-[516px] max-w-[calc(100vw-2rem)]'
                  : 'w-[924px] max-w-[calc(100vw-2rem)]'
                : activeTab === 'profiles'
                  ? 'w-[404px] max-w-[calc(100vw-2rem)]'
                  : activeTab === 'stacking'
                    ? stackingFolded
                      ? 'w-[516px] max-w-[calc(100vw-2rem)]'
                      : 'w-[924px] max-w-[calc(100vw-2rem)]'
                    : 'w-[280px]'
          }`}
        >
          {activeTab === 'create' && (
            <div className="flex flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
              <div className="flex flex-col gap-1">
                <p className="text-[16px] font-semibold leading-none text-[#0a0a0a]">
                  Project configuration
                </p>
                <p className="text-[13px] leading-5 text-[#6b7280]">
                  Your selection defines the starting geometry, which can be fully customized in the next steps.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
                  Blade type<span className="text-[#dc2626]">*</span>
                </Label>
                <Tip label={!isNew ? 'Cannot be changed after creation' : ''}>
                  <Select value={newBladeType} onChange={setNewBladeType} options={BLADE_TYPES} disabled={!isNew} />
                </Tip>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
                  Manufacturing technology
                </Label>
                <Tip label={!isNew ? 'Cannot be changed after creation' : ''}>
                  <Select value={newManufacturing} onChange={setNewManufacturing} options={MANUFACTURING_TECHNOLOGIES} disabled={!isNew} />
                </Tip>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
                  Name<span className="text-[#dc2626]">*</span>
                </Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Geometry name"
                  className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">Description</Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                  className="min-h-[60px] rounded-md border-[#e2e8f0] px-3 py-2 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                />
              </div>

              {isNew && (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Link
                    to="/geometry"
                    className="inline-flex h-9 items-center justify-center rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-[14px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
                  >
                    Cancel
                  </Link>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newBladeType || !newName.trim()}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#006496]"
                  >
                    Create
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'global-properties' && !isNew && (
            <div className="flex flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white/95 p-4 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
              <FormField
                label="Nominal radius (m)"
                value={props.nominalRadius}
                onChange={(v) => updateField('nominalRadius', v)}
              />
              <FormField
                label="Root radius (%)"
                value={props.rootRadius}
                onChange={(v) => updateField('rootRadius', v)}
              />
              <FormField
                label="Stacking reference"
                value={props.stackingReference}
                onChange={(v) => updateField('stackingReference', v)}
              />
              <p className="text-[14px] leading-5 text-[#6b7280]">
                Defines the longitudinal position along the chord line where the blade sections are
                aligned. A value of 0 represents the leading edge, while 1 represents the trailing
                edge. This setting determines the structural balance and aerodynamic center of the
                blade.
              </p>
            </div>
          )}
          {activeTab === 'profile-distribution' && (
            <ProfileDistributionPanel
              folded={profileFolded}
              onFoldToggle={() => setProfileFolded((f) => !f)}
            />
          )}
          {activeTab === 'profiles' && <ProfilesPanel />}
          {activeTab === 'stacking' && (
            <StackingPanel folded={stackingFolded} onFoldToggle={() => setStackingFolded((f) => !f)} />
          )}
          {activeTab !== 'create' &&
            activeTab !== 'global-properties' &&
            activeTab !== 'profile-distribution' &&
            activeTab !== 'profiles' &&
            activeTab !== 'stacking' && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 text-center shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
              <p className="text-[14px] font-semibold text-[#0a0a0a]">
                {activeTab.replace('-', ' ').replace(/^./, (c) => c.toUpperCase())}
              </p>
              <p className="text-[14px] text-[#6b7280]">Coming soon.</p>
            </div>
          )}
        </aside>

        {/* Render toggle + settings (top-center, gap below toolbar matches gap above tab pill = 8px) */}
        <div className="absolute left-1/2 top-[52px] z-20 flex -translate-x-1/2 items-center gap-2">
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
      </main>
    </div>
  );
}
