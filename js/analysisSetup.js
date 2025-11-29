import { analysisSetup, settings } from './data.js';
import { calculateStack } from './dashboard.js';

// Analysis setup dialog functions
export function setupAnalysisSetup() {
  const dialog = document.getElementById("analysis-setup-dialog");
  const openBtn = document.getElementById("open-analysis-setup-dialog");
  
  if (!dialog || !openBtn) return;
  
  openBtn.addEventListener("click", () => {
    // Load current data into form
    loadAnalysisSetupData();
    // Update acceptance criteria dropdown based on advanced mode
    updateAcceptanceCriteriaOptions();
    dialog.showModal();
  });
  
  // Update acceptance criteria when advanced mode changes
  const advancedModeCheckbox = document.getElementById("setting-advanced-statistical-mode");
  if (advancedModeCheckbox) {
    advancedModeCheckbox.addEventListener("change", () => {
      if (dialog.open) {
        updateAcceptanceCriteriaOptions();
      }
    });
  }
  
  // Also update when settings dialog closes (in case user changes settings while analysis dialog is open)
  const settingsDialog = document.getElementById("settings-dialog");
  if (settingsDialog) {
    settingsDialog.addEventListener("close", () => {
      if (dialog.open) {
        updateAcceptanceCriteriaOptions();
      }
    });
  }
  
  // Handle OK button
  const okBtn = document.getElementById("analysis-setup-ok-btn");
  if (okBtn) {
    okBtn.addEventListener("click", () => {
      saveAnalysisSetupData();
      calculateStack(); // Recalculate to update acceptance criteria
      dialog.close();
    });
  }
}

function loadAnalysisSetupData() {
  // Metadata
  document.getElementById("analysis-title").value = analysisSetup.metadata.title || "";
  document.getElementById("analysis-project").value = analysisSetup.metadata.project || "";
  document.getElementById("analysis-part-nr").value = analysisSetup.metadata.partNr || "";
  document.getElementById("analysis-analyst").value = analysisSetup.metadata.analyst || "";
  document.getElementById("analysis-creation-date").value = analysisSetup.metadata.creationDate || new Date().toISOString().split('T')[0];
  
  // Critical Requirement
  document.getElementById("analysis-critical-feature").value = analysisSetup.criticalRequirement.criticalFeature || "";
  document.getElementById("analysis-nominal-target").value = analysisSetup.criticalRequirement.nominalTarget ?? "";
  document.getElementById("analysis-lsl").value = analysisSetup.criticalRequirement.lsl ?? "";
  document.getElementById("analysis-usl").value = analysisSetup.criticalRequirement.usl ?? "";
  document.getElementById("analysis-acceptance-criteria").value = analysisSetup.criticalRequirement.acceptanceCriteria || "";
  
  // Assumptions Context
  document.getElementById("analysis-functional-description").value = analysisSetup.assumptionsContext.functionalDescription || "";
}

function saveAnalysisSetupData() {
  // Metadata
  analysisSetup.metadata.title = document.getElementById("analysis-title").value;
  analysisSetup.metadata.project = document.getElementById("analysis-project").value;
  analysisSetup.metadata.partNr = document.getElementById("analysis-part-nr").value;
  analysisSetup.metadata.analyst = document.getElementById("analysis-analyst").value;
  analysisSetup.metadata.creationDate = document.getElementById("analysis-creation-date").value;
  
  // Critical Requirement
  analysisSetup.criticalRequirement.criticalFeature = document.getElementById("analysis-critical-feature").value;
  const nominalTarget = document.getElementById("analysis-nominal-target").value;
  analysisSetup.criticalRequirement.nominalTarget = nominalTarget ? parseFloat(nominalTarget) : null;
  const lsl = document.getElementById("analysis-lsl").value;
  analysisSetup.criticalRequirement.lsl = lsl ? parseFloat(lsl) : null;
  const usl = document.getElementById("analysis-usl").value;
  analysisSetup.criticalRequirement.usl = usl ? parseFloat(usl) : null;
  analysisSetup.criticalRequirement.acceptanceCriteria = document.getElementById("analysis-acceptance-criteria").value;
  
  // Assumptions Context
  analysisSetup.assumptionsContext.functionalDescription = document.getElementById("analysis-functional-description").value;
}

function updateAcceptanceCriteriaOptions() {
  const select = document.getElementById("analysis-acceptance-criteria");
  if (!select) return;
  
  const currentValue = select.value;
  select.innerHTML = "";
  
  if (settings.advancedStatisticalMode) {
    // Advanced mode options
    const options = [
      { value: "cpk-1", text: "Must have a Cpk of atleast 1" },
      { value: "cpk-1.33", text: "Must have a Cpk of atleast 1.33" },
      { value: "cpk-1.67", text: "Must have a Cpk of atleast 1.67" },
      { value: "cpk-2", text: "Must have a Cpk of atleast 2" },
    ];
    
    options.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.text;
      if (opt.value === currentValue) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  } else {
    // Basic mode options
    const options = [
      { value: "worst-case", text: "Worst Case tolerance must be within spec limits" },
      { value: "rss", text: "RSS tolerance must be within spec limits" },
    ];
    
    options.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.text;
      if (opt.value === currentValue) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }
  
  // If current value doesn't exist in new options, select first option
  if (!select.value && select.options.length > 0) {
    select.selectedIndex = 0;
  }
}

