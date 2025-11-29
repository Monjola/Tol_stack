import { setupCanvas } from './canvas.js';
import { setupTable } from './table.js';
import { setupDashboard } from './dashboard.js';
import { setupGDTHelpers } from './gdt.js';

// Main initialization
document.addEventListener("DOMContentLoaded", () => {
  setupCanvas();
  setupTable();
  setupDashboard();
  setupGDTHelpers();
});

