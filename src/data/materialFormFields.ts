export interface FormField {
  name: string;
  label: string;
  required?: boolean;
  helper?: string;
}

export interface FormSection {
  id: string;
  label: string;
  fields: FormField[];
}

export const MECHANICAL_SECTIONS: FormSection[] = [
  {
    id: 'general-mechanical',
    label: 'General mechanical inputs',
    fields: [
      {
        name: 'density',
        label: 'Density (kg/m³)',
        required: true,
        helper: 'Enter density in kg/m³. Typical Carbon/Epoxy range: 1500–1600.',
      },
      {
        name: 'cte11',
        label: 'Coefficient of thermal expansion, 11 dir (1/C°)',
        required: true,
        helper:
          'Thermal expansion coeff. Use scientific notation (e.g., 1e-6). UD Carbon is near-zero in 11 dir.',
      },
      {
        name: 'cte22',
        label: 'Coefficient of thermal expansion, 22 dir (1/C°)',
        required: true,
        helper: 'Thermal expansion coeff. Use scientific notation (e.g., 1e-6).',
      },
      {
        name: 'cte33',
        label: 'Coefficient of thermal expansion, 33 dir (1/C°)',
        required: true,
        helper: 'Thermal expansion coeff. Use scientific notation (e.g., 1e-6).',
      },
      {
        name: 'e11',
        label: 'Elastic modulus, 11 dir (MPa)',
        required: true,
        helper: 'Longitudinal stiffness (E1). For T700 UD, expected range: 120,000–145,000 MPa.',
      },
      {
        name: 'e22',
        label: 'Elastic modulus, 22 dir (MPa)',
        required: true,
        helper: 'Transverse stiffness (E2, E3). Typically dominated by matrix (8,000–10,000 MPa).',
      },
      {
        name: 'e33',
        label: 'Elastic modulus, 33 dir (MPa)',
        required: true,
        helper: 'Transverse stiffness (E2, E3). Typically dominated by matrix (8,000–10,000 MPa).',
      },
      {
        name: 'nu12',
        label: "Poisson's ratio nu12",
        required: true,
        helper: "Major Poisson's ratio. Usually between 0.25 and 0.32 for UD carbon laminates.",
      },
      {
        name: 'nu13',
        label: "Poisson's ratio nu13",
        required: true,
        helper: "Major Poisson's ratio. Usually between 0.25 and 0.32 for UD carbon laminates.",
      },
      {
        name: 'nu23',
        label: "Poisson's ratio nu23",
        required: true,
        helper: 'Inter-fiber ratio. Typically higher than nu12, often around 0.45.',
      },
      {
        name: 'g12',
        label: 'Shear modulus, 12 plane (MPa)',
        required: true,
        helper: 'In-plane shear (G12, G13). For standard epoxy, expected range: 3,500–5,500 MPa.',
      },
      {
        name: 'g13',
        label: 'Shear modulus, 13 plane (MPa)',
        required: true,
        helper: 'In-plane shear (G12, G13). For standard epoxy, expected range: 3,500–5,500 MPa.',
      },
      {
        name: 'g23',
        label: 'Shear modulus, 23 plane (MPa)',
        required: true,
        helper: 'Out-of-plane shear (G23). Usually 20-30% lower than in-plane shear.',
      },
    ],
  },
  {
    id: 'stress-limits',
    label: 'Stress limits',
    fields: [
      {
        name: 'tensile11',
        label: 'Tensile 11 (MPa)',
        helper: 'Max. tensile stress along fibers. For Carbon UD, typically 1800–2500 MPa.',
      },
      {
        name: 'compressive11',
        label: 'Compressive 11 (MPa)',
        helper:
          'Max. compressive stress along fibers. Usually 50-70% of tensile strength due to fiber micro-buckling.',
      },
      {
        name: 'tensile22',
        label: 'Tensile 22 (MPa)',
        helper: 'Transverse tensile limit. Strictly matrix-dominated; expected range: 40–80 MPa.',
      },
      {
        name: 'compressive22',
        label: 'Compressive 22 (MPa)',
        helper:
          'Transverse compressive limit. Matrix can withstand more in compression than in tension. Range: 150–250 MPa.',
      },
      {
        name: 'tensile33',
        label: 'Tensile 33 (MPa)',
        helper: 'Out-of-plane tensile limit. Usually assumed equal to Tensile 22 for UD laminas.',
      },
      {
        name: 'compressive33',
        label: 'Compressive 33 (MPa)',
        helper: 'Through-thickness compression limit. Typically assumed equal to Compressive 22.',
      },
      {
        name: 'shear12',
        label: 'Shear 12 (MPa)',
        helper: 'In-plane shear limit. Governed by resin and fiber-matrix bond. Expected: 60–100 MPa.',
      },
      {
        name: 'ilss',
        label: 'Interlaminar shear strength (MPa)',
        helper:
          'Interlaminar shear strength (ILSS). Critical for delamination analysis. Expected: 60–90 MPa.',
      },
      {
        name: 'shear23',
        label: 'Shear 23 (MPa)',
        helper: 'Out-of-plane shear limit. Often lower than in-plane shear; range: 50–70 MPa.',
      },
    ],
  },
  {
    id: 'strain-limits',
    label: 'Strain limits',
    fields: [
      {
        name: 'strainTensile11',
        label: 'Strain tensile 11',
        helper: 'Max. elongation along fibers. For T700 carbon, typically 1.5% to 1.8% (0.015–0.018).',
      },
      {
        name: 'strainCompressive11',
        label: 'Strain compressive 11',
        helper:
          'Max. compression along fibers. Lower than tension due to fiber instability. Range: 0.008–0.011.',
      },
      {
        name: 'strainTensile22',
        label: 'Strain tensile 22',
        helper: 'Transverse tensile strain. Limited by matrix brittleness. Usually around 0.4% to 0.7%.',
      },
      {
        name: 'strainCompressive22',
        label: 'Strain compressive 22',
        helper: 'Transverse compression strain. Matrix can deform significantly more under compression.',
      },
      {
        name: 'strainTensile33',
        label: 'Strain tensile 33',
        helper: 'Out-of-plane tensile strain. Often assumed equal to Strain 22 failure for UD plys.',
      },
      {
        name: 'strainCompressive33',
        label: 'Strain compressive 33',
        helper: 'Through-thickness compression strain. Typically mirrors Compressive 22 behavior.',
      },
      {
        name: 'strainShear12',
        label: 'Shear strain 12',
        helper: 'In-plane shear strain limit. High values due to matrix shear ductility. Range: 0.02–0.04.',
      },
      {
        name: 'strainIls',
        label: 'Interlaminar shear strain',
        helper: 'Interlaminar shear strain limit. Critical for monitoring resin-rich layer failure.',
      },
      {
        name: 'strainShear23',
        label: 'Shear strain 23',
        helper: 'Out-of-plane shear strain. Usually 15-20% lower than in-plane shear limits.',
      },
    ],
  },
  {
    id: 'tsai-wu',
    label: 'Tsai-Wu constants',
    fields: [
      {
        name: 'tsaiF12',
        label: 'F12',
        helper: 'Helper text: here we can add additional explanation to any input field',
      },
      {
        name: 'tsaiF13',
        label: 'F13',
        helper: 'Helper text: here we can add additional explanation to any input field',
      },
      {
        name: 'tsaiF23',
        label: 'F23',
        helper: 'Helper text: here we can add additional explanation to any input field',
      },
    ],
  },
  {
    id: 'puck',
    label: 'Puck constants',
    fields: [
      {
        name: 'puckP12Plus',
        label: 'p12+',
        helper: 'Helper text: here we can add additional explanation to any input field',
      },
      {
        name: 'puckP12Minus',
        label: 'p12−',
        helper: 'Helper text: here we can add additional explanation to any input field',
      },
      {
        name: 'puckP22Plus',
        label: 'p22+',
        helper: 'Helper text: here we can add additional explanation to any input field',
      },
      {
        name: 'puckP22Minus',
        label: 'p22−',
        helper: 'Helper text: here we can add additional explanation to any input field',
      },
    ],
  },
  {
    id: 'additional-puck',
    label: 'Additional Puck constants',
    fields: [
      {
        name: 'puckMagnificationFactor',
        label: 'Magnification factor',
        helper: 'Helper text: here we can add additional explanation to any input field',
      },
      {
        name: 'puckExposureFactor',
        label: 'Exposure factor',
        helper: 'Helper text: here we can add additional explanation to any input field',
      },
    ],
  },
];
