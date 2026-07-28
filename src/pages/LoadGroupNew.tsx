import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MainNav } from '@/components/common/layout/MainNav';
import { EditPageToolbar } from '@/components/common/layout/EditPageToolbar';
import { LoadGroupGeneralTab } from '@/components/load-group/LoadGroupGeneralTab';
import { LoadGroupLoadCasesTab } from '@/components/load-group/LoadGroupLoadCasesTab';
import { LoadGroupLimitsTab } from '@/components/load-group/LoadGroupLimitsTab';
import { LoadGroupFatigueProfilesTab } from '@/components/load-group/LoadGroupFatigueProfilesTab';
import { LoadCasePickerDialog } from '@/components/load-group/LoadCasePickerDialog';
import type { ControlPoint } from '@/types';
import { useCreateLoadGroup, useLoadGroupDetail, useUpdateLoadGroup } from '@/hooks/api/useLoadGroups';
import {
  EXISTING_FATIGUE_PROFILES,
  EXISTING_LOAD_CASES,
  INITIAL_LIMIT_POINTS,
  NEW_FATIGUE_PROFILES_PLACEHOLDER,
  PLACEHOLDER_LOAD_CASE,
  makeId,
  type FatigueCase,
  type FatigueProfile,
  type LimitsSubTab,
  type LoadCase,
  type LoadGroupTab,
} from '@/data/loadGroupForm';

const LOAD_GROUP_TABS = [
  { value: 'general', label: 'General' },
  { value: 'load-cases', label: 'Load cases' },
  { value: 'limits', label: 'Limits' },
  { value: 'fatigue-profiles', label: 'Fatigue profiles' },
];

