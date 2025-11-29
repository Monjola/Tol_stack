import { setupCanvas } from './canvas.js';
import { setupTable } from './table.js';
import { setupDashboard } from './dashboard.js';
import { setupSettings } from './settings.js';
import { setupAnalysisSetup } from './analysisSetup.js';

// Main initialization
document.addEventListener("DOMContentLoaded", () => {
  setupCanvas();
  setupTable();
  setupDashboard();
  setupSettings();
  setupAnalysisSetup();
});

