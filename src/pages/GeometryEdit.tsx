import { useEffect, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useExitEditModeTarget } from '@/hooks/useExitEditModeTarget';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { MainNav } from '@/components/common/layout/MainNav';
import { OccViewer } from '@/components/common/viewer/OccViewer';
import { GeometryEditToolbar } from '@/components/geometry/GeometryEditToolbar';
import { GeometryCreatePanel } from '@/components/geometry/GeometryCreatePanel';
import { GeometryGlobalPropertiesPanel } from '@/components/geometry/GeometryGlobalPropertiesPanel';
import { ProfileDistributionPanel } from '@/components/geometry/ProfileDistributionPanel';
import { ProfilesPanel } from '@/components/geometry/ProfilesPanel';
import { StackingPanel } from '@/components/geometry/StackingPanel';
import { CoordinateGizmo } from '@/components/common/viewer/CoordinateGizmo';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useCreateGeometry,
  useGeometryDetail,
  useUpdateGeometry,
  useUpdateGeometrySettings,
  useUpdateGeometryProfiles,
  useRunProfileGenerator,
  useUpdateProfileGenerator,
  useUpdateGeometryEdges,
  useGeometryEdges,
} from '@/hooks/api/useGeometry';
import { useGeometrySysconfig } from '@/hooks/api/useSysconfig';
import { useHydrateOnce } from '@/hooks/useHydrateOnce';
import { todayISO, toIsoDateTime, toDateInputValue } from '@/lib/utils';
import { toUiProfile, toApiProfile } from '@/lib/geometryProfileMapping';
import { getApiErrorMessage } from '@/lib/apiError';
import { buildSysconfigSections } from '@/lib/sysconfigMapping';
import { isFormValid } from '@/lib/sysconfigFormValidation';
import type { SaveStatus } from '@/components/common/layout/EditPageToolbarActions';
import { toKeyValueList, keyValueSignature } from '@/lib/keyValueMapping';
import type { Profile } from '@/data/profiles';
import type { GeometryEdgeInput, ProfileGeneratorParameters } from '@/api/types/geometry';

const PANEL_WIDTH_NARROW = 'w-[516px] max-w-[calc(100vw-2rem)]';
const PANEL_WIDTH_WIDE = 'w-[924px] max-w-[calc(100vw-2rem)]';

/** The floating properties panel's width depends on the active tab (and, for
 *  the foldable tabs, whether their side panel is folded). */
function getPanelWidthClass(
  activeTab: string,
  profileFolded: boolean,
  stackingFolded: boolean
): string {
  switch (activeTab) {
    case 'create':
      return 'w-[468px] max-w-[calc(100vw-2rem)]';
    case 'profile-distribution':
      return profileFolded ? PANEL_WIDTH_NARROW : PANEL_WIDTH_WIDE;
    case 'profiles':
      return 'w-[404px] max-w-[calc(100vw-2rem)]';
    case 'stacking':
      return stackingFolded ? PANEL_WIDTH_NARROW : PANEL_WIDTH_WIDE;
    default:
      return 'w-[280px]';
  }
}

