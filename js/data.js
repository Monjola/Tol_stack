// Data structures and state management
export const stackData = [
  { description: "Dim 1", nominal: 12.5, tol: 0.15, tolType: "Linear", cpk: 1.33, floatShifted: false },
  { description: "Dim 2", nominal: 8.3, tol: 0.08, tolType: "Linear", cpk: 1.67, floatShifted: false },
  { description: "Dim 3", nominal: 25.0, tol: 0.25, tolType: "GD&T", cpk: 1.33, floatShifted: false },
  { description: "Dim 4", nominal: 15.7, tol: 0.12, tolType: "Linear", cpk: 1.50, floatShifted: true },
  { description: "Dim 5", nominal: 6.2, tol: 0.05, tolType: "Float", cpk: 2.0, floatShifted: false },
  { description: "Dim 6", nominal: 18.9, tol: 0.18, tolType: "Linear", cpk: 1.33, floatShifted: false },
  { description: "Dim 7", nominal: 22.4, tol: 0.22, tolType: "GD&T", cpk: 1.25, floatShifted: true },
  { description: "Dim 8", nominal: 9.6, tol: 0.10, tolType: "Linear", cpk: 1.67, floatShifted: false },
  { description: "Dim 9", nominal: 14.1, tol: 0.14, tolType: "Float", cpk: 1.50, floatShifted: false },
  { description: "Dim 10", nominal: 30.5, tol: 0.30, tolType: "Linear", cpk: 1.33, floatShifted: false },
];

export const annotations = [];

export const state = {
  drawing: false,
  start: null,
  canvas: null,
  ctx: null,
  previewEnd: null,
};

