import { useEffect, useRef, useState } from 'react';
import { useUpdateLoadGroupLimits } from '@/hooks/api/useLoadGroups';
import { INITIAL_LOAD_LIMITS, type LimitsSubTab } from '@/data/loadGroupForm';
import type { SaveStatus } from '@/components/common/layout/EditPageToolbarActions';
import type { LoadLimitRange } from '@/api/types/loadGroups';

/**
 * Limits tab state — hydrated from the load group's GET (in LoadGroupNew),
 * autosaved via PUT /load/:id/limits/ shortly after a bound/curve edit
 * settles (bezier drag release, point/bounds input blur). Each of the three
 * sub-tabs needs at least 2 curve points to save — always true in practice
 * since the UI blocks deleting either endpoint, kept as a defensive gate.
 */
export function useLoadGroupLimitsState(loadGroupId: number, isNew: boolean) {
  const updateLimitsMutation = useUpdateLoadGroupLimits(loadGroupId);
  const [limitsSubTab, setLimitsSubTab] = useState<LimitsSubTab>('thrust');
  const [limits, setLimits] = useState<Record<LimitsSubTab, LoadLimitRange>>(INITIAL_LOAD_LIMITS);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<SaveStatus | undefined>(undefined);

  function markDirty() {
    setDirty(true);
    setStatus(undefined);
  }

  function markSaved() {
    setStatus('saved');
  }

  function updateLimitBounds(sub: LimitsSubTab, field: 'x_min' | 'x_max' | 'y_min' | 'y_max', val: number) {
    setLimits((prev) => ({ ...prev, [sub]: { ...prev[sub], [field]: val } }));
    markDirty();
  }

  function updateLimitCurvePoint(sub: LimitsSubTab, idx: number, field: 'rpm' | 'value', val: number) {
    setLimits((prev) => ({
      ...prev,
      [sub]: { ...prev[sub], curve: prev[sub].curve.map((c, i) => (i === idx ? { ...c, [field]: val } : c)) },
    }));
    markDirty();
  }

  function handleLimitCurveChange(sub: LimitsSubTab, curve: LoadLimitRange['curve']) {
    setLimits((prev) => ({ ...prev, [sub]: { ...prev[sub], curve } }));
    markDirty();
  }

  function addLimitCurvePoint(sub: LimitsSubTab) {
    setLimits((prev) => {
      const curve = prev[sub].curve;
      const secondLast = curve[curve.length - 2];
      const last = curve[curve.length - 1];
      const newRpm = (secondLast.rpm + last.rpm) / 2;
      const newValue = (secondLast.value + last.value) / 2;
      const nextCurve = [...curve.slice(0, curve.length - 1), { rpm: newRpm, value: newValue }, last];
      return { ...prev, [sub]: { ...prev[sub], curve: nextCurve } };
    });
    markDirty();
  }

  function deleteLimitCurvePoint(sub: LimitsSubTab, idx: number) {
    setLimits((prev) => ({
      ...prev,
      [sub]: { ...prev[sub], curve: prev[sub].curve.filter((_, i) => i !== idx) },
    }));
    markDirty();
  }

  const hasEnoughPoints = (['thrust', 'torque', 'power'] as const).every((sub) => limits[sub].curve.length >= 2);

  // Mirrors the latest `limits`/`dirty` so a save that lands while another is
  // still in flight retries with fresh data afterwards, instead of firing a
  // second concurrent PUT (whichever response arrives last then wins,
  // possibly overwriting a newer edit with a stale one).
  const limitsRef = useRef(limits);
  limitsRef.current = limits;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const retrySaveRef = useRef(false);

  async function commitLimits() {
    if (updateLimitsMutation.isPending) {
      retrySaveRef.current = true;
      return;
    }
    if (isNew || !dirtyRef.current || !hasEnoughPoints) return;
    setStatus('saving');
    try {
      const { thrust, torque, power } = limitsRef.current;
      await updateLimitsMutation.mutateAsync({
        rpm_thrust_limit: thrust,
        rpm_torque_limit: torque,
        rpm_power_limit: power,
      });
      setDirty(false);
      setStatus('saved');
    } catch {
      setStatus(undefined);
    } finally {
      if (retrySaveRef.current) {
        retrySaveRef.current = false;
        commitLimits();
      }
    }
  }

  useEffect(() => {
    if (isNew || !dirty || !hasEnoughPoints) return;
    const timer = setTimeout(commitLimits, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limits, dirty, isNew, hasEnoughPoints]);

  return {
    limits,
    setLimits,
    limitsSubTab,
    setLimitsSubTab,
    updateLimitBounds,
    updateLimitCurvePoint,
    handleLimitCurveChange,
    addLimitCurvePoint,
    deleteLimitCurvePoint,
    markSaved,
    status,
  };
}
