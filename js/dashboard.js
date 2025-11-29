import { stackData } from './data.js';

// Dashboard calculations and Pareto chart
export function setupDashboard() {
  calculateStack();
}

export function calculateStack() {
  let stackMean = 0;
  let stackVariance = 0;

  stackData.forEach((row) => {
    const { nominalAdj, tolAdj } = parseAsymmetry(row.tol, row.nominal);
    const cpk = row.cpk || 1.33;
    const rowSigma = tolAdj / (3 * cpk || 1);
    stackMean += nominalAdj;
    stackVariance += rowSigma ** 2;
  });

  const stackSigma = Math.sqrt(stackVariance);
  const range3 = `${(stackMean - 3 * stackSigma).toFixed(3)} / ${(stackMean + 3 * stackSigma).toFixed(3)}`;
  const range6 = `${(stackMean - 6 * stackSigma).toFixed(3)} / ${(stackMean + 6 * stackSigma).toFixed(3)}`;

  document.getElementById("stat-mean").textContent = stackMean.toFixed(3);
  document.getElementById("stat-sigma").textContent = stackSigma.toFixed(3);
  document.getElementById("stat-3sigma").textContent = range3;
  document.getElementById("stat-6sigma").textContent = range6;

  renderPareto(stackVariance);
  console.log({ stackMean, stackSigma, range3, range6 });
}

export function parseAsymmetry(tol, nominal) {
  if (typeof tol === "number") {
    return {
      nominalAdj: nominal,
      tolAdj: Math.abs(tol),
    };
  }

  if (!tol) {
    return { nominalAdj: nominal, tolAdj: 0 };
  }

  const pattern = /([-+]?\d*\.?\d+)\s*([+-]\d*\.?\d+)\/([+-]\d*\.?\d+)/;
  const match = String(tol).trim().match(pattern);

  if (match) {
    const base = parseFloat(match[1]);
    const plus = parseFloat(match[2]);
    const minus = parseFloat(match[3]);
    const nominalAdj = base + (plus + minus) / 2;
    const tolAdj = Math.abs(plus) + Math.abs(minus);
    return { nominalAdj, tolAdj };
  }

  const numeric = parseFloat(tol);
  return {
    nominalAdj: nominal,
    tolAdj: isNaN(numeric) ? 0 : Math.abs(numeric),
  };
}

function renderPareto(totalVariance) {
  const container = document.getElementById("pareto-chart");
  container.innerHTML = "";

  if (!totalVariance || totalVariance === 0) {
    container.innerHTML = `<p class="bar-label">Add stack data to view Pareto contributions.</p>`;
    return;
  }

  const contributions = stackData.map((row) => {
    const { tolAdj } = parseAsymmetry(row.tol, row.nominal);
    const cpk = row.cpk || 1.33;
    const rowSigma = tolAdj / (3 * cpk || 1);
    const variance = rowSigma ** 2;
    return {
      description: row.description || "Unnamed",
      percent: (variance / totalVariance) * 100 || 0,
    };
  });

  const sorted = contributions.sort((a, b) => b.percent - a.percent);
  const barsWrap = document.createElement("div");
  barsWrap.className = "pareto-bars";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.classList.add("cumulative-line");

  let cumulative = 0;
  const points = [];

  sorted.forEach((entry, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "bar-container";

    const bar = document.createElement("div");
    bar.className = "bar";

    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.height = `${Math.min(entry.percent, 100)}%`;
    fill.style.background = entry.percent > 40 ? "var(--danger)" : "var(--accent)";

    const valueLabel = document.createElement("div");
    valueLabel.className = "bar-label";
    valueLabel.textContent = `${entry.description} · ${entry.percent.toFixed(1)}%`;

    bar.appendChild(fill);
    wrapper.append(bar, valueLabel);
    barsWrap.appendChild(wrapper);

    cumulative += entry.percent;
    const x = sorted.length === 1 ? 100 : (index / (sorted.length - 1)) * 100;
    const y = Math.max(0, 100 - Math.min(cumulative, 100));
    points.push(`${x},${y}`);

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", 1.5);
    svg.appendChild(dot);
  });

  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("points", points.join(" "));
  svg.insertBefore(polyline, svg.firstChild);

  container.append(barsWrap, svg);
}

