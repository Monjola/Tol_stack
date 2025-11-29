import { settings, analysisSetup } from './data.js';
import { refreshTable } from './table.js';
import { calculateStack } from './dashboard.js';

// Settings dialog functions
export function setupSettings() {
  const dialog = document.getElementById("settings-dialog");
  const openBtn = document.getElementById("open-settings-dialog");
  
  if (!dialog || !openBtn) return;
  
  openBtn.addEventListener("click", () => {
    // Load current settings into checkboxes
    document.getElementById("setting-advanced-statistical-mode").checked = settings.advancedStatisticalMode;
    document.getElementById("setting-tolerance-type").checked = settings.showToleranceType;
    document.getElementById("setting-float-shifted").checked = settings.showFloatShifted;
    
    dialog.showModal();
  });
  
  // Handle advanced statistical mode (combines Cpk column and statistical output)
  document.getElementById("setting-advanced-statistical-mode").addEventListener("change", (e) => {
    settings.advancedStatisticalMode = e.target.checked;
    
    // Update acceptance criteria to match the new mode
    const currentCriteria = analysisSetup.criticalRequirement.acceptanceCriteria;
    const isAdvancedCriteria = currentCriteria && currentCriteria.startsWith("cpk-");
    const isBasicCriteria = currentCriteria === "worst-case" || currentCriteria === "rss";
    
    // If switching to advanced mode and current criteria is basic (or empty), set default
    if (e.target.checked && (!currentCriteria || isBasicCriteria)) {
      analysisSetup.criticalRequirement.acceptanceCriteria = "cpk-1.33";
    }
    // If switching to basic mode and current criteria is advanced (or empty), set default
    else if (!e.target.checked && (!currentCriteria || isAdvancedCriteria)) {
      analysisSetup.criticalRequirement.acceptanceCriteria = "worst-case";
    }
    
    refreshTable();
    calculateStack(); // Recalculate to show/hide stats
  });
  
  // Handle setting changes
  document.getElementById("setting-tolerance-type").addEventListener("change", (e) => {
    settings.showToleranceType = e.target.checked;
    refreshTable();
  });
  
  document.getElementById("setting-float-shifted").addEventListener("change", (e) => {
    settings.showFloatShifted = e.target.checked;
    refreshTable();
  });
}

