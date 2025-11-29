// Data structures and state management
export const stackData = [
  { description: "Dim 1", nominal: 10, tol: 0.1, tolType: "Linear", cpk: 1.33, floatShifted: false },
  { description: "Dim 2", nominal: 10, tol: 0.2, tolType: "Linear", cpk: 1.33, floatShifted: false },
  { description: "Dim 3", nominal: 10, tol: 0.3, tolType: "Linear", cpk: 1.33, floatShifted: false },
];

export const annotations = [];

export const state = {
  drawing: false,
  start: null,
  canvas: null,
  ctx: null,
  previewEnd: null,
};

