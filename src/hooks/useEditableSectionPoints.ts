import { useState } from 'react';
import type { ControlPoint } from '@/types';
import { applyXConstraints, clamp } from '@/lib/bezierMath';

type Field = 'x' | 'y';

/**
 * Shared state/logic for a "section key -> editable Bezier control points"
 * panel (ProfileDistributionPanel's camber/thickness sections, StackingPanel's
 * sweep/dihedral/twist/chord sections): per-section point list, an
 * "Add point" action, and a table-input editing buffer keyed by
 * "<section>-<idx>-<x|y>" so multiple accordion sections can be edited at once
 * without clobbering each other's in-progress (possibly invalid) text.
 */
export function useEditableSectionPoints<K extends string>(
  initial: Record<K, ControlPoint[]>,
  getYBounds: (key: K) => { min: number; max: number },
  yDecimals = 2
) {
  const [sectionPoints, setSectionPoints] = useState<Record<K, ControlPoint[]>>(initial);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  function setPointsForSection(key: K, next: ControlPoint[]) {
    setSectionPoints((current) => ({ ...current, [key]: next }));
  }

  function addPoint(key: K) {
    setSectionPoints((current) => {
      const pts = current[key];
      // A curve emptied out (via double-click delete) has too few points to
      // interpolate a new one between — reseed a fresh 2-point line instead.
      if (pts.length < 2) {
        const { min, max } = getYBounds(key);
        const midY = (min + max) / 2;
        return { ...current, [key]: [{ x: 0, y: midY }, { x: 1, y: midY }] };
      }
      // Insert a new point between the last two existing points
      const secondLast = pts[pts.length - 2];
      const last = pts[pts.length - 1];
      const newX = (secondLast.x + last.x) / 2;
      const newY = (secondLast.y + last.y) / 2;
      const next = [...pts.slice(0, pts.length - 1), { x: newX, y: newY }, last];
      return { ...current, [key]: next };
    });
  }

  function fieldKey(section: K, idx: number, field: Field) {
    return `${section}-${idx}-${field}`;
  }

  function getInputValue(section: K, idx: number, field: Field) {
    const key = fieldKey(section, idx, field);
    if (editingValues[key] !== undefined) return editingValues[key];
    const p = sectionPoints[section][idx];
    return field === 'x' ? p.x.toFixed(4) : p.y.toFixed(yDecimals);
  }

  function handleInputChange(section: K, idx: number, field: Field, raw: string) {
    const normalized = raw.replace(',', '.');
    setEditingValues((v) => ({ ...v, [fieldKey(section, idx, field)]: normalized }));
    const parsed = parseFloat(normalized);
    if (!Number.isFinite(parsed)) return;
    setSectionPoints((current) => {
      const list = current[section];
      const { min, max } = getYBounds(section);
      const nextList = list.map((p, i) => {
        if (i !== idx) return p;
        if (field === 'x') return { ...p, x: applyXConstraints(list, idx, parsed) };
        return { ...p, y: clamp(parsed, min, max) };
      });
      return { ...current, [section]: nextList };
    });
  }

  function handleInputBlur(section: K, idx: number, field: Field) {
    setEditingValues((v) => {
      const k = fieldKey(section, idx, field);
      if (v[k] === undefined) return v;
      const next = { ...v };
      delete next[k];
      return next;
    });
  }

  return {
    sectionPoints,
    setPointsForSection,
    addPoint,
    getInputValue,
    handleInputChange,
    handleInputBlur,
  };
}
