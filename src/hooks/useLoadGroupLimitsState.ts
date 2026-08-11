import { useState } from 'react';
import { useUpdateLoadGroupLimits } from '@/hooks/api/useLoadGroups';
import { INITIAL_LOAD_LIMITS, type LimitsSubTab } from '@/data/loadGroupForm';
import type { LoadLimitRange } from '@/api/types/loadGroups';

/**
 * Limits tab state — no GET for this yet, so it's local-only until saved via
 * the dedicated PUT /load/:id/limits/. Extracted from LoadGroupNew.
 */
export function useLoadGroupLimitsState(loadGroupId: number) {
  const updateLimitsMutation = useUpdateLoadGroupLimits(loadGroupId);
  const [limitsSubTab, setLimitsSubTab] = useState<LimitsSubTab>('thrust');
  const [limits, setLimits] = useState<Record<LimitsSubTab, LoadLimitRange>>(INITIAL_LOAD_LIMITS);

  function updateLimitBounds(sub: LimitsSubTab, field: 'x_min' | 'x_max' | 'y_min' | 'y_max', val: number) {
    setLimits((prev) => ({ ...prev, [sub]: { ...prev[sub], [field]: val } }));
  }

  function updateLimitCurvePoint(sub: LimitsSubTab, idx: number, field: 'rpm' | 'value', val: number) {
    setLimits((prev) => ({
      ...prev,
      [sub]: { ...prev[sub], curve: prev[sub].curve.map((c, i) => (i === idx ? { ...c, [field]: val } : c)) },
    }));
  }

  function handleLimitCurveChange(sub: LimitsSubTab, curve: LoadLimitRange['curve']) {
    setLimits((prev) => ({ ...prev, [sub]: { ...prev[sub], curve } }));
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
  }

  function deleteLimitCurvePoint(sub: LimitsSubTab, idx: number) {
    setLimits((prev) => ({
      ...prev,
      [sub]: { ...prev[sub], curve: prev[sub].curve.filter((_, i) => i !== idx) },
    }));
  }

  async function handleSaveLimits() {
    await updateLimitsMutation.mutateAsync({
      rpm_thrust_limit: limits.thrust,
      rpm_torque_limit: limits.torque,
      rpm_power_limit: limits.power,
    });
  }

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
    handleSaveLimits,
    updateLimitsMutation,
  };
}
