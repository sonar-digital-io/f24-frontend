import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Settings, Check, Undo2, Redo2 } from 'lucide-react';
import { MainNav } from '@/components/common/layout/MainNav';
import { OccViewer } from '@/components/common/viewer/OccViewer';
import { ProfileDistributionPanel } from '@/components/geometry/ProfileDistributionPanel';
import { ProfilesPanel } from '@/components/geometry/ProfilesPanel';
import { StackingPanel } from '@/components/geometry/StackingPanel';
import { CoordinateGizmo } from '@/components/common/viewer/CoordinateGizmo';
import { RenderToggle } from '@/components/common/viewer/RenderToggle';
import type { RenderMode } from '@/types';
import { FormField } from '@/components/geometry/GeometryEditControls';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCreateGeometry,
  useGeometryDetail,
  useUpdateGeometry,
  useUpdateGeometrySettings,
  useUpdateGeometryProfiles,
  useRunProfileGenerator,
  useUpdateProfileGenerator,
} from '@/hooks/api/useGeometry';
import { todayISO, toIsoDateTime, toDateInputValue } from '@/lib/utils';
import type { Profile } from '@/data/profiles';
import type { GeometryProfile, GeometryProfileInput, ProfileGeneratorParameters } from '@/api/types/geometry';

interface GlobalProperties {
  nominalRadius: string;
  rootRadius: string;
  stackingLine: string;
  bladeNumber: string;
}

/** Always sent as-is to PUT /geometry/:id/settings/ — shown in the form but not editable. */
const AIRFOIL_ORIENTATION = 'normal';
const AIRFOIL_DRAWING_PLANE = 'xy';

/** UI dropdown labels <-> backend profile "type" reference, per the profile-generator spec example. */
const API_TO_UI_PROFILE_TYPE: Record<string, string> = {
  naca_4_digit: 'NACA 4 digit',
  naca_5_digit: 'NACA 5 digit',
  custom_airfoil: 'Custom airfoil',
};
const UI_TO_API_PROFILE_TYPE: Record<string, string> = {
  'NACA 4 digit': 'naca_4_digit',
  'NACA 5 digit': 'naca_5_digit',
  'Custom airfoil': 'custom_airfoil',
};

function toUiProfile(p: GeometryProfile): Profile {
  const params = new Map(p.parameters.map((kv) => [kv.reference, kv.value]));
  return {
    id: String(p.id),
    name: p.name,
    position: p.position,
    type: API_TO_UI_PROFILE_TYPE[p.type] ?? p.type,
    maxCamber: Number(params.get('max_camber') ?? 0),
    maxCamberPosition: Number(params.get('max_camber_position') ?? 0),
    thickness: Number(params.get('max_thickness') ?? 0),
    show2D: true,
  };
}

function toApiProfile(p: Profile): GeometryProfileInput {
  return {
    name: p.name,
    position: p.position,
    type: UI_TO_API_PROFILE_TYPE[p.type] ?? p.type,
    parameters: [
      { reference: 'max_camber', value: String(p.maxCamber) },
      { reference: 'max_camber_position', value: String(p.maxCamberPosition) },
      { reference: 'max_thickness', value: String(p.thickness) },
    ],
  };
}

