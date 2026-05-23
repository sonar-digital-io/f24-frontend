import { useState } from 'react';
import { ChevronDown, ChevronUp, Redo2, Undo2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BezierEditor, type ControlPoint } from '@/components/BezierEditor';

/** Stacking tab — two bezier-edited curves stacked vertically: Sweep + Dihedral.
 *
 *  Unlike Profile distribution this panel has no Type/Start/End/Profile-count
 *  top row — just Undo/Redo plus the two sections. Each section's curve can
 *  go negative (e.g. the tip can sweep back past the root line), so the
 *  bezier editor uses yMin=-0.3, yMax=0.3.
 */

type SectionKey = 'sweep' | 'dihedral';

const SECTION_KEYS: SectionKey[] = ['sweep', 'dihedral'];

const SECTION_LABELS: Record<SectionKey, string> = {
  sweep: 'Sweep',
  dihedral: 'Dihedral',
};

const SECTION_TABLE_HEADING: Record<SectionKey, string> = {
  sweep: 'Sweep (m)',
  dihedral: 'Dihedral (m)',
};

const Y_MIN = -0.3;
const Y_MAX = 0.3;
const Y_STEP = 0.1;

const INITIAL_SECTION_POINTS: Record<SectionKey, ControlPoint[]> = {
  sweep: [
    { x: 0, y: 0 },
    { x: 0.2, y: 0.1 },
    { x: 0.6278, y: 0.24688 },
    { x: 1, y: -0.13466 },
  ],
  dihedral: [
    { x: 0, y: 0 },
    { x: 0.3, y: 0.05 },
    { x: 0.7, y: 0.18 },
    { x: 1, y: 0.05 },
  ],
};

const PREVIOUS_SECTION_POINTS: Record<SectionKey, ControlPoint[]> = {
  sweep: [
    { x: 0, y: 0 },
    { x: 0.25, y: 0.08 },
    { x: 0.6, y: 0.18 },
    { x: 1, y: -0.08 },
  ],
  dihedral: [
    { x: 0, y: 0 },
    { x: 0.35, y: 0.04 },
    { x: 0.7, y: 0.14 },
    { x: 1, y: 0.04 },
  ],
};

function applyXConstraints(points: ControlPoint[], idx: number, nextX: number): number {
  if (idx === 0) return 0;
  if (idx === points.length - 1) return 1;
  const minX = points[idx - 1].x + 0.001;
  const maxX = points[idx + 1].x - 0.001;
  return Math.max(minX, Math.min(maxX, nextX));
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function StackingPanel() {
  const [sectionPoints, setSectionPoints] =
    useState<Record<SectionKey, ControlPoint[]>>(INITIAL_SECTION_POINTS);

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    sweep: true,
    dihedral: true,
  });

  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  function setPointsForSection(key: SectionKey, next: ControlPoint[]) {
    setSectionPoints((current) => ({ ...current, [key]: next }));
  }

  function toggleSection(key: SectionKey) {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));
  }

  function fieldKey(section: SectionKey, idx: number, field: 'x' | 'y') {
    return `${section}-${idx}-${field}`;
  }

  function getInputValue(section: SectionKey, idx: number, field: 'x' | 'y') {
    const key = fieldKey(section, idx, field);
    if (editingValues[key] !== undefined) return editingValues[key];
    const p = sectionPoints[section][idx];
    return field === 'x' ? p.x.toFixed(4) : p.y.toFixed(5);
  }

  function handleInputChange(section: SectionKey, idx: number, field: 'x' | 'y', raw: string) {
    setEditingValues((v) => ({ ...v, [fieldKey(section, idx, field)]: raw }));
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) return;
    setSectionPoints((current) => {
      const list = current[section];
      const nextList = list.map((p, i) => {
        if (i !== idx) return p;
        if (field === 'x') return { ...p, x: applyXConstraints(list, idx, parsed) };
        return { ...p, y: clamp(parsed, Y_MIN, Y_MAX) };
      });
      return { ...current, [section]: nextList };
    });
  }

  function handleInputBlur(section: SectionKey, idx: number, field: 'x' | 'y') {
    setEditingValues((v) => {
      const k = fieldKey(section, idx, field);
      if (v[k] === undefined) return v;
      const next = { ...v };
      delete next[k];
      return next;
    });
  }

  return (
    <div className="flex w-full max-w-[516px] max-h-[calc(100vh-128px)] flex-col rounded-[14px] border border-[#e5e7eb] bg-white/95 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
      {/* Sticky top region: Undo / Redo */}
      <div className="flex items-center gap-1 p-6 pb-4">
        <button
          type="button"
          aria-label="Undo"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
        >
          <Undo2 className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Redo"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9]"
        >
          <Redo2 className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Scrollable sections */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <div className="flex flex-col gap-3">
          {SECTION_KEYS.map((key) => {
            const open = openSections[key];
            const points = sectionPoints[key];
            return (
              <div
                key={key}
                className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[#f9fafb]"
                >
                  <span className="text-[16px] font-semibold leading-6 text-[#0a0a0a]">
                    {SECTION_LABELS[key]}
                  </span>
                  {open ? (
                    <ChevronUp className="h-4 w-4 text-[#6b7280]" strokeWidth={2} />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#6b7280]" strokeWidth={2} />
                  )}
                </button>

                {open && (
                  <div className="flex flex-col gap-4 border-t border-[#e5e7eb] p-4">
                    {/* Distribution view (always shown when section open) */}
                    <BezierEditor
                      points={points}
                      onChange={(next) => setPointsForSection(key, next)}
                      previousPoints={PREVIOUS_SECTION_POINTS[key]}
                      yMin={Y_MIN}
                      yMax={Y_MAX}
                      yStep={Y_STEP}
                      rootX={0.05}
                    />

                    {/* Table */}
                    <div className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
                      <table className="w-full border-collapse text-[14px]">
                        <thead>
                          <tr className="border-b border-[#e5e7eb]">
                            <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                              Index
                            </th>
                            <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                              Relative radius
                            </th>
                            <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                              {SECTION_TABLE_HEADING[key]}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {points.map((_p, idx) => {
                            const xLocked = idx === 0 || idx === points.length - 1;
                            return (
                              <tr
                                key={idx}
                                className="border-b border-[#e5e7eb] last:border-b-0"
                              >
                                <td className="px-3 py-2 text-[#0a0a0a]">{idx}</td>
                                <td className="px-2 py-2">
                                  <Label htmlFor={`${key}-${idx}-x`} className="sr-only">
                                    Relative radius
                                  </Label>
                                  <Input
                                    id={`${key}-${idx}-x`}
                                    type="number"
                                    step="0.0001"
                                    min={0}
                                    max={1}
                                    value={getInputValue(key, idx, 'x')}
                                    disabled={xLocked}
                                    onChange={(e) =>
                                      handleInputChange(key, idx, 'x', e.target.value)
                                    }
                                    onBlur={() => handleInputBlur(key, idx, 'x')}
                                    className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:bg-[#f8fafc] disabled:text-[#6b7280]"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <Label htmlFor={`${key}-${idx}-y`} className="sr-only">
                                    {SECTION_TABLE_HEADING[key]}
                                  </Label>
                                  <Input
                                    id={`${key}-${idx}-y`}
                                    type="number"
                                    step="0.00001"
                                    min={Y_MIN}
                                    max={Y_MAX}
                                    value={getInputValue(key, idx, 'y')}
                                    onChange={(e) =>
                                      handleInputChange(key, idx, 'y', e.target.value)
                                    }
                                    onBlur={() => handleInputBlur(key, idx, 'y')}
                                    className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
