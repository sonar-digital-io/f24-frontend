import { FormField } from '@/components/geometry/GeometryEditControls';

interface GlobalProperties {
  nominalRadius: string;
  rootRadius: string;
  stackingLine: string;
  bladeNumber: string;
}

interface GeometryGlobalPropertiesPanelProps {
  props: GlobalProperties;
  onFieldChange: (key: keyof GlobalProperties, value: string) => void;
  airfoilOrientation: string;
  airfoilDrawingPlane: string;
  onSave: () => void;
  saving: boolean;
  saveError: boolean;
}

export function GeometryGlobalPropertiesPanel({
  props,
  onFieldChange,
  airfoilOrientation,
  airfoilDrawingPlane,
  onSave,
  saving,
  saveError,
}: GeometryGlobalPropertiesPanelProps) {
  return (
    <div className="flex max-h-[calc(100vh-72px)] flex-col gap-4 overflow-y-auto rounded-[14px] border border-[#e5e7eb] bg-white/95 p-4 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
      <FormField
        label="Nominal radius (m)"
        value={props.nominalRadius}
        onChange={(v) => onFieldChange('nominalRadius', v)}
        placeholder="e.g. 75.0"
      />
      <FormField
        label="Root radius (%)"
        value={props.rootRadius}
        onChange={(v) => onFieldChange('rootRadius', v)}
        placeholder="e.g. 5.0"
      />
      <FormField label="Airfoil orientation" value={airfoilOrientation} onChange={() => {}} disabled />
      <FormField label="Airfoil drawing plane" value={airfoilDrawingPlane} onChange={() => {}} disabled />
      <FormField
        label="Stacking line"
        value={props.stackingLine}
        onChange={(v) => onFieldChange('stackingLine', v)}
        placeholder="e.g. 1"
      />
      <FormField
        label="Blade number"
        value={props.bladeNumber}
        onChange={(v) => onFieldChange('bladeNumber', v)}
        placeholder="e.g. 3"
      />
      <p className="text-[14px] leading-5 text-[#6b7280]">
        Defines the longitudinal position along the chord line where the blade sections are
        aligned. A value of 0 represents the leading edge, while 1 represents the trailing
        edge. This setting determines the structural balance and aerodynamic center of the
        blade.
      </p>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {saveError && <p className="text-[13px] text-[#dc2626]">Failed to save. Please try again.</p>}
    </div>
  );
}
