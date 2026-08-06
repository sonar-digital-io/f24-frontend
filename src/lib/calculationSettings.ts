import type { KeyValuePair } from '@/api/types/common';

/**
 * Builds the PUT /project/:id/settings/ payload sent the moment an analysis
 * method is chosen — the field set, order, and default values per method
 * were reverse-engineered from real backend traffic. The `analysis_method`
 * slugs below match the ids the sysconfig endpoint itself declares for the
 * `analysis_method` parameter's options (its "choose" id is the unselected
 * placeholder, never a real choice, so it's not mapped here). The
 * Configuration tab is fully sysconfig-driven and owns no field state, so
 * this always sends the same defaults a fresh method switch produces —
 * before the user has touched anything on that tab.
 */
const ANALYSIS_METHOD_SLUGS: Record<string, string> = {
  'Aero only': 'aero',
  Modal: 'modal',
  'Modal (RPM)': 'modal_rpm',
  'Modal (RPM & Aero)': 'modal_rpm_aero',
  'Static structural (RPM)': 'static_structural_rpm',
  'Static structural (RPM & Aero)': 'static_structural_rpm_aero',
};

export function buildAnalysisSettingsPayload(analysisMethod: string): KeyValuePair[] {
  const slug = ANALYSIS_METHOD_SLUGS[analysisMethod] ?? '';
  const settings: KeyValuePair[] = [
    { reference: 'analysis_method', value: slug },
    { reference: 'econ_debug', value: 'false' },
  ];

  const needsAero = slug === 'modal' || slug === 'static_structural_rpm';
  if (needsAero) {
    settings.push(
      { reference: 'composition_or_geometry', value: 'composition' },
      { reference: 'aero_2d', value: 'naca4digit' },
      { reference: 'aero_correction', value: 'none' },
      { reference: 'rpm_thrust_limit_enable', value: 'false' },
      { reference: 'rpm_torque_limit_enable', value: 'false' },
      { reference: 'rpm_power_limit_enable', value: 'false' }
    );
  }

  const needsEigenModes =
    slug === 'aero' || slug === 'modal_rpm' || slug === 'modal_rpm_aero' || slug === 'static_structural_rpm';
  if (needsEigenModes) {
    settings.push({ reference: 'eigen_modes', value: '' });
  }

  if (slug === 'static_structural_rpm_aero') {
    settings.push(
      { reference: 'structural_method', value: '' },
      { reference: 'ply_failure_model', value: 'max_stress' },
      { reference: 'core_failure_model', value: 'face_sheet_wrinkling' },
      { reference: 'fatigue_assessment', value: 'fiber_direction' },
      { reference: 'miner_exponent', value: '1' },
      { reference: 'roi_type', value: 'none' },
      { reference: 'max_report', value: '10' },
      { reference: 'irf_limit', value: '' },
      { reference: 'max_cycle', value: '10000000000' }
    );
  }

  return settings;
}
