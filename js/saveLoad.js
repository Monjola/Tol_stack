import { stackData, annotations, analysisSetup, settings } from './data.js';
import { renderTable, refreshTable } from './table.js';
import { redrawAnnotations, resizeCanvas } from './canvas.js';
import { calculateStack } from './dashboard.js';

// Save and load functionality for stack data
export function setupSaveLoad() {
  const saveBtn = document.getElementById("save-stack-btn");
  const loadBtn = document.getElementById("load-stack-btn");
  const loadInput = document.getElementById("load-stack-input");

  if (!saveBtn) {
    console.error("Save button not found!");
    return;
  }

  saveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    console.log("Save button clicked");
    saveStack();
  });

  if (loadBtn && loadInput) {
    loadBtn.addEventListener("click", () => {
      loadInput.click();
    });

    loadInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          loadStack(data);
        } catch (error) {
          alert("Error loading file: " + error.message);
        }
      };
      reader.readAsText(file);
      
      // Reset input so same file can be loaded again
      e.target.value = "";
    });
  }
}

function saveStack() {
  try {
    console.log("saveStack called");
    
    // Get canvas image as base64
    const img = document.getElementById("drawing-img");
    let canvasImage = null;
    if (img && img.src && img.src !== "") {
      canvasImage = img.src;
    }

    // Create save data object
    const saveData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      stackData: [...stackData],
      annotations: [...annotations],
      analysisSetup: JSON.parse(JSON.stringify(analysisSetup)), // Deep copy
      settings: JSON.parse(JSON.stringify(settings)), // Deep copy
      canvasImage: canvasImage,
    };

    console.log("Save data created:", saveData);

    // Convert to JSON
    const json = JSON.stringify(saveData, null, 2);
    
    // Create blob and download
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.style.display = "none";
    
    // Generate filename from analysis title or timestamp
    const title = analysisSetup.metadata.title || "stack";
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "stack";
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${sanitizedTitle}_${dateStr}.json`;
    a.download = filename;
    
    console.log("Downloading file:", filename);
    
    document.body.appendChild(a);
    a.click();
    
    // Clean up after a short delay
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    // Show success message with location info
    alert(`Stack saved as "${filename}"\n\nCheck your Downloads folder. If you want to choose the save location, enable "Ask where to save each file before downloading" in your browser settings.`);
  } catch (error) {
    console.error("Error saving stack:", error);
    alert("Error saving stack: " + error.message + "\n\nCheck the browser console for details.");
  }
}

function loadStack(data) {
  // Validate data structure
  if (!data || typeof data !== "object") {
    alert("Invalid file format");
    return;
  }

  // Confirm before loading (will overwrite current data)
  if (!confirm("Loading this file will replace all current data. Continue?")) {
    return;
  }

  try {
    // Load stack data
    if (Array.isArray(data.stackData)) {
      stackData.length = 0;
      stackData.push(...data.stackData);
    }

    // Load annotations
    if (Array.isArray(data.annotations)) {
      annotations.length = 0;
      annotations.push(...data.annotations);
    }

    // Load analysis setup
    if (data.analysisSetup) {
      Object.assign(analysisSetup, data.analysisSetup);
    }

    // Load settings
    if (data.settings) {
      Object.assign(settings, data.settings);
    }

    // Load canvas image
    if (data.canvasImage) {
      const img = document.getElementById("drawing-img");
      const uploadPlaceholder = document.getElementById("canvas-upload-placeholder");
      const canvasWrapper = document.getElementById("canvas-wrapper");
      const removeBtn = document.getElementById("remove-image-btn");
      
      if (img) {
        img.src = data.canvasImage;
        if (uploadPlaceholder) uploadPlaceholder.style.display = "none";
        if (canvasWrapper) canvasWrapper.style.display = "block";
        if (removeBtn) removeBtn.style.display = "block";
        
        // Resize canvas after image loads
        img.onload = () => {
          resizeCanvas();
        };
        
        if (img.complete) {
          resizeCanvas();
        }
      }
    } else {
      // No image in saved data, show placeholder
      const img = document.getElementById("drawing-img");
      const uploadPlaceholder = document.getElementById("canvas-upload-placeholder");
      const canvasWrapper = document.getElementById("canvas-wrapper");
      const removeBtn = document.getElementById("remove-image-btn");
      
      if (img) img.src = "";
      if (uploadPlaceholder) uploadPlaceholder.style.display = "flex";
      if (canvasWrapper) canvasWrapper.style.display = "none";
      if (removeBtn) removeBtn.style.display = "none";
    }

    // Refresh UI
    renderTable();
    redrawAnnotations();
    calculateStack();
    
    // Update settings checkboxes if they exist
    const advancedModeCheckbox = document.getElementById("setting-advanced-statistical-mode");
    const toleranceTypeCheckbox = document.getElementById("setting-tolerance-type");
    const floatShiftedCheckbox = document.getElementById("setting-float-shifted");
    
    if (advancedModeCheckbox) advancedModeCheckbox.checked = settings.advancedStatisticalMode;
    if (toleranceTypeCheckbox) toleranceTypeCheckbox.checked = settings.showToleranceType;
    if (floatShiftedCheckbox) floatShiftedCheckbox.checked = settings.showFloatShifted;
    
    // Refresh table to show/hide columns based on settings
    if (typeof refreshTable === 'function') {
      refreshTable();
    }

    alert("Stack loaded successfully!");
  } catch (error) {
    alert("Error loading stack: " + error.message);
  }
}

