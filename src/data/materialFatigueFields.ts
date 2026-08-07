import type { FormSection } from '@/data/materialFormFields';

export const FATIGUE_SECTIONS: FormSection[] = [
  {
    id: 'misc-fatigue',
    label: 'Miscellaneous fatigue properties',
    fields: [
      {
        name: 'enduranceFiber',
        label: 'Endurance limit, fiber dir (MPa)',
        helper:
          'Typical range: 800–1000 MPa. Represents the "fatigue floor" where no damage occurs after 10⁷ cycles.',
      },
      {
        name: 'enduranceTransverse',
        label: 'Endurance limit, transverse dir (MPa)',
        helper:
          'Typical range: 20–35 MPa. Heavily dependent on matrix quality and fiber-matrix interface.',
      },
      {
        name: 'enduranceShear',
        label: 'Endurance limit, shear (MPa)',
        helper: 'Typical range: 30–45 MPa. Crucial for assessing interlaminar durability.',
      },
    ],
  },
  {
    id: 'fatigue-fiber',
    label: 'Fatigue properties in fiber dir',
    fields: [
      {
        name: 'haighInterceptFiber',
        label: 'Haigh-diagram intercept, fiber dir',
        helper:
          'Intercept at zero mean stress (R=−1). For T700 UD, expected range: 800–950 MPa.',
      },
      {
        name: 'haighSlopeFiber',
        label: 'Haigh-diagram slope, fiber dir',
        helper:
          'Slope of the fatigue envelope. UD Carbon is fatigue-insensitive; use values between 0.05 and 0.12.',
      },
      {
        name: 'haighCorrectionFiber',
        label: 'Haigh-diagram correction parameter',
        helper:
          'Adjustment for non-linear mean stress effects. Default is 1.0 for linear Haigh theory.',
      },
    ],
  },
  {
    id: 'fatigue-transverse',
    label: 'Fatigue properties in transverse dir',
    fields: [
      {
        name: 'haighInterceptTransverse',
        label: 'Haigh-diagram intercept, transverse dir (MPa)',
        helper:
          'Fully reversed strength perpendicular to fibers. Matrix-dominated; typical range: 20–40 MPa.',
      },
      {
        name: 'haighSlopeTransverse',
        label: 'Haigh-diagram slope, transverse dir',
        helper:
          'Transverse direction is more sensitive to mean stress than the fiber direction. Typical range: 0.2–0.3.',
      },
      {
        name: 'haighCorrectionTransverse',
        label: 'Haigh-diagram correction parameter',
        helper: 'Correction for R-ratio effects. Use 1.0 for standard Goodman/Haigh linear fit.',
      },
    ],
  },
  {
    id: 'fatigue-shear',
    label: 'In-plane shear fatigue properties',
    fields: [
      {
        name: 'haighInterceptShear',
        label: 'Haigh-diagram intercept, shear (MPa)',
        helper: 'Shear fatigue strength at R=−1. Use 40–60% of static shear strength as a baseline.',
      },
      {
        name: 'haighSlopeShear',
        label: 'Haigh-diagram slope, shear',
        helper: 'Sensitivity to mean shear stress. Typically similar to transverse direction values.',
      },
      {
        name: 'haighCorrectionShear',
        label: 'Haigh-diagram correction parameter',
        helper: 'Correction for R-ratio effects. Use 1.0 for standard Goodman/Haigh linear fit.',
      },
    ],
  },
];
