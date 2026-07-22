import { useState } from 'react';
import { ChevronDown, ChevronUp, FoldHorizontal, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BezierEditor } from '@/components/common/viewer/BezierEditor';
import type { ControlPoint } from '@/types';
import { applyXConstraints, clamp } from '@/lib/bezierMath';

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

const SECTION_Y_STEP: Record<SectionKey, number> = {
  sweep: 0.1,
  dihedral: 0.1,
  twist: 5,
  chord: 1,
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

interface StackingPanelProps {
  folded: boolean;
  onFoldToggle: () => void;
}

export function StackingPanel({ folded, onFoldToggle }: StackingPanelProps) {
  const [subTab, setSubTab] = useState<SectionKey>('sweep');
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
    const normalized = raw.replace(',', '.');
    setEditingValues((v) => ({ ...v, [fieldKey(section, idx, field)]: normalized }));
    const parsed = parseFloat(normalized);
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

  function renderSectionBody(key: SectionKey) {
    const points = sectionPoints[key];
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,384px)]">
        {/* Chart */}
        <BezierEditor
          points={points}
          onChange={(next) => setPointsForSection(key, next)}
          yMin={SECTION_Y_MIN[key]}
          yMax={SECTION_Y_MAX[key]}
          yStep={SECTION_Y_STEP[key]}
          rootX={0.05}
        />
        {/* Table */}
        <div className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Index</th>
                <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Relative radius</th>
                <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                  {SECTION_TABLE_HEADING[key]}
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((_p, idx) => {
                const xLocked = idx === 0 || idx === points.length - 1;
                return (
                  <tr key={idx} className="border-b border-[#e5e7eb] last:border-b-0">
                    <td className="px-3 py-2 text-[#0a0a0a]">{idx}</td>
                    <td className="px-2 py-2">
                      <Label htmlFor={`${key}-${idx}-x`} className="sr-only">
                        Relative radius
                      </Label>
                      <Input
                        id={`${key}-${idx}-x`}
                        type="text"
                        inputMode="decimal"
                        value={getInputValue(key, idx, 'x')}
                        disabled={xLocked}
                        onChange={(e) => handleInputChange(key, idx, 'x', e.target.value)}
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
                        type="text"
                        inputMode="decimal"
                        value={getInputValue(key, idx, 'y')}
                        onChange={(e) => handleInputChange(key, idx, 'y', e.target.value)}
                        onBlur={() => handleInputBlur(key, idx, 'y')}
                        className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
    );
  }

  return (
    <div
      className={`flex w-full ${folded ? 'max-w-[516px]' : 'max-w-[924px]'} max-h-[calc(100vh-128px)] flex-col rounded-[14px] border border-[#e5e7eb] bg-white/95 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-[max-width] duration-150`}
    >
      {/* Header: sub-tabs (expanded mode) + toggle button */}
      <div className="flex items-center justify-between gap-4 p-6 pb-4">
        {!folded ? (
          <Tabs value={subTab} onValueChange={(v) => setSubTab(v as SectionKey)}>
            <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
              {SECTION_KEYS.map((key) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                >
                  {SECTION_LABELS[key]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={onFoldToggle}
          aria-pressed={folded}
          aria-label={folded ? 'Show sections one at a time (expand)' : 'Show all sections as accordion (fold)'}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#006496] text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580]"
        >
          <FoldHorizontal className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        {folded ? (
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
                      <BezierEditor
                        points={points}
                        onChange={(next) => setPointsForSection(key, next)}
                        yMin={SECTION_Y_MIN[key]}
                        yMax={SECTION_Y_MAX[key]}
                        yStep={SECTION_Y_STEP[key]}
                        rootX={0.05}
                      />
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
                                <tr key={idx} className="border-b border-[#e5e7eb] last:border-b-0">
                                  <td className="px-3 py-2 text-[#0a0a0a]">{idx}</td>
                                  <td className="px-2 py-2">
                                    <Label htmlFor={`f-${key}-${idx}-x`} className="sr-only">
                                      Relative radius
                                    </Label>
                                    <Input
                                      id={`f-${key}-${idx}-x`}
                                      type="text"
                                      inputMode="decimal"
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
                                    <Label htmlFor={`f-${key}-${idx}-y`} className="sr-only">
                                      {SECTION_TABLE_HEADING[key]}
                                    </Label>
                                    <Input
                                      id={`f-${key}-${idx}-y`}
                                      type="text"
                                      inputMode="decimal"
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
        ) : (
          renderSectionBody(subTab)
        )}
      </div>
    </div>
  );
}