export function LoadGroupNew() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = !id || id === 'new';
  const loadGroupId = isNew ? NaN : Number(id);
  const duplicateFromRaw = isNew ? searchParams.get('duplicateFrom') : null;
  const duplicateSourceId = duplicateFromRaw ? Number(duplicateFromRaw) : NaN;

  const detailQuery = useLoadGroupDetail(loadGroupId);
  const duplicateQuery = useLoadGroupDetail(duplicateSourceId);
  const createMutation = useCreateLoadGroup();
  const updateMutation = useUpdateLoadGroup(loadGroupId);

  const [activeTab, setActiveTab] = useState<LoadGroupTab>('general');

  // General — hydrated from the backend for edit/duplicate; a fresh POST/PUT
  // {name, description} is the only real endpoint this page wires up so far.
  // The other 3 tabs (load cases/limits/fatigue profiles) stay on local mock
  // state: their UI models carry many fields the typed backend payloads don't
  // define (e.g. load case altitude/disa/inflow*), so wiring them would mean
  // silently dropping data — left for a follow-up once that's resolved.
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [baseline, setBaseline] = useState<{ name: string; description: string } | null>(null);
  const [duplicateHydrated, setDuplicateHydrated] = useState(false);

  useEffect(() => {
    if (isNew || hydrated || detailQuery.isFetching || !detailQuery.data) return;
    const g = detailQuery.data;
    const hydratedDescription = g.description ?? '';
    setName(g.name);
    setDescription(hydratedDescription);
    setBaseline({ name: g.name, description: hydratedDescription });
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
    setName(`${g.name}_copy`);
    setDescription(g.description ?? '');
    setDuplicateHydrated(true);
  }, [isNew, duplicateHydrated, duplicateSourceId, duplicateQuery.isFetching, duplicateQuery.data]);

  // Load cases
  const [loadCases, setLoadCases] = useState<LoadCase[]>(() =>
    isNew ? [{ ...PLACEHOLDER_LOAD_CASE, id: makeId() }] : EXISTING_LOAD_CASES
  );

  // Limits
  const [limitsSubTab, setLimitsSubTab] = useState<LimitsSubTab>('thrust');
  const [limitPoints, setLimitPoints] =
    useState<Record<LimitsSubTab, ControlPoint[]>>(INITIAL_LIMIT_POINTS);

  // Fatigue profiles
  const [fatigueProfiles, setFatigueProfiles] = useState<FatigueProfile[]>(() =>
    isNew ? NEW_FATIGUE_PROFILES_PLACEHOLDER : EXISTING_FATIGUE_PROFILES
  );
  const [fatigueSearch, setFatigueSearch] = useState('');
  const [pickingLoadCase, setPickingLoadCase] = useState<{
    profileId: string;
    caseId: string;
  } | null>(null);

  const titleText = isNew ? name.trim() || 'New load group' : name.trim() || 'Loading…';

  const savePending = createMutation.isPending || updateMutation.isPending;
  const saveError = createMutation.isError || updateMutation.isError;

  // ── Exit / save ──────────────────────────────────────────────────────────
  async function handleSaveGeneral() {
    if (isNew) {
      await createMutation.mutateAsync({ name, description });
    } else if (!baseline || name !== baseline.name || description !== baseline.description) {
      await updateMutation.mutateAsync({ name, description });
    }
    navigate('/load-group');
  }

  function handleExit() {
    navigate('/load-group');
  }

  // ── Load cases helpers ───────────────────────────────────────────────────
  function updateLoadCase<K extends keyof LoadCase>(caseId: string, field: K, val: LoadCase[K]) {
    setLoadCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, [field]: val } : c)));
  }

  function addLoadCase() {
    const lc: LoadCase = {
      id: makeId(),
      name: '',
      pitchFlag: 'Range',
      pitchMin: 0,
      pitchMax: 25,
      rpmFlag: 'Range',
      rpmMin: 0,
      rpmMax: 15,
      altitude: 0,
      disa: 0,
      inflowVelocity: 10,
      inflowAngle: 0,
      targetType: 'power',
      targetValue: 0,
    };
    setLoadCases((prev) => [...prev, lc]);
  }

  function deleteLoadCase(caseId: string) {
    setLoadCases((prev) => prev.filter((c) => c.id !== caseId));
  }

  function duplicateLoadCase(caseId: string) {
    setLoadCases((prev) => {
      const idx = prev.findIndex((c) => c.id === caseId);
      if (idx === -1) return prev;
      const src = prev[idx];
      const clone: LoadCase = {
        ...src,
        id: makeId(),
        name: src.name ? `${src.name} copy` : 'copy',
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }

  // ── Limits helpers ───────────────────────────────────────────────────────
  function updateLimitPoint(sub: LimitsSubTab, idx: number, field: 'x' | 'y', val: number) {
    setLimitPoints((prev) => ({
      ...prev,
      [sub]: prev[sub].map((p, i) => (i === idx ? { ...p, [field]: val } : p)),
    }));
  }

  function handleLimitPointsChange(sub: LimitsSubTab, next: ControlPoint[]) {
    setLimitPoints((prev) => ({ ...prev, [sub]: next }));
  }

  function addLimitPoint(sub: LimitsSubTab) {
    setLimitPoints((prev) => {
      const pts = prev[sub];
      const secondLast = pts[pts.length - 2];
      const last = pts[pts.length - 1];
      const newX = (secondLast.x + last.x) / 2;
      const newY = (secondLast.y + last.y) / 2;
      const next = [...pts.slice(0, pts.length - 1), { x: newX, y: newY }, last];
      return { ...prev, [sub]: next };
    });
  }

  function deleteLimitPoint(sub: LimitsSubTab, idx: number) {
    setLimitPoints((prev) => ({
      ...prev,
      [sub]: prev[sub].filter((_, i) => i !== idx),
    }));
  }

  // ── Fatigue profile helpers ──────────────────────────────────────────────
  function toggleFatigueProfile(profileId: string) {
    setFatigueProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, open: !p.open } : p))
    );
  }

  function addFatigueProfile() {
    setFatigueProfiles((prev) => [
      ...prev,
      { id: makeId(), name: 'New fatigue profile', open: true, cases: [] },
    ]);
  }

  function deleteFatigueProfile(profileId: string) {
    setFatigueProfiles((prev) => prev.filter((p) => p.id !== profileId));
  }

  function duplicateFatigueProfile(profileId: string) {
    setFatigueProfiles((prev) => {
      const profile = prev.find((p) => p.id === profileId);
      if (!profile) return prev;
      const clone: FatigueProfile = {
        ...profile,
        id: makeId(),
        name: `${profile.name} (copy)`,
        cases: profile.cases.map((c) => ({ ...c, id: makeId() })),
      };
      return [...prev, clone];
    });
  }

  function updateFatigueProfileName(profileId: string, newName: string) {
    setFatigueProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, name: newName } : p))
    );
  }

  function addFatigueCase(profileId: string) {
    setFatigueProfiles((prev) =>
      prev.map((p) => {
        if (p.id !== profileId) return p;
        const fc: FatigueCase = {
          id: makeId(),
          name: '',
          loadCase: '',
          minScale: 0,
          maxScale: 100,
          time: null,
          cycles: null,
        };
        return { ...p, cases: [...p.cases, fc] };
      })
    );
  }

  function deleteFatigueCase(profileId: string, caseId: string) {
    setFatigueProfiles((prev) =>
      prev.map((p) =>
        p.id === profileId ? { ...p, cases: p.cases.filter((c) => c.id !== caseId) } : p
      )
    );
  }

  function updateFatigueCase<K extends keyof FatigueCase>(
    profileId: string,
    caseId: string,
    field: K,
    val: FatigueCase[K]
  ) {
    setFatigueProfiles((prev) =>
      prev.map((p) =>
        p.id !== profileId
          ? p
          : {
              ...p,
              cases: p.cases.map((c) => (c.id === caseId ? { ...c, [field]: val } : c)),
            }
      )
    );
  }

  // ── Tab trigger class ─────────────────────────────────────────────────────
  const triggerCls =
    'h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]';

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#f8fafc]">
      <MainNav />

      <EditPageToolbar
        tabs={LOAD_GROUP_TABS}
        activeTab={activeTab}
        onTabChange={(v) => setActiveTab(v as LoadGroupTab)}
        title={titleText}
        backLabel="Back to Load groups"
        onBack={handleExit}
        actions={
          activeTab === 'general' && (
            <button
              type="button"
              onClick={handleSaveGeneral}
              disabled={!name.trim() || savePending}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-[#006496] px-3 py-2 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savePending ? 'Saving…' : isNew ? 'Create load group' : 'Update load group'}
            </button>
          )
        }
      />
      {saveError && (
        <p className="px-4 text-[13px] text-[#dc2626]">
          Failed to {isNew ? 'create' : 'update'} load group. Please try again.
        </p>
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden px-4 pb-6 pt-4">
        <div>
          {activeTab === 'general' && (
            <LoadGroupGeneralTab
              isNew={isNew}
              name={name}
              onNameChange={setName}
              description={description}
              onDescriptionChange={setDescription}
            />
          )}

          {activeTab === 'load-cases' && (
            <LoadGroupLoadCasesTab
              loadCases={loadCases}
              onUpdateLoadCase={updateLoadCase}
              onAddLoadCase={addLoadCase}
              onDuplicateLoadCase={duplicateLoadCase}
              onDeleteLoadCase={deleteLoadCase}
            />
          )}

          {activeTab === 'limits' && (
            <LoadGroupLimitsTab
              limitsSubTab={limitsSubTab}
              onLimitsSubTabChange={setLimitsSubTab}
              limitPoints={limitPoints}
              onLimitPointsChange={handleLimitPointsChange}
              onUpdateLimitPoint={updateLimitPoint}
              onAddLimitPoint={addLimitPoint}
              onDeleteLimitPoint={deleteLimitPoint}
              tabTriggerClassName={triggerCls}
            />
          )}

          {activeTab === 'fatigue-profiles' && (
            <LoadGroupFatigueProfilesTab
              fatigueProfiles={fatigueProfiles}
              fatigueSearch={fatigueSearch}
              onFatigueSearchChange={setFatigueSearch}
              onAddFatigueProfile={addFatigueProfile}
              onToggleFatigueProfile={toggleFatigueProfile}
              onDuplicateFatigueProfile={duplicateFatigueProfile}
              onDeleteFatigueProfile={deleteFatigueProfile}
              onUpdateFatigueProfileName={updateFatigueProfileName}
              onAddFatigueCase={addFatigueCase}
              onDeleteFatigueCase={deleteFatigueCase}
              onUpdateFatigueCase={updateFatigueCase}
              onPickLoadCase={(profileId, caseId) => setPickingLoadCase({ profileId, caseId })}
            />
          )}
        </div>
      </main>

      <LoadCasePickerDialog
        open={pickingLoadCase !== null}
        loadCaseNames={loadCases.map((lc) => lc.name)}
        current={
          pickingLoadCase
            ? (fatigueProfiles
                .find((p) => p.id === pickingLoadCase.profileId)
                ?.cases.find((c) => c.id === pickingLoadCase.caseId)?.loadCase ?? '')
            : ''
        }
        onSelect={(name) => {
          if (pickingLoadCase) {
            updateFatigueCase(pickingLoadCase.profileId, pickingLoadCase.caseId, 'loadCase', name);
          }
        }}
        onClose={() => setPickingLoadCase(null)}
      />
    </div>
  );
}
