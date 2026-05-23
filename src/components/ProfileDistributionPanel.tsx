import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  FoldHorizontal,
  Redo2,
  Undo2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BezierEditor, type ControlPoint } from '@/components/BezierEditor';

const PROFILE_TYPES = ['NACA 4 digit', 'NACA 5 digit', 'Custom airfoil'];

type SectionKey = 'maximum-camber' | 'maximum-camber-position' | 'thickness';

const SECTION_KEYS: SectionKey[] = [
  'maximum-camber',
  'maximum-camber-position',
  'thickness',
];

const SECTION_LABELS: Record<SectionKey, string> = {
  'maximum-camber': 'Maximum camber',
  'maximum-camber-position': 'Maximum camber position',
  thickness: 'Thickness (TMC)',
};

// Initial control points for each curve.
// (x in 0..1 = relative radius, y in 0..yMax = camber/position/thickness %)
const INITIAL_SECTION_POINTS: Record<SectionKey, ControlPoint[]> = {
  'maximum-camber': [
    { x: 0, y: 0 },
    { x: 0.4186, y: 23.7654 },
    { x: 0.91, y: 22.13445 },
    { x: 1, y: 5.7 },
  ],
  'maximum-camber-position': [
    { x: 0, y: 0 },
    { x: 0.35, y: 12 },
    { x: 0.7, y: 18 },
    { x: 1, y: 8 },
  ],
  thickness: [
    { x: 0, y: 5 },
    { x: 0.3, y: 22 },
    { x: 0.7, y: 18 },
    { x: 1, y: 3 },
  ],
};

const PREVIOUS_SECTION_POINTS: Record<SectionKey, ControlPoint[]> = {
  'maximum-camber': [
    { x: 0, y: 0 },
    { x: 0.35, y: 22 },
    { x: 0.8, y: 19 },
    { x: 1, y: 6 },
  ],
  'maximum-camber-position': [
    { x: 0, y: 0 },
    { x: 0.3, y: 10 },
    { x: 0.65, y: 15 },
    { x: 1, y: 7 },
  ],
  thickness: [
    { x: 0, y: 4 },
    { x: 0.25, y: 20 },
    { x: 0.65, y: 16 },
    { x: 1, y: 2 },
  ],
};

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  className?: string;
}

function Select({ value, onChange, options, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center justify-between rounded-md border border-[#e2e8f0] bg-white px-3 py-1 text-left text-[14px] font-normal text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#006496] focus:ring-offset-1"
      >
        <span>{value}</span>
        <ChevronDown
          className={`h-4 w-4 text-[#6b7280] transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-64 min-w-full overflow-y-auto whitespace-nowrap rounded-md border border-[#e5e7eb] bg-white py-1 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]"
        >
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <li key={opt} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[14px] leading-5 ${
                    selected ? 'bg-[#eef9ff] text-[#171717]' : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                  }`}
                >
                  <span>{opt}</span>
                  {selected && <Check className="h-4 w-4" strokeWidth={2} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] font-medium text-[#0a0a0a]">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[#006496]' : 'bg-[#cbd5e1]'
        }`}
      >
        <span
          className={`absolute left-[2px] top-[2px] h-4 w-4 rounded-full bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.15)] transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}

/** Y axis upper bound for the camber chart. */
const Y_MAX = 24;

/** Apply the same x-constraints used in BezierEditor when the user edits a
 *  value via the table input (so both editing paths behave the same). */
function applyXConstraints(points: ControlPoint[], idx: number, nextX: number): number {
  if (idx === 0) return 0;
  if (idx === points.length - 1) return 1;
  const minX = points[idx - 1].x + 0.001;
  const maxX = points[idx + 1].x - 0.001;
  return Math.max(minX, Math.min(maxX, nextX));
}

interface ProfileDistributionPanelProps {
  /** Whether the panel is folded (all 3 sections stacked vertically, no sub-tabs).
   *  Lifted to the parent so the surrounding `<aside>` can shrink in width. */
  folded: boolean;
  onFoldToggle: () => void;
}

