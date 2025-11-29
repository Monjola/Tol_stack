// Data structures and state management
export const stackData = [
  { description: "Base Plate Thickness", nominal: 12.5, direction: "+", tol: 0.15, tolType: "Linear", cpk: 1.33, floatShifted: false },
  { description: "Spacer Block", nominal: 8.3, direction: "+", tol: 0.08, tolType: "Linear", cpk: 1.67, floatShifted: false },
  { description: "Housing Height", nominal: 25.0, direction: "+", tol: 0.25, tolType: "GD&T", cpk: 1.33, floatShifted: false },
  { description: "Bearing Seat Depth", nominal: 15.7, direction: "+", tol: 0.12, tolType: "Linear", cpk: 1.50, floatShifted: true },
  { description: "Retaining Ring Groove", nominal: 6.2, direction: "+", tol: 0.05, tolType: "Float", cpk: 2.0, floatShifted: false },
  { description: "Shaft Length", nominal: 18.9, direction: "+", tol: 0.18, tolType: "Linear", cpk: 1.33, floatShifted: false },
  { description: "Bearing Outer Race", nominal: 22.4, direction: "+", tol: 0.22, tolType: "GD&T", cpk: 1.25, floatShifted: true },
  { description: "Washer Thickness", nominal: 9.6, direction: "+", tol: 0.10, tolType: "Linear", cpk: 1.67, floatShifted: false },
  { description: "Cover Plate", nominal: 14.1, direction: "+", tol: 0.14, tolType: "Float", cpk: 1.50, floatShifted: false },
  { description: "Overall Assembly Height", nominal: 30.5, direction: "+", tol: 0.30, tolType: "Linear", cpk: 1.33, floatShifted: false },
];

export const annotations = [];

export const state = {
  drawing: false,
  start: null,
  canvas: null,
  ctx: null,
  previewEnd: null,
};

// Settings for advanced features
export const settings = {
  advancedStatisticalMode: false, // Combines Cpk input and statistical output
  showFloatShifted: false,
  showToleranceType: false,
};

