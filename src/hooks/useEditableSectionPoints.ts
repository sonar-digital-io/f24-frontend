import { useState } from 'react';
import type { ControlPoint } from '@/types';
import { applyXConstraints, clamp } from '@/lib/bezierMath';

type Field = 'x' | 'y';

/**
 * Shared state/logic for a "section key -> editable curve points" panel
 * (ProfileDistributionPanel's camber/thickness sections, StackingPanel's
 * sweep/dihedral/twist/chord sections): per-section point list, an
 * "Add point" action, and a table-input editing buffer keyed by
 * "<section>-<idx>-<x|y>" so multiple accordion sections can be edited at once
 * without clobbering each other's in-progress (possibly invalid) text.
 *
 * Curve-shape-agnostic — the same flat `ControlPoint[]` backs both the
 * cubic-spline and real-Bézier editors, which differ only in how they draw
 * the curve through/around these points, not in the points' shape.
 */
export function useEditableSectionPoints<K extends string>(
  initial: Record<K, ControlPoint[]>,
  getYBounds: (key: K) => { min: number; max: number },
  yDecimals = 2,
  /** Point 0's relative radius can't be typed past this (e.g. the start position). */
  getRootX?: (key: K) => number | undefined,
  /** Fires when a point is added (footer button) or a table x/y edit is committed
   *  (blur) — not on every keystroke while typing. */
  onCommit?: () => void
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
    onCommit?.();
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
        if (field === 'x') return { ...p, x: applyXConstraints(list, idx, parsed, 0, 1, getRootX?.(section)) };
        return { ...p, y: clamp(parsed, min, max) };
      });
      return { ...current, [section]: nextList };
    });
  }

  function handleInputBlur(section: K, idx: number, field: Field) {
    const k = fieldKey(section, idx, field);
    if (editingValues[k] === undefined) return;
    setEditingValues((v) => {
      const next = { ...v };
      delete next[k];
      return next;
    });
    onCommit?.();
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
