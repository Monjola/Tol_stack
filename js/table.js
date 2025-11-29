import { stackData } from './data.js';
import { calculateStack } from './dashboard.js';

// Table management functions
export function setupTable() {
  document.getElementById("add-row").addEventListener("click", () => {
    stackData.push({
      description: "",
      nominal: 0,
      tol: 0,
      tolType: "Linear",
      cpk: 1.33,
      floatShifted: false,
    });
    renderTable();
  });
  renderTable();
}

export function renderTable() {
  const tbody = document.getElementById("stack-body");
  tbody.innerHTML = "";

  stackData.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" data-key="description" data-index="${index}" value="${row.description ?? ""}"></td>
      <td><input type="number" step="0.001" data-key="nominal" data-index="${index}" value="${row.nominal ?? 0}"></td>
      <td>
        <select data-key="tolType" data-index="${index}">
          <option ${row.tolType === "Linear" ? "selected" : ""}>Linear</option>
          <option ${row.tolType === "GD&T" ? "selected" : ""}>GD&T</option>
          <option ${row.tolType === "Float" ? "selected" : ""}>Float</option>
        </select>
      </td>
      <td><input type="text" data-key="tol" data-index="${index}" value="${row.tol ?? 0}"></td>
      <td><input type="number" step="0.01" data-key="cpk" data-index="${index}" value="${row.cpk ?? 1.33}"></td>
      <td style="text-align:center;"><input type="checkbox" data-key="floatShifted" data-index="${index}" ${row.floatShifted ? "checked" : ""}></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("input, select").forEach((input) => {
    input.addEventListener("input", handleCellInput);
  });
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

