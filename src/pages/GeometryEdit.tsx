import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, Settings, Check, X } from 'lucide-react';
import { MainNav } from '@/components/MainNav';
import { BladeScene } from '@/components/BladeScene';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GEOMETRIES } from '@/data/geometries';

type RenderMode = 'solid' | 'wireframe';

interface GlobalProperties {
  nominalRadius: string;
  rootRadius: string;
  stackingReference: string;
}

function CoordinateGizmo() {
  return (
    <svg viewBox="0 0 100 100" className="h-20 w-20" aria-hidden="true">
      {/* Z axis (up, green) */}
      <line x1="50" y1="50" x2="50" y2="15" stroke="#16a34a" strokeWidth="2" />
      <polygon points="50,10 46,18 54,18" fill="#16a34a" />
      <text x="55" y="14" fontSize="9" fill="#16a34a">z</text>
      {/* Y axis (right, blue) */}
      <line x1="50" y1="50" x2="85" y2="50" stroke="#2563eb" strokeWidth="2" />
      <polygon points="90,50 82,46 82,54" fill="#2563eb" />
      <text x="80" y="64" fontSize="9" fill="#2563eb">y</text>
      {/* X axis (lower-left, red) */}
      <line x1="50" y1="50" x2="22" y2="78" stroke="#dc2626" strokeWidth="2" />
      <polygon points="18,82 26,80 22,72" fill="#dc2626" />
      <text x="10" y="78" fontSize="9" fill="#dc2626">x</text>
    </svg>
  );
}

interface RenderToggleProps {
  value: RenderMode;
  onChange: (v: RenderMode) => void;
}

function RenderToggle({ value, onChange }: RenderToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-[#e5e7eb] bg-white/95 p-1 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm">
      {(['solid', 'wireframe'] as const).map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`inline-flex h-6 items-center gap-1 rounded px-2 text-[12px] font-medium capitalize ${
              active ? 'bg-[#eef9ff] text-[#171717]' : 'text-[#6b7280] hover:bg-[#f1f5f9]'
            }`}
          >
            {active && <Check className="h-3 w-3" strokeWidth={2.5} />}
            {mode}
          </button>
        );
      })}
      <button
        type="button"
        aria-label="Render mode menu"
        className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9]"
      >
        <ChevronDown className="h-3 w-3" strokeWidth={2} />
      </button>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function FormField({ label, value, onChange }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[14px] font-medium leading-none text-[#0a0a0a]">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border-[#e2e8f0] bg-white px-3 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
      />
    </div>
  );
}

export function GeometryEdit() {
  const { id } = useParams<{ id: string }>();
  const geometry = GEOMETRIES.find((g) => g.id === id);
  const name = geometry?.name ?? id ?? 'New geometry';

  const [activeTab, setActiveTab] = useState('global-properties');
  const [renderMode, setRenderMode] = useState<RenderMode>('wireframe');
  const [props, setProps] = useState<GlobalProperties>({
    nominalRadius: '75.0',
    rootRadius: '5.0',
    stackingReference: '0.3',
  });

  function updateField(name: keyof GlobalProperties, value: string) {
    setProps((p) => ({ ...p, [name]: value }));
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
      <MainNav />

      {/* Body: full-bleed 3D scene with floating overlays (incl. sub-toolbar) */}
      <main className="relative flex-1 overflow-hidden">
        {/* Three.js canvas fills the whole body, including under the sub-toolbar */}
        <BladeScene wireframe={renderMode === 'wireframe'} />

        {/* Floating sub-toolbar — transparent bg so the canvas shows through.
            Title is absolutely positioned at viewport center, independent of
            left/right element widths. */}
        <div className="absolute inset-x-0 top-0 z-30 h-[52px]">
          <div className="absolute inset-y-0 left-4 flex items-center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-9">
              <TabsList className="h-9 gap-0 rounded-[10px] bg-[#f3f4f6]/95 p-[3px] backdrop-blur-sm">
                {[
                  { value: 'global-properties', label: 'Global properties' },
                  { value: 'profile-distribution', label: 'Profile distribution' },
                  { value: 'profiles', label: 'Profiles' },
                  { value: 'stacking', label: 'Stacking' },
                  { value: 'spars', label: 'Spars' },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="h-full rounded-[8px] px-3 py-1 text-[14px] font-medium leading-5 text-[#0a0a0a] data-[state=active]:bg-white data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <h1 className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden text-[18px] font-semibold leading-7 text-[#0a0a0a] lg:block">
            {name}
          </h1>

          <div className="absolute inset-y-0 right-4 flex items-center">
            <Link
              to="/geometry"
              className="inline-flex h-8 items-center gap-2 rounded-md bg-[#f1f5f9]/95 px-3 py-2 text-[12px] font-medium text-[#171717] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:bg-[#e2e8f0]"
            >
              Exit edit mode
              <X className="h-4 w-4 opacity-70" strokeWidth={1.33} />
            </Link>
          </div>
        </div>

        {/* Floating properties panel (top-left, gap below toolbar matches gap above tab pill = 8px) */}
        <aside className="absolute left-4 top-[52px] z-20 w-[280px]">
          {activeTab === 'global-properties' && (
            <div className="flex flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white/95 p-4 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
              <FormField
                label="Nominal radius (m)"
                value={props.nominalRadius}
                onChange={(v) => updateField('nominalRadius', v)}
              />
              <FormField
                label="Root radius (%)"
                value={props.rootRadius}
                onChange={(v) => updateField('rootRadius', v)}
              />
              <FormField
                label="Stacking reference"
                value={props.stackingReference}
                onChange={(v) => updateField('stackingReference', v)}
              />
              <p className="text-[14px] leading-5 text-[#6b7280]">
                Defines the longitudinal position along the chord line where the blade sections are
                aligned. A value of 0 represents the leading edge, while 1 represents the trailing
                edge. This setting determines the structural balance and aerodynamic center of the
                blade.
              </p>
            </div>
          )}
          {activeTab !== 'global-properties' && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 text-center shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
              <p className="text-[14px] font-semibold text-[#0a0a0a]">
                {activeTab.replace('-', ' ').replace(/^./, (c) => c.toUpperCase())}
              </p>
              <p className="text-[14px] text-[#6b7280]">Coming soon.</p>
            </div>
          )}
        </aside>

        {/* Render toggle + settings (top-center, gap below toolbar matches gap above tab pill = 8px) */}
        <div className="absolute left-1/2 top-[52px] z-20 flex -translate-x-1/2 items-center gap-2">
          <RenderToggle value={renderMode} onChange={setRenderMode} />
          <button
            type="button"
            aria-label="Viewer settings"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e7eb] bg-white/95 text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:bg-[#f1f5f9]"
          >
            <Settings className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Coordinate gizmo (bottom-left) */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-20">
          <CoordinateGizmo />
        </div>
      </main>
    </div>
  );
}
