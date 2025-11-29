import { stackData } from './data.js';
import { settings } from './data.js';
import { calculateStack } from './dashboard.js';

// Table management functions
export function setupTable() {
  document.getElementById("add-row").addEventListener("click", () => {
    stackData.push({
      partNr: "", // Empty part number for new rows
      description: "",
      nominal: 0,
      direction: "+", // Default direction
      tol: 0,
      tolType: "Linear", // Default, but hidden in simple mode
      cpk: 1.33, // Default, but hidden in simple mode
      floatShifted: false, // Default, but hidden in simple mode
      notes: "", // Empty notes for new rows
    });
    renderTable();
  });
  renderTable();
  setupNotesDialogs();
}

export function renderTable() {
  const tbody = document.getElementById("stack-body");
  tbody.innerHTML = "";

  stackData.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.draggable = true;
    tr.dataset.index = index;
    tr.classList.add("draggable-row");
    
    const toleranceTypeCell = settings.showToleranceType ? `
      <td class="advanced-col tolerance-type-col">
        <select data-key="tolType" data-index="${index}">
          <option ${row.tolType === "Linear" ? "selected" : ""}>Linear</option>
          <option ${row.tolType === "GD&T" ? "selected" : ""}>GD&T</option>
          <option ${row.tolType === "Float" ? "selected" : ""}>Float</option>
        </select>
      </td>
    ` : '';
    
    const cpkCell = settings.advancedStatisticalMode ? `
      <td class="advanced-col cpk-col"><input type="number" step="0.01" data-key="cpk" data-index="${index}" value="${row.cpk ?? 1.33}"></td>
    ` : '';
    
    const floatCell = settings.showFloatShifted ? `
      <td class="advanced-col float-col" style="text-align:center;"><input type="checkbox" data-key="floatShifted" data-index="${index}" ${row.floatShifted ? "checked" : ""}></td>
    ` : '';
    
    const direction = row.direction || "+"; // Default to "+" if not set
    
    tr.innerHTML = `
      <td class="drag-handle" title="Drag to reorder">⋮⋮</td>
      <td class="item-number" style="text-align: center; color: var(--muted);">${index + 1}</td>
      <td><input type="text" data-key="partNr" data-index="${index}" value="${row.partNr ?? ""}" placeholder="Part Nr"></td>
      <td><input type="text" data-key="description" data-index="${index}" value="${row.description ?? ""}"></td>
      <td><input type="number" step="0.001" data-key="nominal" data-index="${index}" value="${row.nominal ?? 0}"></td>
      <td style="min-width: 80px;">
        <select data-key="direction" data-index="${index}" style="width: 100%;">
          <option value="+" ${direction === "+" ? "selected" : ""}>+</option>
          <option value="-" ${direction === "-" ? "selected" : ""}>-</option>
        </select>
      </td>
      ${toleranceTypeCell}
      <td><input type="text" data-key="tol" data-index="${index}" value="${row.tol ?? 0}"></td>
      ${cpkCell}
      ${floatCell}
      <td style="text-align: center;">
        <button class="notes-btn" data-index="${index}" title="Notes">
          <span class="notes-icon">📝</span>
          ${row.notes && row.notes.trim() ? '<span class="notes-indicator"></span>' : ''}
        </button>
      </td>
      <td class="row-actions">
        <button class="action-btn delete" data-index="${index}" title="Delete row">×</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("input, select").forEach((input) => {
    input.addEventListener("input", handleCellInput);
  });
  
  // Add event listeners for delete buttons
  tbody.querySelectorAll(".delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt(e.target.dataset.index);
      deleteRow(index);
    });
  });
  
  // Add event listeners for notes buttons
  tbody.querySelectorAll(".notes-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      openNotesDialog(index);
    });
  });
  
  // Set up drag and drop
  setupDragAndDrop(tbody);
  
  // Update column visibility based on settings
  updateColumnVisibility();
}

function updateColumnVisibility() {
  const thead = document.querySelector('thead tr');
  const rows = document.querySelectorAll('tbody tr');
  
  // Update header visibility
  thead.querySelectorAll('.tolerance-type-col').forEach(col => {
    col.style.display = settings.showToleranceType ? '' : 'none';
  });
  thead.querySelectorAll('.cpk-col').forEach(col => {
    col.style.display = settings.advancedStatisticalMode ? '' : 'none';
  });
  thead.querySelectorAll('.float-col').forEach(col => {
    col.style.display = settings.showFloatShifted ? '' : 'none';
  });
  
  // Update row cell visibility
  rows.forEach(row => {
    row.querySelectorAll('.tolerance-type-col').forEach(cell => {
      cell.style.display = settings.showToleranceType ? '' : 'none';
    });
    row.querySelectorAll('.cpk-col').forEach(cell => {
      cell.style.display = settings.advancedStatisticalMode ? '' : 'none';
    });
    row.querySelectorAll('.float-col').forEach(cell => {
      cell.style.display = settings.showFloatShifted ? '' : 'none';
    });
  });
}

export function refreshTable() {
  renderTable();
}

function setupDragAndDrop(tbody) {
  let draggedRow = null;
  let draggedIndex = null;

  tbody.querySelectorAll("tr").forEach((row, index) => {
    // Prevent dragging on inputs/buttons
    row.querySelectorAll("input, select, button").forEach((element) => {
      element.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
    });

    row.addEventListener("dragstart", (e) => {
      draggedRow = row;
      draggedIndex = parseInt(row.dataset.index);
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/html", row.innerHTML);
      // Set a custom drag image
      e.dataTransfer.setDragImage(row, 0, 0);
    });

    row.addEventListener("dragend", (e) => {
      row.classList.remove("dragging");
      tbody.querySelectorAll("tr").forEach((r) => {
        r.classList.remove("drag-over");
      });
      draggedRow = null;
      draggedIndex = null;
    });

    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      
      const afterElement = getDragAfterElement(tbody, e.clientY);
      const dragging = tbody.querySelector(".dragging");
      
      if (afterElement == null) {
        tbody.appendChild(dragging);
      } else {
        tbody.insertBefore(dragging, afterElement);
      }
      
      row.classList.add("drag-over");
    });

    row.addEventListener("dragleave", (e) => {
      row.classList.remove("drag-over");
    });

    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.classList.remove("drag-over");
      
      if (draggedRow && draggedIndex !== null) {
        // Find the new index based on the row's position after drag
        const allRows = Array.from(tbody.querySelectorAll("tr"));
        const newIndex = allRows.indexOf(draggedRow);
        
        if (draggedIndex !== newIndex) {
          // Move the item in the array
          const [movedItem] = stackData.splice(draggedIndex, 1);
          stackData.splice(newIndex, 0, movedItem);
          
          // Re-render and recalculate
          renderTable();
          calculateStack();
        }
      }
    });
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll("tr:not(.dragging)")];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function deleteRow(index) {
  if (stackData.length <= 1) {
    alert("Cannot delete the last row. At least one dimension is required.");
    return;
  }
  stackData.splice(index, 1);
  renderTable();
  calculateStack();
}


function handleCellInput(event) {
  const { index, key } = event.target.dataset;
  if (index === undefined || !key) return;

  if (event.target.type === "checkbox") {
    stackData[index][key] = event.target.checked;
  } else if (event.target.type === "number") {
    stackData[index][key] = parseFloat(event.target.value) || 0;
  } else {
    stackData[index][key] = event.target.value;
  }

  calculateStack();
}

let currentNotesIndex = null;

function setupNotesDialogs() {
  const dialog = document.getElementById("notes-dialog");
  const okBtn = document.getElementById("notes-ok-btn");
  
  if (!dialog || !okBtn) return;
  
  okBtn.addEventListener("click", () => {
    if (currentNotesIndex !== null) {
      const textarea = document.getElementById("notes-textarea");
      stackData[currentNotesIndex].notes = textarea.value;
      renderTable();
      dialog.close();
      currentNotesIndex = null;
    }
  });
  
  // Reset state when dialog is closed (via Cancel or clicking outside)
  dialog.addEventListener("close", () => {
    currentNotesIndex = null;
  });
}

function openNotesDialog(index) {
  const dialog = document.getElementById("notes-dialog");
  const textarea = document.getElementById("notes-textarea");
  
  if (!dialog || !textarea) return;
  
  currentNotesIndex = index;
  textarea.value = stackData[index].notes || "";
  dialog.showModal();
}