export function GeometryEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = id === 'new';
  const geometryId = isNew ? NaN : Number(id);
  const duplicateFromRaw = isNew ? searchParams.get('duplicateFrom') : null;
  const duplicateSourceId = duplicateFromRaw ? Number(duplicateFromRaw) : NaN;

  const detailQuery = useGeometryDetail(geometryId);
  const duplicateQuery = useGeometryDetail(duplicateSourceId);
  const createMutation = useCreateGeometry();
  const updateGeneralMutation = useUpdateGeometry(geometryId);
  const updateSettingsMutation = useUpdateGeometrySettings(geometryId);
  const updateProfilesMutation = useUpdateGeometryProfiles(geometryId);
  const runGeneratorMutation = useRunProfileGenerator();
  const updateGeneratorMutation = useUpdateProfileGenerator();

  const name = isNew ? 'New geometry' : (detailQuery.data?.name ?? id ?? 'New geometry');

  const [activeTab, setActiveTab] = useState(isNew ? 'create' : 'global-properties');
  const [renderMode, setRenderMode] = useState<RenderMode>('wireframe');
  const [profileFolded, setProfileFolded] = useState(false);
  const [stackingFolded, setStackingFolded] = useState(true);
  // Global properties — sent via PUT /geometry/:id/settings/ as key/value pairs, and
  // hydrated below from the `settings` array nested in GET /geometry/:id/ when present.
  const [props, setProps] = useState<GlobalProperties>({
    nominalRadius: '',
    rootRadius: '',
    stackingLine: '',
    bladeNumber: '',
  });

  // Profiles — hydrated from the `profiles` array nested in GET /geometry/:id/.
  const [hydratedProfiles, setHydratedProfiles] = useState<Profile[] | null>(null);

  // Project config state — name/date/description, sent to POST /geometry/ on create
  // or PUT /geometry/:id/ on edit. For edits, hydrated from GET /geometry/:id/.
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState(todayISO());
  const [newDescription, setNewDescription] = useState('');
  const [duplicateHydrated, setDuplicateHydrated] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [baseline, setBaseline] = useState<{ name: string; date: string; description: string } | null>(
    null
  );

  // When Create is clicked, navigate replaces /geometry/new → /geometry/:id without
  // remounting (same route pattern). Switch to Global properties once isNew turns false.
  useEffect(() => {
    if (!isNew && activeTab === 'create') {
      setActiveTab('global-properties');
    }
  }, [isNew]);

  // Load the existing geometry's name/date/description — plus, when present, the nested
  // settings/profiles arrays — into the form when editing.
  useEffect(() => {
    if (isNew || hydrated || detailQuery.isFetching || !detailQuery.data) return;
    const g = detailQuery.data;
    const hydratedDate = toDateInputValue(g.created_at);
    const hydratedDescription = g.description ?? '';
    setNewName(g.name);
    setNewDate(hydratedDate);
    setNewDescription(hydratedDescription);
    setBaseline({ name: g.name, date: hydratedDate, description: hydratedDescription });

    if (g.settings) {
      const settingsMap = new Map(g.settings.map((kv) => [kv.reference, String(kv.value)]));
      setProps({
        nominalRadius: settingsMap.get('nominal_radius') ?? '',
        rootRadius: settingsMap.get('root_radius') ?? '',
        stackingLine: settingsMap.get('stacking_line') ?? '',
        bladeNumber: settingsMap.get('blade_number') ?? '',
      });
    }

    if (g.profiles) {
      setHydratedProfiles(g.profiles.map(toUiProfile));
    }

    setHydrated(true);
  }, [isNew, hydrated, detailQuery.isFetching, detailQuery.data]);

  useEffect(() => {
    if (
      !isNew ||
      duplicateHydrated ||
      !Number.isFinite(duplicateSourceId) ||
      duplicateQuery.isFetching ||
      !duplicateQuery.data
    ) {
      return;
    }
    const g = duplicateQuery.data;
    setNewName(`${g.name}_copy`);
    setNewDate(toDateInputValue(g.created_at));
    setNewDescription(g.description ?? '');
    setDuplicateHydrated(true);
  }, [isNew, duplicateHydrated, duplicateSourceId, duplicateQuery.isFetching, duplicateQuery.data]);

  function updateField(key: keyof GlobalProperties, value: string) {
    setProps((p) => ({ ...p, [key]: value }));
  }

  async function handleCreate() {
    if (!newName.trim() || !newDate || !newDescription.trim()) return;
    try {
      const result = await createMutation.mutateAsync({
        name: newName.trim(),
        created_at: toIsoDateTime(newDate),
        description: newDescription.trim(),
      });
      // /geometry/new and /geometry/:id share a route, so this navigate does NOT
      // remount the component — leave the create tab and clear the form explicitly,
      // otherwise the create panel stays up and a second click creates a duplicate.
      setActiveTab('global-properties');
      setNewName('');
      setNewDate(todayISO());
      setNewDescription('');
      navigate(`/geometry/${result.id}`, { replace: true });
    } catch {
      // createMutation.isError already surfaces the failure in the UI — stay on this tab.
    }
  }

  async function handleUpdateGeneral() {
    if (!newName.trim() || !newDate || !newDescription.trim() || !baseline) return;
    if (newName === baseline.name && newDate === baseline.date && newDescription === baseline.description) {
      return;
    }
    await updateGeneralMutation.mutateAsync({
      name: newName.trim(),
      created_at: toIsoDateTime(newDate),
      description: newDescription.trim(),
    });
    setBaseline({ name: newName, date: newDate, description: newDescription });
  }

  async function handleSaveGlobalProperties() {
    await updateSettingsMutation.mutateAsync({
      settings: [
        { reference: 'nominal_radius', value: props.nominalRadius },
        { reference: 'root_radius', value: props.rootRadius },
        { reference: 'airfoil_orientation', value: AIRFOIL_ORIENTATION },
        { reference: 'airfoil_drawing_plane', value: AIRFOIL_DRAWING_PLANE },
        { reference: 'stacking_line', value: props.stackingLine },
        { reference: 'blade_number', value: props.bladeNumber },
      ],
    });
  }

  async function handleSaveProfiles(profiles: Profile[]) {
    await updateProfilesMutation.mutateAsync({ profiles: profiles.map(toApiProfile) });
  }

  async function handleSaveProfileGeneratorParams(params: ProfileGeneratorParameters) {
    await updateGeneratorMutation.mutateAsync({ geometryId, payload: { profile_generator_parameters: params } });
  }

  async function handleGenerateProfiles(params: ProfileGeneratorParameters) {
    await runGeneratorMutation.mutateAsync({ geometryId, payload: { profile_generator_parameters: params } });
  }

  // Generate profiles from the distribution curves, persist them via
  // PUT /geometry/:id/profiles/, then move on to the Profiles tab.
  async function handleSaveAndNextDistribution(params: ProfileGeneratorParameters) {
    const { profiles } = await runGeneratorMutation.mutateAsync({
      geometryId,
      payload: { profile_generator_parameters: params },
    });
    await updateProfilesMutation.mutateAsync({ profiles });
    setHydratedProfiles(profiles.map((p, i) => toUiProfile({ ...p, id: i, file: null })));
    setActiveTab('profiles');
  }

  function handleExit() {
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
          {activeTab === 'create' && !isNew && !hydrated && (detailQuery.isLoading || detailQuery.isFetching) && (
            <div className="rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 text-center shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
              <p className="text-[14px] text-[#6b7280]">Loading geometry…</p>
            </div>
          )}
          {activeTab === 'create' && !isNew && detailQuery.isError && (
            <div className="rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 text-center shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
              <p className="text-[14px] text-[#dc2626]">Failed to load this geometry from the server.</p>
            </div>
          )}
          {activeTab === 'create' && (isNew || (hydrated && !detailQuery.isError)) && (
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
                <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
                  Date<span className="text-[#dc2626]">*</span>
                </Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">
                  Description<span className="text-[#dc2626]">*</span>
                </Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the geometry"
                  required
                  rows={2}
                  className="min-h-[60px] rounded-md border-[#e2e8f0] px-3 py-2 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                />
              </div>

              {(createMutation.isError || updateGeneralMutation.isError) && (
                <p className="text-[13px] text-[#dc2626]">
                  Failed to {isNew ? 'create' : 'update'} geometry. Please try again.
                </p>
              )}

              {isNew ? (
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
                    disabled={!newName.trim() || !newDate || !newDescription.trim() || createMutation.isPending}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#006496]"
                  >
                    {createMutation.isPending ? 'Creating…' : 'Create'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleUpdateGeneral}
                    disabled={!newName.trim() || !newDate || !newDescription.trim() || updateGeneralMutation.isPending}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#006496]"
                  >
                    {updateGeneralMutation.isPending ? 'Updating…' : 'Update'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'global-properties' && !isNew && (
            <div className="flex max-h-[calc(100vh-72px)] flex-col gap-4 overflow-y-auto rounded-[14px] border border-[#e5e7eb] bg-white/95 p-4 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
              <FormField
                label="Nominal radius (m)"
                value={props.nominalRadius}
                onChange={(v) => updateField('nominalRadius', v)}
                placeholder="e.g. 75.0"
              />
              <FormField
                label="Root radius (%)"
                value={props.rootRadius}
                onChange={(v) => updateField('rootRadius', v)}
                placeholder="e.g. 5.0"
              />
              <FormField label="Airfoil orientation" value={AIRFOIL_ORIENTATION} onChange={() => {}} disabled />
              <FormField label="Airfoil drawing plane" value={AIRFOIL_DRAWING_PLANE} onChange={() => {}} disabled />
              <FormField
                label="Stacking line"
                value={props.stackingLine}
                onChange={(v) => updateField('stackingLine', v)}
                placeholder="e.g. 1"
              />
              <FormField
                label="Blade number"
                value={props.bladeNumber}
                onChange={(v) => updateField('bladeNumber', v)}
                placeholder="e.g. 3"
              />
              <p className="text-[14px] leading-5 text-[#6b7280]">
                Defines the longitudinal position along the chord line where the blade sections are
                aligned. A value of 0 represents the leading edge, while 1 represents the trailing
                edge. This setting determines the structural balance and aerodynamic center of the
                blade.
              </p>
              <button
                type="button"
                onClick={handleSaveGlobalProperties}
                disabled={updateSettingsMutation.isPending}
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updateSettingsMutation.isPending ? 'Saving…' : 'Save'}
              </button>
              {updateSettingsMutation.isError && (
                <p className="text-[13px] text-[#dc2626]">Failed to save. Please try again.</p>
              )}
            </div>
          )}
          {activeTab === 'profile-distribution' && (
            <ProfileDistributionPanel
              folded={profileFolded}
              onFoldToggle={() => setProfileFolded((f) => !f)}
              rootRadiusPercent={props.rootRadius}
              onSaveParameters={handleSaveProfileGeneratorParams}
              onGenerate={handleGenerateProfiles}
              onSaveAndNext={handleSaveAndNextDistribution}
              saving={updateGeneratorMutation.isPending}
              generating={runGeneratorMutation.isPending}
              savingAndNext={runGeneratorMutation.isPending || updateProfilesMutation.isPending}
              saveError={updateGeneratorMutation.isError}
              generateError={runGeneratorMutation.isError}
              saveAndNextError={runGeneratorMutation.isError || updateProfilesMutation.isError}
            />
          )}
          {activeTab === 'profiles' && (
            <ProfilesPanel
              initialProfiles={hydratedProfiles ?? undefined}
              onSave={handleSaveProfiles}
              saving={updateProfilesMutation.isPending}
              saveError={updateProfilesMutation.isError}
            />
          )}
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
