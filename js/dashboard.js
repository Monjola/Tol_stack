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

  let cumulative = 0;
  const barHeight = 220; // Match CSS height

  sorted.forEach((entry, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "bar-container";

    const bar = document.createElement("div");
    bar.className = "bar";

    const fill = document.createElement("div");
    fill.className = "bar-fill";
    const percentHeight = Math.min(entry.percent, 100);
    // Calculate actual pixel height (bar container is 220px tall)
    const pixelHeight = (percentHeight / 100) * 220;
    fill.style.height = `${pixelHeight}px`;
    fill.style.minHeight = percentHeight > 0 ? '4px' : '0';
    fill.style.background = entry.percent > 40 ? "var(--danger)" : "var(--accent)";

    const valueLabel = document.createElement("div");
    valueLabel.className = "bar-label";
    valueLabel.textContent = `${entry.description} · ${entry.percent.toFixed(1)}%`;

    bar.appendChild(fill);
    wrapper.append(bar, valueLabel);
    barsWrap.appendChild(wrapper);
  });

  // Append bars first so we can measure their actual positions
  container.appendChild(barsWrap);

  // Use requestAnimationFrame to ensure layout is complete
  requestAnimationFrame(() => {
    const barsWidth = barsWrap.offsetWidth;
    const barContainers = barsWrap.querySelectorAll('.bar-container');
    const points = [];
    cumulative = 0;

    sorted.forEach((entry, index) => {
      cumulative += entry.percent;
      const barContainer = barContainers[index];
      const barRect = barContainer.querySelector('.bar').getBoundingClientRect();
      const barsRect = barsWrap.getBoundingClientRect();
      const x = barRect.left - barsRect.left + (barRect.width / 2);
      const y = barHeight - (cumulative / 100 * barHeight);
      points.push(`${x},${y}`);
    });

    // Create SVG with actual dimensions
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("cumulative-line");
    svg.setAttribute("width", barsWidth);
    svg.setAttribute("height", barHeight);
    svg.setAttribute("viewBox", `0 0 ${barsWidth} ${barHeight}`);

    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", points.join(" "));
    polyline.setAttribute("stroke-width", "1.5");
    svg.appendChild(polyline);

    // Add dots
    points.forEach((point) => {
      const [x, y] = point.split(",").map(Number);
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", x);
      dot.setAttribute("cy", y);
      dot.setAttribute("r", "3");
      svg.appendChild(dot);
    });

    container.appendChild(svg);
  });
}

