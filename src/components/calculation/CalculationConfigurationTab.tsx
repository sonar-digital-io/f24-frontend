import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import { ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { TagSelect } from '@/components/calculation/TagSelect';
import type { ConfigSection } from '@/types';

interface LimitsEnabled {
  thrust: boolean;
  torque: boolean;
  power: boolean;
}

interface CalculationConfigurationTabProps {
  analysisMethod: string;
  isModalMethod: boolean;
  isStaticStructural: boolean;
  activeConfigSection: ConfigSection;
  onJumpToSection: (id: ConfigSection) => void;
  configScrollRef: RefObject<HTMLDivElement>;
  configSectionRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  numberOfEigenmodes: string;
  onNumberOfEigenmodesChange: (value: string) => void;
  fixedBase: boolean;
  onFixedBaseToggle: () => void;
  aerofoilModel: string;
  onAerofoilModelChange: (value: string) => void;
  aeroCorrection: string;
  onAeroCorrectionChange: (value: string) => void;
  limitsEnabled: LimitsEnabled;
  onLimitsEnabledChange: Dispatch<SetStateAction<LimitsEnabled>>;
  structuralMethod: string;
  onStructuralMethodChange: (value: string) => void;
  plyFailureModel: string[];
  onPlyFailureModelChange: (value: string[]) => void;
  coreFailureModel: string[];
  onCoreFailureModelChange: (value: string[]) => void;
  fatigueAssessmentTags: string[];
  onFatigueAssessmentTagsChange: (value: string[]) => void;
  minerExponent: string;
  onMinerExponentChange: (value: string) => void;
  typeOfROI: string;
  onTypeOfROIChange: (value: string) => void;
  maxCriticalElements: string;
  onMaxCriticalElementsChange: (value: string) => void;
  irfLimit: string;
  irfLimitError: string;
  onIrfLimitChange: (value: string) => void;
  maxFatigueLife: string;
  onMaxFatigueLifeChange: (value: string) => void;
  debugMode: boolean;
  onDebugModeChange: (value: boolean) => void;
}

export function CalculationConfigurationTab({
  analysisMethod,
  isModalMethod,
  isStaticStructural,
  activeConfigSection,
  onJumpToSection,
  configScrollRef,
  configSectionRefs,
  numberOfEigenmodes,
  onNumberOfEigenmodesChange,
  fixedBase,
  onFixedBaseToggle,
  aerofoilModel,
  onAerofoilModelChange,
  aeroCorrection,
  onAeroCorrectionChange,
  limitsEnabled,
  onLimitsEnabledChange,
  structuralMethod,
  onStructuralMethodChange,
  plyFailureModel,
  onPlyFailureModelChange,
  coreFailureModel,
  onCoreFailureModelChange,
  fatigueAssessmentTags,
  onFatigueAssessmentTagsChange,
  minerExponent,
  onMinerExponentChange,
  typeOfROI,
  onTypeOfROIChange,
  maxCriticalElements,
  onMaxCriticalElementsChange,
  irfLimit,
  irfLimitError,
  onIrfLimitChange,
  maxFatigueLife,
  onMaxFatigueLifeChange,
  debugMode,
  onDebugModeChange,
}: CalculationConfigurationTabProps) {
  return (
    <div className="flex h-full w-full max-w-[1200px] overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
      {/* Sidebar nav — inside the card */}
      <aside className="w-[290px] shrink-0 p-6">
        <nav className="flex flex-col gap-1" aria-label="Configuration sections">
          {(
            analysisMethod === 'Modal (RPM & Aero)'
              ? ([{ id: 'modal', label: 'Modal analysis setup' }, { id: 'aero', label: 'Aero analysis setup' }, { id: 'debug', label: 'Debug' }] as const)
              : isModalMethod
              ? ([{ id: 'modal', label: 'Modal analysis setup' }, { id: 'debug', label: 'Debug' }] as const)
              : analysisMethod === 'Static structural (RPM & Aero)'
              ? ([{ id: 'aero', label: 'Aero analysis setup' }, { id: 'structural', label: 'Structural analysis setup' }, { id: 'postprocessing', label: 'Structural postprocessing setup' }, { id: 'debug', label: 'Debug' }] as const)
              : isStaticStructural
              ? ([{ id: 'structural', label: 'Structural analysis setup' }, { id: 'postprocessing', label: 'Structural postprocessing setup' }, { id: 'debug', label: 'Debug' }] as const)
              : ([{ id: 'aero', label: 'Aero analysis setup' }, { id: 'debug', label: 'Debug' }] as const)
          ).map(({ id, label }) => (
            <div key={id} className="group relative">
              <button
                type="button"
                onClick={() => onJumpToSection(id)}
                aria-current={activeConfigSection === id ? 'true' : undefined}
                className={`flex h-9 w-full items-center overflow-hidden rounded-md px-3 text-left text-[14px] font-medium leading-5 transition-colors ${
                  activeConfigSection === id
                    ? 'bg-[#eef9ff] text-[#171717]'
                    : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                }`}
              >
                <span className="truncate">{label}</span>
              </button>
              <div className="pointer-events-none absolute left-full top-1/2 z-[100] ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#171717] px-2.5 py-1.5 text-[12px] leading-4 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                {label}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Scrollable content */}
      <div ref={configScrollRef} className="min-w-0 flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-12">

          {/* ── Modal: Modal analysis setup section (first for all modal methods) ── */}
          {isModalMethod && (
            <section
              ref={(el) => (configSectionRefs.current['modal'] = el)}
              className="flex flex-col gap-6"
            >
              <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Modal analysis setup</h2>

              <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                <div className="flex w-full flex-col gap-2 md:w-[424px]">
                  <Label className="text-[14px] font-medium text-[#0a0a0a]">
                    Number of eigenmodes <span className="text-[#dc2626]">*</span>
                  </Label>
                  <input
                    type="text"
                    value={numberOfEigenmodes}
                    onChange={(e) => onNumberOfEigenmodesChange(e.target.value)}
                    placeholder="Placeholder"
                    className="h-9 w-full rounded-md border border-[#e2e8f0] bg-white px-3 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#006496]/30"
                  />
                </div>
                <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                  The total number of resonant frequencies to be calculated for the structure.
                </p>
              </div>

              {analysisMethod === 'Modal' && (
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                  <label className="flex w-full cursor-pointer items-center gap-3 md:w-[424px]">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={fixedBase}
                      onClick={onFixedBaseToggle}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${fixedBase ? 'bg-[#006496]' : 'bg-[#d1d5db]'}`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${fixedBase ? 'translate-x-4' : 'translate-x-0.5'}`}
                      />
                    </button>
                    <span className="text-[14px] font-medium text-[#0a0a0a]">Fixed base</span>
                  </label>
                  <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px]">
                    Enables a fixed-free modal analysis. When disabled, a free-free (unconstrained) analysis is performed.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* ── Aero + Limits sections (Aero only / non-Modal non-Static, Modal RPM & Aero, or Static structural RPM & Aero) ── */}
          {((!isModalMethod && !isStaticStructural) || analysisMethod === 'Modal (RPM & Aero)' || analysisMethod === 'Static structural (RPM & Aero)') && (
            <>
              {/* Aero section */}
              <section
                ref={(el) => (configSectionRefs.current['aero'] = el)}
                className="flex flex-col gap-6"
              >
                <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Aero analysis setup</h2>

                <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                  <div className="flex w-full flex-col gap-2 md:w-[424px]">
                    <Label className="text-[14px] font-medium text-[#0a0a0a]">
                      Aerofoil 2D aero <span className="text-[#dc2626]">*</span>
                    </Label>
                    <div className="relative">
                      <select
                        value={aerofoilModel}
                        onChange={(e) => onAerofoilModelChange(e.target.value)}
                        className="h-9 w-full appearance-none rounded-md border border-[#e2e8f0] bg-white px-3 pr-8 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-[#006496]/30"
                      >
                        <option>NACA 4 digit</option>
                        <option>NACA 5 digit</option>
                        <option>Experimental data</option>
                        <option>Panel method</option>
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"
                        strokeWidth={2}
                      />
                    </div>
                  </div>
                  <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                    Select the mathematical model for calculating 2D lift, drag, and moment
                    coefficients. NACA 4-digit is ideal for initial performance estimates.
                  </p>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                  <div className="flex w-full flex-col gap-2 md:w-[424px]">
                    <Label className="text-[14px] font-medium text-[#0a0a0a]">
                      Aero correction <span className="text-[#dc2626]">*</span>
                    </Label>
                    <div className="relative">
                      <select
                        value={aeroCorrection}
                        onChange={(e) => onAeroCorrectionChange(e.target.value)}
                        className="h-9 w-full appearance-none rounded-md border border-[#e2e8f0] bg-white px-3 pr-8 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-[#006496]/30"
                      >
                        <option>None</option>
                        <option>Prandtl tip loss</option>
                        <option>3D rotation correction</option>
                        <option>Prandtl + 3D rotation</option>
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"
                        strokeWidth={2}
                      />
                    </div>
                  </div>
                  <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                    Apply corrections for real-world effects, such as Prandtl's Tip Loss or 3D
                    rotational effects, to improve BEM theory accuracy near the blade tip.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  {(
                    [
                      {
                        key: 'thrust' as const,
                        label: 'RPM - thrust limit',
                        description:
                          'Enable this to clip aerodynamic loads when the axial force exceeds the structural threshold of the tower or the main bearing.',
                      },
                      {
                        key: 'torque' as const,
                        label: 'RPM - torque limit',
                        description:
                          'Enable this to ensure the calculated aerodynamic torque stays within the mechanical drivetrain and gearbox capacity.',
                      },
                      {
                        key: 'power' as const,
                        label: 'RPM - power limit',
                        description:
                          "Enable this to simulate the pitch-controller's behavior, maintaining rated power output at higher wind speeds.",
                      },
                    ] as const
                  ).map(({ key, label, description }) => (
                    <div
                      key={key}
                      className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4"
                    >
                      <label className="flex w-full cursor-pointer items-center gap-3 md:w-[424px]">
                        <input
                          type="checkbox"
                          checked={limitsEnabled[key]}
                          onChange={(e) =>
                            onLimitsEnabledChange((prev) => ({ ...prev, [key]: e.target.checked }))
                          }
                          className="h-4 w-4 rounded border-[#e2e8f0] accent-[#006496]"
                        />
                        <span className="text-[14px] font-medium text-[#0a0a0a]">{label}</span>
                      </label>
                      <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px]">{description}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ── Static structural sections ── */}
          {isStaticStructural && (
            <>
              {/* Structural analysis setup */}
              <section
                ref={(el) => (configSectionRefs.current['structural'] = el)}
                className="flex flex-col gap-6"
              >
                <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Structural analysis setup</h2>

                {/* Structural method */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                  <div className="flex w-full flex-col gap-2 md:w-[424px]">
                    <Label className="text-[14px] font-medium text-[#0a0a0a]">
                      Structural method <span className="text-[#dc2626]">*</span>
                    </Label>
                    <div className="relative">
                      <select
                        value={structuralMethod}
                        onChange={(e) => onStructuralMethodChange(e.target.value)}
                        className={`h-9 w-full appearance-none rounded-md border border-[#e2e8f0] bg-white px-3 pr-8 text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-[#006496]/30 ${structuralMethod === '' ? 'text-[#9ca3af]' : 'text-[#0a0a0a]'}`}
                      >
                        <option value="" disabled>Select</option>
                        <option>Ply failure</option>
                        <option>Core failure</option>
                        <option>Fatigue</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" strokeWidth={2} />
                    </div>
                  </div>
                  <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                    Select the primary failure analysis approach to apply across the composite layup.
                  </p>
                </div>

                {/* Ply failure model */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                  <div className="flex w-full flex-col gap-2 md:w-[424px]">
                    <Label className="text-[14px] font-medium text-[#0a0a0a]">
                      Ply failure model <span className="text-[#dc2626]">*</span>
                    </Label>
                    <TagSelect
                      options={['max stress', 'max strain', 'Hoffman', 'Tsai-Hill', 'Tsai-Wu', 'Hashin', 'Puck']}
                      value={plyFailureModel}
                      onChange={onPlyFailureModelChange}
                    />
                  </div>
                  <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                    Failure criteria applied to composite plies. Multiple criteria can be selected and compared in the results.
                  </p>
                </div>

                {/* Core failure model */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                  <div className="flex w-full flex-col gap-2 md:w-[424px]">
                    <Label className="text-[14px] font-medium text-[#0a0a0a]">
                      Core failure model <span className="text-[#dc2626]">*</span>
                    </Label>
                    <TagSelect
                      options={['face sheet wrinkling', 'core failure', 'shear crimpling']}
                      value={coreFailureModel}
                      onChange={onCoreFailureModelChange}
                    />
                  </div>
                  <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                    Failure criteria applied to sandwich core layers. Select all failure modes relevant to your core material.
                  </p>
                </div>

                {/* Fatigue assessment */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                  <div className="flex w-full flex-col gap-2 md:w-[424px]">
                    <Label className="text-[14px] font-medium text-[#0a0a0a]">
                      Fatigue assessment <span className="text-[#dc2626]">*</span>
                    </Label>
                    <TagSelect
                      options={['fiber direction', 'transverse direction', 'shear']}
                      value={fatigueAssessmentTags}
                      onChange={onFatigueAssessmentTagsChange}
                    />
                  </div>
                  <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                    Stress components used in the fatigue damage evaluation. Select all relevant directions for a complete assessment.
                  </p>
                </div>

                {/* Miner exponent */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                  <div className="flex w-full flex-col gap-2 md:w-[424px]">
                    <Label className="text-[14px] font-medium text-[#0a0a0a]">
                      Miner exponent <span className="text-[#dc2626]">*</span>
                    </Label>
                    <input
                      type="text"
                      value={minerExponent}
                      onChange={(e) => onMinerExponentChange(e.target.value)}
                      className="h-9 w-full rounded-md border border-[#e2e8f0] bg-white px-3 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#006496]/30"
                    />
                  </div>
                  <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                    Exponent used in the Palmgren-Miner linear damage accumulation rule. Use 1.0 for standard fatigue analysis.
                  </p>
                </div>
              </section>

              {/* Structural postprocessing */}
              <section
                ref={(el) => (configSectionRefs.current['postprocessing'] = el)}
                className="flex flex-col gap-6"
              >
                <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Structural postprocessing setup</h2>

                {/* Type of ROI */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                  <div className="flex w-full flex-col gap-2 md:w-[424px]">
                    <Label className="text-[14px] font-medium text-[#0a0a0a]">
                      Type of ROI <span className="text-[#dc2626]">*</span>
                    </Label>
                    <div className="relative">
                      <select
                        value={typeOfROI}
                        onChange={(e) => onTypeOfROIChange(e.target.value)}
                        className="h-9 w-full appearance-none rounded-md border border-[#e2e8f0] bg-white px-3 pr-8 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-[#006496]/30"
                      >
                        <option>None</option>
                        <option>Sections</option>
                        <option>Mappings</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" strokeWidth={2} />
                    </div>
                  </div>
                  <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                    Restrict postprocessing output to a specific region of interest. Use Sections or Mappings to focus on critical zones.
                  </p>
                </div>

                {/* Maximum number of critical elements */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                  <div className="flex w-full flex-col gap-2 md:w-[424px]">
                    <Label className="text-[14px] font-medium text-[#0a0a0a]">
                      Maximum number of critical elements to report <span className="text-[#dc2626]">*</span>
                    </Label>
                    <input
                      type="text"
                      value={maxCriticalElements}
                      onChange={(e) => onMaxCriticalElementsChange(e.target.value)}
                      className="h-9 w-full rounded-md border border-[#e2e8f0] bg-white px-3 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#006496]/30"
                    />
                  </div>
                  <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                    Number of elements ranked by IRF or fatigue damage to include in the report. Higher values produce more detailed output.
                  </p>
                </div>

                {/* IRF limit */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                  <div className="flex w-full flex-col gap-2 md:w-[424px]">
                    <Label className="text-[14px] font-medium text-[#0a0a0a]">
                      IRF limit <span className="text-[#dc2626]">*</span>
                    </Label>
                    <input
                      type="number"
                      value={irfLimit}
                      onChange={(e) => onIrfLimitChange(e.target.value)}
                      placeholder="0.0 – 1.0"
                      className={`h-9 w-full rounded-md border bg-white px-3 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#006496]/30 ${irfLimitError ? 'border-[#dc2626] focus:ring-[#dc2626]/30' : 'border-[#e2e8f0]'}`}
                    />
                    {irfLimitError && (
                      <p className="text-[12px] leading-4 text-[#dc2626]">{irfLimitError}</p>
                    )}
                  </div>
                  <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                    Inverse Reserve Factor threshold for identifying critical structural elements. Must be between 0.0 and 1.0.
                  </p>
                </div>

                {/* Maximum fatigue life */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                  <div className="flex w-full flex-col gap-2 md:w-[424px]">
                    <Label className="text-[14px] font-medium text-[#0a0a0a]">
                      Maximum fatigue life [cycles] <span className="text-[#dc2626]">*</span>
                    </Label>
                    <input
                      type="text"
                      value={maxFatigueLife}
                      onChange={(e) => onMaxFatigueLifeChange(e.target.value)}
                      className="h-9 w-full rounded-md border border-[#e2e8f0] bg-white px-3 text-[14px] text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#006496]/30"
                    />
                  </div>
                  <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px] md:pt-[26px]">
                    Elements with a calculated fatigue life above this value are considered non-critical and excluded from the damage summary.
                  </p>
                </div>
              </section>
            </>
          )}

          {/* Debug section — always shown */}
          <section
            ref={(el) => (configSectionRefs.current['debug'] = el)}
            className="flex flex-col gap-6"
          >
            <h2 className="text-[20px] font-bold leading-7 text-[#181c20]">Debug</h2>

            <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
              <label className="flex w-full cursor-pointer items-center gap-3 md:w-[424px]">
                <input
                  type="checkbox"
                  checked={debugMode}
                  onChange={(e) => onDebugModeChange(e.target.checked)}
                  className="h-4 w-4 rounded border-[#e2e8f0] accent-[#006496]"
                />
                <span className="text-[14px] font-medium text-[#0a0a0a]">Debug mode</span>
              </label>
              <p className="text-[14px] leading-5 text-[#6b7280] md:w-[424px]">
                Select debug switch to enable verbose solver output and intermediate result
                logging for diagnostic purposes.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
