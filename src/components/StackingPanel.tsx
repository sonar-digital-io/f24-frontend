import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Redo2, Undo2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BezierEditor, type ControlPoint } from '@/components/BezierEditor';

/** Stacking tab — four bezier-edited curves stacked vertically:
 *  Sweep, Dihedral, Twist, Chord.
 *
 *  Each section uses per-section Y axis bounds. The "+ Add point" button at
 *  the bottom of each table matches the pattern from ProfileDistributionPanel.
 */

type SectionKey = 'sweep' | 'dihedral' | 'twist' | 'chord';

const SECTION_KEYS: SectionKey[] = ['sweep', 'dihedral', 'twist', 'chord'];

const SECTION_LABELS: Record<SectionKey, string> = {
  sweep: 'Sweep',
  dihedral: 'Dihedral',
  twist: 'Twist',
  chord: 'Chord',
};

const SECTION_TABLE_HEADING: Record<SectionKey, string> = {
  sweep: 'Sweep (m)',
  dihedral: 'Dihedral (m)',
  twist: 'Twist (°)',
  chord: 'Chord (m)',
};

/** Per-section Y axis bounds for the BezierEditor and table clamp. */
const SECTION_Y_MIN: Record<SectionKey, number> = {
  sweep: -0.3,
  dihedral: -0.3,
  twist: -5,
  chord: 0,
};

const SECTION_Y_MAX: Record<SectionKey, number> = {
  sweep: 0.3,
  dihedral: 0.3,
  twist: 20,
  chord: 6,
};

/** Grid step shown on the BezierEditor Y axis. */
const SECTION_Y_STEP: Record<SectionKey, number> = {
  sweep: 0.1,
  dihedral: 0.1,
  twist: 5,
  chord: 1,
};

/** Step for the table numeric inputs. */
const SECTION_TABLE_STEP: Record<SectionKey, string> = {
  sweep: '0.00001',
  dihedral: '0.00001',
  twist: '0.01',
  chord: '0.001',
};

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
  twist: [
    { x: 0, y: 14.0 },
    { x: 0.25, y: 10.5 },
    { x: 0.65, y: 3.2 },
    { x: 1, y: 0.0 },
  ],
  chord: [
    { x: 0, y: 1.8 },
    { x: 0.28, y: 4.6 },
    { x: 0.65, y: 2.8 },
    { x: 1, y: 0.9 },
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
  twist: [
    { x: 0, y: 13.0 },
    { x: 0.3, y: 9.0 },
    { x: 0.7, y: 2.5 },
    { x: 1, y: 0.0 },
  ],
  chord: [
    { x: 0, y: 1.6 },
    { x: 0.3, y: 4.2 },
    { x: 0.7, y: 2.5 },
    { x: 1, y: 0.8 },
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
    twist: true,
    chord: true,
  });

  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  function setPointsForSection(key: SectionKey, next: ControlPoint[]) {
    setSectionPoints((current) => ({ ...current, [key]: next }));
  }

  function addPoint(key: SectionKey) {
    setSectionPoints((current) => {
      const pts = current[key];
      const secondLast = pts[pts.length - 2];
      const last = pts[pts.length - 1];
      const newX = (secondLast.x + last.x) / 2;
      const newY = (secondLast.y + last.y) / 2;
      const next = [...pts.slice(0, pts.length - 1), { x: newX, y: newY }, last];
      return { ...current, [key]: next };
    });
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
        return { ...p, y: clamp(parsed, SECTION_Y_MIN[section], SECTION_Y_MAX[section]) };
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
                {/* Accordion header */}
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
                    {/* Bezier editor */}
                    <BezierEditor
                      points={points}
                      onChange={(next) => setPointsForSection(key, next)}
                      previousPoints={PREVIOUS_SECTION_POINTS[key]}
                      yMin={SECTION_Y_MIN[key]}
                      yMax={SECTION_Y_MAX[key]}
                      yStep={SECTION_Y_STEP[key]}
                      rootX={0.05}
                    />

                    {/* Table with + Add point button */}
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
                                    step={SECTION_TABLE_STEP[key]}
                                    min={SECTION_Y_MIN[key]}
                                    max={SECTION_Y_MAX[key]}
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
                      {/* Add point button — same design as ProfileDistributionPanel */}
                      <button
                        type="button"
                        onClick={() => addPoint(key)}
                        className="flex w-full items-center justify-center gap-1.5 border-t border-[#e5e7eb] py-2 text-[13px] font-medium text-[#006496] hover:bg-[#f0f9ff]"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Add point
                      </button>
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