export function ProfileDistributionPanel({
  folded,
  onFoldToggle,
}: ProfileDistributionPanelProps) {
  const [type, setType] = useState('NACA 4 digit');
  const [startPos, setStartPos] = useState('0.05');
  const [endPos, setEndPos] = useState('1');
  const [profileCount, setProfileCount] = useState('6');
  const [subTab, setSubTab] = useState<SectionKey>('maximum-camber');
  const [showDistribution, setShowDistribution] = useState(true);
  const [showTable, setShowTable] = useState(true);

  // One set of bezier points per section.
  const [sectionPoints, setSectionPoints] =
    useState<Record<SectionKey, ControlPoint[]>>(INITIAL_SECTION_POINTS);

  // Which folded-mode accordion items are open. By default only the first.
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    'maximum-camber': true,
    'maximum-camber-position': false,
    thickness: false,
  });

  function toggleSection(key: SectionKey) {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));
  }

  function setPointsForSection(key: SectionKey, next: ControlPoint[]) {
    setSectionPoints((current) => ({ ...current, [key]: next }));
  }

  // Local editing buffer for the table inputs. Keyed by "<sectionKey>-<rowIdx>-<x|y>"
  // so multiple folded sections can be edited without interfering with each other.
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  function fieldKey(section: SectionKey, idx: number, field: 'x' | 'y') {
    return `${section}-${idx}-${field}`;
  }

  function getInputValue(section: SectionKey, idx: number, field: 'x' | 'y') {
    const key = fieldKey(section, idx, field);
    if (editingValues[key] !== undefined) return editingValues[key];
    const p = sectionPoints[section][idx];
    return field === 'x' ? p.x.toFixed(4) : p.y.toFixed(2);
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
        return { ...p, y: Math.max(0, Math.min(Y_MAX, parsed)) };
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


  // A single section's chart + table BODY (no heading). Heading is rendered
  // by the accordion item in folded mode, and is hidden in expanded mode
  // because sub-tabs already name the section.
  function renderSectionBody(key: SectionKey) {
    const points = sectionPoints[key];
    const valueLabel =
      key === 'maximum-camber'
        ? 'Max Cam (%)'
        : key === 'maximum-camber-position'
          ? 'Max Cam pos (%)'
          : 'Thickness (%)';
    return (
      <div className="flex flex-col gap-4">
        <div
          className={
            folded
              ? 'flex flex-col gap-4'
              : 'grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,384px)]'
          }
        >
          {/* Distribution view */}
          <div className="flex flex-col gap-3">
            <Switch
              checked={showDistribution}
              onChange={setShowDistribution}
              label="Distribution view"
            />
            {showDistribution && (
              <BezierEditor
                points={points}
                onChange={(next) => setPointsForSection(key, next)}
                previousPoints={PREVIOUS_SECTION_POINTS[key]}
                yMax={Y_MAX}
                rootX={parseFloat(startPos) || 0.05}
              />
            )}
          </div>

          {/* Table */}
          <div className="flex flex-col gap-3">
            <Switch checked={showTable} onChange={setShowTable} label="Table" />
            {showTable && (
              <div className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
                <table className="w-full border-collapse text-[14px]">
                  <thead>
                    <tr className="border-b border-[#e5e7eb]">
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Index</th>
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                        Relative radius
                      </th>
                      <th className="h-10 px-3 text-left font-medium text-[#6b7280]">
                        {valueLabel}
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
                            <Input
                              type="number"
                              step="0.0001"
                              min={0}
                              max={1}
                              value={getInputValue(key, idx, 'x')}
                              disabled={xLocked}
                              onChange={(e) => handleInputChange(key, idx, 'x', e.target.value)}
                              onBlur={() => handleInputBlur(key, idx, 'x')}
                              className="h-8 rounded-md border-[#e2e8f0] px-2 text-[13px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] disabled:bg-[#f8fafc] disabled:text-[#6b7280]"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              max={Y_MAX}
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
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // In folded mode the Type column needs more room than the numeric ones —
  // otherwise dropdown options like "Custom airfoil" get clipped. Expanded
  // mode has plenty of horizontal space, so equal columns are fine.
  const topRowGrid = folded
    ? 'grid grid-cols-[minmax(160px,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3'
    : 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4';

  return (
    <div
      className={`flex w-full ${folded ? 'max-w-[516px]' : 'max-w-[924px]'} max-h-[calc(100vh-128px)] flex-col rounded-[14px] border border-[#e5e7eb] bg-white/95 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-[max-width] duration-150`}
    >
      {/* Sticky top region: top row + sub-tabs + undo/redo */}
      <div className="flex flex-col gap-4 p-6 pb-4">
      <div className={topRowGrid}>
        <div className="flex flex-col gap-2">
          <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">Type</Label>
          <Select value={type} onChange={setType} options={PROFILE_TYPES} />
        </div>
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="profile-start-pos"
            className="text-[14px] font-medium leading-none text-[#0a0a0a]"
          >
            Start position
          </Label>
          <Input
            id="profile-start-pos"
            value={startPos}
            onChange={(e) => setStartPos(e.target.value)}
            className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="profile-end-pos"
            className="text-[14px] font-medium leading-none text-[#0a0a0a]"
          >
            End position
          </Label>
          <Input
            id="profile-end-pos"
            value={endPos}
            onChange={(e) => setEndPos(e.target.value)}
            className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="profile-count"
            className="text-[14px] font-medium leading-none text-[#0a0a0a]"
          >
            Profile count
          </Label>
          <Input
            id="profile-count"
            value={profileCount}
            onChange={(e) => setProfileCount(e.target.value)}
            className="h-9 rounded-md border-[#e2e8f0] px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          />
        </div>
        <button
          type="button"
          onClick={onFoldToggle}
          aria-pressed={folded}
          aria-label={folded ? 'Show all sections at once (currently folded)' : 'Show sections one at a time (fold)'}
          className="mt-[22px] inline-flex h-9 w-9 items-center justify-center self-start rounded-md bg-[#006496] text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580]"
        >
          <FoldHorizontal className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* Sub-tabs — only when expanded; folded mode stacks all sections instead. */}
      {!folded && (
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
      )}

      {/* Undo / Redo */}
      <div className="flex items-center gap-1">
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

      </div>

      {/* Scrollable section area */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        {folded ? (
          <div className="flex flex-col gap-3">
            {SECTION_KEYS.map((key) => {
              const open = openSections[key];
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
                    <div className="border-t border-[#e5e7eb] p-4">{renderSectionBody(key)}</div>
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
