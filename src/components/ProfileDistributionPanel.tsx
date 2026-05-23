import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  FoldHorizontal,
  Minus,
  Plus,
  Redo2,
  Undo2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PROFILE_TYPES = ['NACA 4 digit', 'NACA 5 digit', 'Custom airfoil'];

// Mock data for the Maximum camber tab. Replace when the real curve / fitting
// pipeline is wired in.
const MAX_CAMBER_ROWS: { index: number; relativeRadius: number; maxCam: number }[] = [
  { index: 0, relativeRadius: 0, maxCam: 0 },
  { index: 1, relativeRadius: 0.4186, maxCam: 23.7654 },
  { index: 2, relativeRadius: 0.91, maxCam: 22.13445 },
  { index: 3, relativeRadius: 1, maxCam: 5.7 },
];

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
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-64 overflow-y-auto rounded-md border border-[#e5e7eb] bg-white py-1 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]"
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

/**
 * Placeholder visualization of the camber distribution curve.
 * Loosely matches the Figma reference (grid, axis labels, two curves, four
 * control points). Replace with a real interactive curve editor later
 * (D3 / visx / a custom WebGL renderer — TBD).
 */
function BezierChartPlaceholder() {
  return (
    <div className="relative h-[260px] w-full rounded-md bg-white">
      {/* Zoom controls */}
      <div className="absolute right-2 top-2 z-10 flex flex-col overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
        <button
          type="button"
          aria-label="Zoom in"
          className="flex h-6 w-6 items-center justify-center text-[#6b7280] hover:bg-[#f1f5f9]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          className="flex h-6 w-6 items-center justify-center border-t border-[#e5e7eb] text-[#6b7280] hover:bg-[#f1f5f9]"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      <svg viewBox="0 0 460 260" className="h-full w-full" aria-label="Camber distribution chart">
        {/* Y-axis label */}
        <text x="6" y="12" fontSize="10" fill="#6b7280">
          (%)
        </text>

        {/* Y-axis grid + labels (0..24, step 2) */}
        {Array.from({ length: 13 }).map((_, i) => {
          const value = 24 - i * 2;
          const y = 20 + i * 17;
          return (
            <g key={`y${value}`}>
              <text x="22" y={y + 4} fontSize="9" fill="#6b7280">
                {value}
              </text>
              <line x1="40" y1={y} x2="450" y2={y} stroke="#f1f5f9" strokeWidth="1" />
            </g>
          );
        })}

        {/* X-axis grid + labels (0.00..1.00, step 0.10) */}
        {Array.from({ length: 11 }).map((_, i) => {
          const value = (i / 10).toFixed(2);
          const x = 70 + i * 38;
          return (
            <g key={`x${value}`}>
              <line x1={x} y1="20" x2={x} y2="245" stroke="#f1f5f9" strokeWidth="1" />
              <text x={x - 9} y="256" fontSize="9" fill="#6b7280">
                {value}
              </text>
            </g>
          );
        })}

        {/* Orange root indicator (vertical) */}
        <line x1="86" y1="22" x2="86" y2="244" stroke="#f59e0b" strokeWidth="1.5" opacity="0.8" />

        {/* Previous curve (thin green) */}
        <path
          d="M 70,244 Q 120,150 200,90 T 410,200 L 448,238"
          fill="none"
          stroke="#22c55e"
          strokeWidth="1.5"
          opacity="0.8"
        />

        {/* Active curve (thick blue) — bezier with 4 control points */}
        <path
          d="M 70,244 C 200,30 320,60 448,200"
          fill="none"
          stroke="#0066cc"
          strokeWidth="2.5"
        />

        {/* Dashed tangent lines between control points */}
        <line
          x1="70"
          y1="244"
          x2="200"
          y2="44"
          stroke="#0066cc"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.55"
        />
        <line
          x1="200"
          y1="44"
          x2="395"
          y2="56"
          stroke="#0066cc"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.55"
        />
        <line
          x1="395"
          y1="56"
          x2="448"
          y2="200"
          stroke="#0066cc"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.55"
        />

        {/* Control points */}
        {[
          { cx: 70, cy: 244 },
          { cx: 200, cy: 44 },
          { cx: 395, cy: 56 },
          { cx: 448, cy: 200 },
        ].map((pt, i) => (
          <g key={i}>
            <circle cx={pt.cx} cy={pt.cy} r="6" fill="#0066cc" />
            <circle cx={pt.cx} cy={pt.cy} r="3" fill="white" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function ProfileDistributionPanel() {
  const [type, setType] = useState('NACA 4 digit');
  const [startPos, setStartPos] = useState('0.05');
  const [endPos, setEndPos] = useState('1');
  const [profileCount, setProfileCount] = useState('6');
  const [subTab, setSubTab] = useState('maximum-camber');
  const [showDistribution, setShowDistribution] = useState(true);
  const [showTable, setShowTable] = useState(true);

  return (
    <div className="flex w-full max-w-[924px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
      {/* Top row: Type | Start | End | Profile count | + */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4">
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
          aria-label="Fold profiles"
          className="mt-[22px] inline-flex h-9 w-9 items-center justify-center self-start rounded-md bg-[#006496] text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580]"
        >
          <FoldHorizontal className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6] p-[3px]">
          <TabsTrigger
            value="maximum-camber"
            className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
          >
            Maximum camber
          </TabsTrigger>
          <TabsTrigger
            value="maximum-camber-position"
            className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
          >
            Maximum camber position
          </TabsTrigger>
          <TabsTrigger
            value="thickness"
            className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
          >
            Thickness (TMC)
          </TabsTrigger>
        </TabsList>
      </Tabs>

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

      {/* Two-column layout: chart | table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,384px)]">
        {/* Distribution view */}
        <div className="flex flex-col gap-3">
          <Switch checked={showDistribution} onChange={setShowDistribution} label="Distribution view" />
          {showDistribution && <BezierChartPlaceholder />}
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
                    <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Relative radius</th>
                    <th className="h-10 px-3 text-left font-medium text-[#6b7280]">Max Cam (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {MAX_CAMBER_ROWS.map((row) => (
                    <tr key={row.index} className="border-b border-[#e5e7eb] last:border-b-0">
                      <td className="px-3 py-3 text-[#0a0a0a]">{row.index}</td>
                      <td className="px-3 py-3 text-[#0a0a0a]">{row.relativeRadius}</td>
                      <td className="px-3 py-3 text-[#0a0a0a]">{row.maxCam}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
