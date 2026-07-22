import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Redo2, Undo2 } from 'lucide-react';
import { MainNav } from '@/components/common/MainNav';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadGroupGeneralTab } from '@/components/load-group/LoadGroupGeneralTab';
import { LoadGroupLoadCasesTab } from '@/components/load-group/LoadGroupLoadCasesTab';
import { LoadGroupLimitsTab } from '@/components/load-group/LoadGroupLimitsTab';
import { LoadGroupFatigueProfilesTab } from '@/components/load-group/LoadGroupFatigueProfilesTab';
import { LoadCasePickerDialog } from '@/components/load-group/LoadCasePickerDialog';
import type { ControlPoint } from '@/types';
import { LOAD_GROUPS, createLoadGroup, updateLoadGroup } from '@/data/loadGroups';
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

export function LoadGroupNew() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const existing = isNew ? undefined : LOAD_GROUPS.find((g) => g.id === id);

  const [activeTab, setActiveTab] = useState<LoadGroupTab>('general');

  // General
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');

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

  const titleText = isNew
    ? name.trim() || 'New load group'
    : name.trim() || existing?.name || id;

  // ── Exit / save ──────────────────────────────────────────────────────────
  function handleExit() {
    if (isNew) {
      if (name.trim()) createLoadGroup({ name, description });
    } else if (existing) {
      updateLoadGroup(existing.id, { name, description });
    }
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

      {/* Sub-toolbar */}
      <div className="relative flex h-[52px] w-full shrink-0 items-center justify-between bg-[#f8fafc] px-4 py-2">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as LoadGroupTab)}
          className="h-9 shrink-0"
        >
          <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
            <TabsTrigger value="general" className={triggerCls}>
              General
            </TabsTrigger>
            <TabsTrigger value="load-cases" className={triggerCls}>
              Load cases
            </TabsTrigger>
            <TabsTrigger value="limits" className={triggerCls}>
              Limits
            </TabsTrigger>
            <TabsTrigger value="fatigue-profiles" className={triggerCls}>
              Fatigue profiles
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
            Back to Load groups
          </button>
        </div>
      </div>

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