export function GeometryEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const exitTarget = useExitEditModeTarget('/geometry');
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
  const updateEdgesMutation = useUpdateGeometryEdges(geometryId);
  const edgesQuery = useGeometryEdges(geometryId);
  // Profile distribution's tab unmounts on tab switch, so its bezier curves
  // need to be remembered here — seeded from GET /geometry/:id/'s nested
  // profile_generator_parameters on load, then kept in sync with whatever
  // was last sent to PUT/POST /geometry/:id/tools/profile-generator/.
  const [savedProfileParams, setSavedProfileParams] = useState<ProfileGeneratorParameters | undefined>(undefined);
  const [resultStl, setResultStl] = useState<ArrayBuffer | undefined>(undefined);
  const [resultScale, setResultScale] = useState(1);
  // Signature of the (settings, profile_generator_parameters, profiles, edges) last used to
  // generate a result — lets the effect below tell "still nothing changed" apart from "this
  // is new/different", instead of re-requesting on every GET /geometry/:id/ refetch.
  const [lastResultSignature, setLastResultSignature] = useState<string | null>(null);
  // The signature of the most recently *requested* generation — lets a resolving
  // response tell whether it's still the latest one or a stale, superseded request.
  const latestResultRequestRef = useRef<string | null>(null);
  const [resultShowBlade, setResultShowBlade] = useState(true);
  const [resultShowWireframe, setResultShowWireframe] = useState(false);

  const [activeTab, setActiveTab] = useState(isNew ? 'create' : 'global-properties');
  const [profileFolded, setProfileFolded] = useState(false);
  const [stackingFolded, setStackingFolded] = useState(true);
  // Global properties — field list/labels/constraints come from GET /sysconfig/'s
  // configuration.geometry_settings; values are keyed by backend `reference` (e.g.
  // "nominal_radius"), sent via PUT /geometry/:id/settings/ as key/value pairs, and
  // hydrated below from the `settings` array nested in GET /geometry/:id/ when present.
  const sysconfigQuery = useGeometrySysconfig();
  const globalPropertySections = useMemo(
    () =>
      sysconfigQuery.data
        ? buildSysconfigSections(sysconfigQuery.data, sysconfigQuery.data.configuration.geometry_settings)
        : [],
    [sysconfigQuery.data]
  );
  const [props, setProps] = useState<Record<string, string>>({});
  // Snapshot of `props` as last confirmed saved — null until the first hydrate/save,
  // same role as `baseline` below but for the global properties fields.
  const [propsBaseline, setPropsBaseline] = useState<Record<string, string> | null>(null);

  // A `fixed` field (e.g. airfoil orientation/drawing plane) is backend-locked to a single
  // constant value, exposed as sysconfig's own `entry.value` rather than anything per-geometry
  // — seed it into `props` as soon as sections load, for a brand new geometry that has no
  // `settings` of its own yet to hydrate it from. Already-hydrated/edited values are untouched.
  useEffect(() => {
    setProps((p) => {
      const defaults: Record<string, string> = {};
      globalPropertySections.forEach((section) =>
        section.fields.forEach((field) => {
          if (field.fixed && field.value !== undefined && p[field.name] === undefined) {
            defaults[field.name] = field.value;
          }
        })
      );
      return Object.keys(defaults).length > 0 ? { ...defaults, ...p } : p;
    });
  }, [globalPropertySections]);

  // Profiles — hydrated from the `profiles` array nested in GET /geometry/:id/.
  const [hydratedProfiles, setHydratedProfiles] = useState<Profile[] | null>(null);

  // Project config state — name/date/description, sent to POST /geometry/ on create
  // or PUT /geometry/:id/ on edit. For edits, hydrated from GET /geometry/:id/.
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState(todayISO());
  const [newDescription, setNewDescription] = useState('');
  const [baseline, setBaseline] = useState<{ name: string; date: string; description: string } | null>(
    null
  );
  // Blur can fire again while a create is still in flight (e.g. tabbing through several
  // fields quickly) — this guards against firing a second, duplicate create.
  const creatingRef = useRef(false);

  // When Create is clicked, navigate replaces /geometry/new → /geometry/:id without
  // remounting (same route pattern). Switch to Global properties once isNew turns false.
  useEffect(() => {
    if (!isNew && activeTab === 'create') {
      setActiveTab('global-properties');
    }
    // Only re-run on the isNew transition (after Create succeeds) — not on every
    // manual tab switch, which would defeat the point of this one-time redirect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew]);

  // Re-fetch GET /geometry/:id/ on every tab switch — Stacking's availability (see
  // `profilesSaved` below) depends on its nested `profiles` array staying current,
  // e.g. right after a profile-generator run persists profiles server-side.
  useEffect(() => {
    if (!isNew) detailQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Keep the Profiles tab's list (and Stacking's gating) in sync with the backend's nested
  // `profiles` array on every GET /geometry/:id/ — not hydrate-once, since the effect above
  // refetches repeatedly and profiles can also be created by other means (e.g. via the
  // profile-generator — see handleProfileGeneratorCommit, which updates this same state
  // immediately from its own response instead of waiting for this effect's next refetch).
  useEffect(() => {
    if (detailQuery.data?.profiles) {
      setHydratedProfiles(detailQuery.data.profiles.map(toUiProfile));
    }
  }, [detailQuery.data]);

  // Load the existing geometry's name/date/description — plus, when present, the nested
  // settings array — into the form when editing.
  const hydrated = useHydrateOnce(!isNew && !detailQuery.isFetching && !!detailQuery.data, () => {
    const g = detailQuery.data!;
    const hydratedDate = toDateInputValue(g.created_at);
    const hydratedDescription = g.description ?? '';
    setNewName(g.name);
    setNewDate(hydratedDate);
    setNewDescription(hydratedDescription);
    setBaseline({ name: g.name, date: hydratedDate, description: hydratedDescription });

    if (g.settings) {
      const hydratedProps = Object.fromEntries(g.settings.map((kv) => [kv.reference, String(kv.value)]));
      setProps(hydratedProps);
      setPropsBaseline(hydratedProps);
    }

    if (g.profile_generator_parameters) {
      setSavedProfileParams(g.profile_generator_parameters);
    }
  });

  useHydrateOnce(
    isNew && Number.isFinite(duplicateSourceId) && !duplicateQuery.isFetching && !!duplicateQuery.data,
    () => {
      const g = duplicateQuery.data!;
      setNewName(`${g.name}_copy`);
      setNewDate(toDateInputValue(g.created_at));
      setNewDescription(g.description ?? '');
    }
  );

  function updateField(key: string, value: string) {
    setProps((p) => ({ ...p, [key]: value }));
  }

  // Autosave the Project configuration tab on every blur, same as Material's General
  // tab — creates the geometry on the first valid blur while new, PUTs on later ones.
  async function handleCreatePanelBlur() {
    if (!newName.trim() || !newDate || !newDescription.trim()) return;
    if (isNew) {
      if (creatingRef.current) return;
      creatingRef.current = true;
      try {
        const result = await createMutation.mutateAsync({
          name: newName.trim(),
          created_at: toIsoDateTime(newDate),
          description: newDescription.trim(),
        });
        // /geometry/new and /geometry/:id share a route, so this navigate does NOT
        // remount the component — switching the URL just flips isNew to false.
        navigate(`/geometry/${result.id}`, { replace: true });
      } catch {
        // createMutation.isError already surfaces the failure in the UI — stay on this tab.
      } finally {
        creatingRef.current = false;
      }
      return;
    }
    if (!baseline) return;
    if (newName === baseline.name && newDate === baseline.date && newDescription === baseline.description) {
      return;
    }
    try {
      await updateGeneralMutation.mutateAsync({
        name: newName.trim(),
        created_at: toIsoDateTime(newDate),
        description: newDescription.trim(),
      });
      setBaseline({ name: newName, date: newDate, description: newDescription });
    } catch {
      // updateGeneralMutation.isError already surfaces the failure in the UI.
    }
  }

  // Every field here is mandatory, so — unlike Material's Mechanical/Fatigue tabs —
  // autosave itself waits for full completeness, not just in-range values.
  const globalPropertiesValid = isFormValid(globalPropertySections, props);
  const globalPropertiesUnsaved = keyValueSignature(props) !== keyValueSignature(propsBaseline ?? {});

  // Autosave the Global properties tab once every mandatory field is filled — fires
  // when focus leaves a field (blur) or the panel itself (click-out).
  async function handleGlobalPropertiesBlur() {
    if (!globalPropertiesValid || !globalPropertiesUnsaved || updateSettingsMutation.isPending) return;
    try {
      await updateSettingsMutation.mutateAsync({ settings: toKeyValueList(props) });
      setPropsBaseline(props);
      await detailQuery.refetch();
    } catch {
      // updateSettingsMutation's onError (global mutation cache) already toasts.
    }
  }

  // Gates the other tabs, and drives the toolbar's Saved/Saving/Not saved indicator.
  // Both queries' data must have actually arrived first — otherwise `globalPropertySections`
  // is `[]` and `props`/`propsBaseline` are both still `{}`, which reads as trivially valid
  // and saved before there's any real data behind it.
  const globalPropertiesLoaded = hydrated && !sysconfigQuery.isLoading && !!sysconfigQuery.data;
  const globalPropertiesSaved = globalPropertiesLoaded && globalPropertiesValid && !globalPropertiesUnsaved;
  const globalPropertiesStatus: SaveStatus = updateSettingsMutation.isPending
    ? 'saving'
    : globalPropertiesSaved
      ? 'saved'
      : 'not-saved';

  async function handleSaveProfiles(profiles: Profile[]) {
    const result = await updateProfilesMutation.mutateAsync({ profiles: profiles.map(toApiProfile) });
    setHydratedProfiles(result.profiles.map(toUiProfile));
    await detailQuery.refetch();
  }

  // Autosaves the Profile distribution tab on every field blur and every bezier point
  // move — PUT the parameters first, then (only once that succeeds) POST to regenerate
  // the profiles from them. Both mutations already toast on failure via the global
  // mutation cache, so there's nothing more to surface here beyond `profilesUpdated`.
  const [profilesUpdated, setProfilesUpdated] = useState(false);

  async function handleProfileGeneratorCommit(params: ProfileGeneratorParameters) {
    setProfilesUpdated(false);
    try {
      await updateGeneratorMutation.mutateAsync({ geometryId, payload: { profile_generator_parameters: params } });
    } catch {
      return;
    }
    setSavedProfileParams(params);
    try {
      const generated = await runGeneratorMutation.mutateAsync({
        geometryId,
        payload: { profile_generator_parameters: params },
      });
      // Persist the generated profiles — same shape as the write payload (no id/file) —
      // so they show up on the Profiles tab and unlock Stacking.
      const saved = await updateProfilesMutation.mutateAsync({ profiles: generated.profiles });
      setHydratedProfiles(saved.profiles.map(toUiProfile));
      setProfilesUpdated(true);
      await detailQuery.refetch();
    } catch {
      // runGeneratorMutation's/updateProfilesMutation's onError (global mutation cache) already toasts.
    }
  }

  async function handleSaveEdges(edges: GeometryEdgeInput[]) {
    await updateEdgesMutation.mutateAsync({ edges });
    await detailQuery.refetch();
  }

  // GET /geometry/:id/result/ returns binary mesh data, not JSON — in
  // practice either an ASCII/binary STL or a zip-based 3MF package (both
  // unitless: vertices are fractions of nominal_radius). Fetched as an
  // ArrayBuffer and handed to OccViewer, which sniffs the actual format and
  // scales the result by the geometry's nominal_radius.
  // Only the response for the most recently *requested* signature is ever applied —
  // firing two generations in a row (e.g. two quick autosaves) must not let the first,
  // now-stale one overwrite the viewer if it resolves after the second.
  async function handleGenerateResult(signature: string) {
    latestResultRequestRef.current = signature;
    try {
      // CAD kernel generation can take a while — well past the default 10s timeout.
      const { data } = await apiClient.get<ArrayBuffer>(`/geometry/${geometryId}/result/`, {
        responseType: 'arraybuffer',
        timeout: 120_000,
      });
      if (latestResultRequestRef.current !== signature) return;
      setResultScale(Number(props.nominal_radius) || 1);
      setResultStl(data);
      // Only recorded on success — a failed generation leaves this stale, so the next
      // detailQuery refetch (tab switch, another autosave, …) retries automatically
      // instead of being permanently skipped for data that never actually generated.
      setLastResultSignature(signature);
    } catch (err) {
      if (latestResultRequestRef.current !== signature) return;
      // getApiErrorMessage decodes the arraybuffer error body back to
      // text/JSON, so the backend's own message is used when it has one —
      // the per-status fallback below only covers a body it can't parse.
      const status = isAxiosError(err) ? err.response?.status : undefined;
      const fallback =
        status === 409
          ? 'Geometry is invalid or incomplete (needs at least 2 profiles and a valid spline).'
          : status === 403
            ? 'You do not have permission to generate this result.'
            : status === 404
              ? 'Geometry not found.'
              : status === 500
                ? 'Result generation failed on the server.'
                : 'Failed to generate. Please try again.';
      toast.error(getApiErrorMessage(err, fallback));
    }
  }

  // There's no dedicated "3D view" tab — the result is fetched/regenerated in the
  // background as soon as GET /geometry/:id/ reports everything it needs: non-empty
  // settings, profile_generator_parameters, profiles and edges. Re-fetches only when
  // that combination actually changes, so a routine per-tab-switch refetch (see above)
  // with nothing new doesn't re-request the same result over and over.
  useEffect(() => {
    if (isNew) return;
    const g = detailQuery.data;
    const ready = !!g?.settings?.length && !!g?.profile_generator_parameters && !!g?.profiles?.length && !!g?.edges?.length;
    if (!ready) return;
    const signature = JSON.stringify([g.settings, g.profile_generator_parameters, g.profiles, g.edges]);
    if (signature === lastResultSignature) return;
    handleGenerateResult(signature);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, detailQuery.data]);

  function handleExit() {
    navigate(exitTarget);
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      {/* Body: full-bleed 3D scene with floating overlays (incl. sub-toolbar) */}
      <main className="relative flex-1 overflow-hidden">
        {/* Three.js canvas fills the whole body, including under the sub-toolbar */}
        <OccViewer
          stlData={resultStl}
          stlScale={resultScale}
          showBlade={resultShowBlade}
          wireframe={resultShowWireframe}
          treatAsBlade
          showResetButton
        />

        <GeometryEditToolbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isNew={isNew}
          globalPropertiesSaved={globalPropertiesSaved}
          profilesSaved={(hydratedProfiles?.length ?? 0) > 0}
          status={isNew ? undefined : globalPropertiesStatus}
          onExit={handleExit}
        />

        {/* Floating properties panel (top-left, gap below toolbar matches gap above tab pill = 8px).
            Width depends on the active tab. z-30 so it sits above the Blade/Wireframe toggles (z-20). */}
        <aside
          className={`absolute left-4 top-[52px] z-30 ${getPanelWidthClass(activeTab, profileFolded, stackingFolded)}`}
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
            <GeometryCreatePanel
              isNew={isNew}
              name={newName}
              onNameChange={setNewName}
              date={newDate}
              onDateChange={setNewDate}
              description={newDescription}
              onDescriptionChange={setNewDescription}
              hasError={createMutation.isError || updateGeneralMutation.isError}
              onBlur={handleCreatePanelBlur}
            />
          )}

          {activeTab === 'global-properties' && !isNew && (
            <GeometryGlobalPropertiesPanel
              sections={globalPropertySections}
              values={props}
              onFieldChange={updateField}
              onBlur={handleGlobalPropertiesBlur}
              loading={sysconfigQuery.isLoading}
              loadError={sysconfigQuery.isError}
            />
          )}
          {activeTab === 'profile-distribution' && (
            <ProfileDistributionPanel
              folded={profileFolded}
              onFoldToggle={() => setProfileFolded((f) => !f)}
              rootRadiusPercent={props.root_radius}
              initialParameters={savedProfileParams}
              onCommit={handleProfileGeneratorCommit}
              committing={updateGeneratorMutation.isPending || runGeneratorMutation.isPending}
              profilesUpdated={profilesUpdated}
            />
          )}
          {activeTab === 'profiles' && (
            <ProfilesPanel
              geometryId={geometryId}
              initialProfiles={hydratedProfiles ?? undefined}
              onCommit={handleSaveProfiles}
              committing={updateProfilesMutation.isPending}
              saveError={updateProfilesMutation.isError}
            />
          )}
          {activeTab === 'stacking' && (
            <StackingPanel
              folded={stackingFolded}
              onFoldToggle={() => setStackingFolded((f) => !f)}
              initialEdges={edgesQuery.data?.edges}
              rootRadiusPercent={props.root_radius}
              nominalRadius={Number(props.nominal_radius) || 1}
              onCommit={handleSaveEdges}
              committing={updateEdgesMutation.isPending}
              saveError={updateEdgesMutation.isError}
            />
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

        {/* Blade/Wireframe display toggles (top-center, gap below toolbar matches gap above tab pill = 8px) */}
        <div className="absolute left-1/2 top-[52px] z-20 flex -translate-x-1/2 items-center gap-4 rounded-md border border-[#e5e7eb] bg-white/95 px-3 py-1.5 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm">
          <label className="flex items-center gap-2 text-[13px] text-[#0a0a0a]">
            <Checkbox checked={resultShowBlade} onCheckedChange={setResultShowBlade} />
            Blade
          </label>
          <label className="flex items-center gap-2 text-[13px] text-[#0a0a0a]">
            <Checkbox checked={resultShowWireframe} onCheckedChange={setResultShowWireframe} />
            Wireframe
          </label>
        </div>

        {/* Coordinate gizmo (bottom-left) */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-20">
          <CoordinateGizmo />
        </div>
      </main>
    </div>
  );
}
