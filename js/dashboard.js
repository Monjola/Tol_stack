import { stackData, settings } from './data.js';

// Dashboard calculations and Pareto chart
export function setupDashboard() {
  calculateStack();
}

export function calculateStack() {
  let stackMean = 0;
  let worstCase = 0;
  let rss = 0;
  let stackVariance = 0;

  stackData.forEach((row) => {
    const { nominalAdj, tolAdj } = parseAsymmetry(row.tol, row.nominal);
    const direction = row.direction === "-" ? -1 : 1; // Multiply by -1 if direction is "-"
    stackMean += nominalAdj * direction;
    worstCase += tolAdj; // Worst case is sum of all tolerances (always positive)
    
    // RSS (Root Sum Square)
    rss += tolAdj ** 2;
    
    // For advanced stats with Cpk
    const cpk = row.cpk || 1.33;
    const rowSigma = tolAdj / (3 * cpk || 1);
    stackVariance += rowSigma ** 2;
  });

  const rssValue = Math.sqrt(rss);
  const stackSigma = Math.sqrt(stackVariance);
  const range3 = 3 * stackSigma;
  const range4 = 4 * stackSigma;
  const range5 = 5 * stackSigma;
  const range6 = 6 * stackSigma;

  // Always show stack mean
  document.getElementById("stat-mean").textContent = stackMean.toFixed(3);
  
  // Show/hide basic vs advanced stats based on advanced statistical mode
  const showAdvanced = settings.advancedStatisticalMode;
  const worstCaseCard = document.getElementById("stat-worst-case-card");
  const rssCard = document.getElementById("stat-rss-card");
  const sigmaCard = document.getElementById("stat-sigma-card");
  const sigma3Card = document.getElementById("stat-3sigma-card");
  const sigma4Card = document.getElementById("stat-4sigma-card");
  const sigma5Card = document.getElementById("stat-5sigma-card");
  const sigma6Card = document.getElementById("stat-6sigma-card");
  
  if (showAdvanced) {
    // Hide basic stats, show advanced stats
    if (worstCaseCard) worstCaseCard.style.display = 'none';
    if (rssCard) rssCard.style.display = 'none';
    
    document.getElementById("stat-sigma").textContent = `±${stackSigma.toFixed(3)}`;
    document.getElementById("stat-3sigma").textContent = `±${range3.toFixed(3)}`;
    document.getElementById("stat-4sigma").textContent = `±${range4.toFixed(3)}`;
    document.getElementById("stat-5sigma").textContent = `±${range5.toFixed(3)}`;
    document.getElementById("stat-6sigma").textContent = `±${range6.toFixed(3)}`;
    if (sigmaCard) sigmaCard.style.display = '';
    if (sigma3Card) sigma3Card.style.display = '';
    if (sigma4Card) sigma4Card.style.display = '';
    if (sigma5Card) sigma5Card.style.display = '';
    if (sigma6Card) sigma6Card.style.display = '';
  } else {
    // Show basic stats, hide advanced stats
    document.getElementById("stat-worst-case").textContent = `±${worstCase.toFixed(3)}`;
    document.getElementById("stat-rss").textContent = `±${rssValue.toFixed(3)}`;
    if (worstCaseCard) worstCaseCard.style.display = '';
    if (rssCard) rssCard.style.display = '';
    
    if (sigmaCard) sigmaCard.style.display = 'none';
    if (sigma3Card) sigma3Card.style.display = 'none';
    if (sigma4Card) sigma4Card.style.display = 'none';
    if (sigma5Card) sigma5Card.style.display = 'none';
    if (sigma6Card) sigma6Card.style.display = 'none';
  }

  renderPareto(stackVariance);
  console.log({ stackMean, worstCase, rss: rssValue, standardDeviation: stackSigma, processRange3Sigma: range3, range6Sigma: range6 });
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
    renderLegend(); // Still render legend even with no data
    return;
  }

  const contributions = stackData.map((row, originalIndex) => {
    const { tolAdj } = parseAsymmetry(row.tol, row.nominal);
    const cpk = row.cpk || 1.33;
    const rowSigma = tolAdj / (3 * cpk || 1);
    const variance = rowSigma ** 2;
    return {
      description: row.description || "Unnamed",
      percent: (variance / totalVariance) * 100 || 0,
      originalIndex: originalIndex, // Track original position for item number
    };
  });

  const sorted = contributions.sort((a, b) => b.percent - a.percent);
  
  // Create Y-axis container
  const chartWrapper = document.createElement("div");
  chartWrapper.className = "pareto-chart-wrapper";
  
  const yAxis = document.createElement("div");
  yAxis.className = "pareto-y-axis";
  
  // Create Y-axis labels (0% to 100% in 20% increments)
  for (let i = 100; i >= 0; i -= 20) {
    const label = document.createElement("div");
    label.className = "y-axis-label";
    label.textContent = `${i}%`;
    yAxis.appendChild(label);
  }
  
  const barsWrap = document.createElement("div");
  barsWrap.className = "pareto-bars";

  const labelsWrap = document.createElement("div");
  labelsWrap.className = "pareto-labels";

  let cumulative = 0;
  const barHeight = 220; // Match CSS height

  sorted.forEach((entry, index) => {
    const barContainer = document.createElement("div");
    barContainer.className = "bar-container";

    const bar = document.createElement("div");
    bar.className = "bar";

    const fill = document.createElement("div");
    fill.className = "bar-fill";
    const percentHeight = Math.min(entry.percent, 100);
    // Calculate actual pixel height (bar container is 220px tall)
    const pixelHeight = (percentHeight / 100) * 220;
    fill.style.height = `${pixelHeight}px`;
    fill.style.minHeight = percentHeight > 0 ? '4px' : '0';
    
    // Color based on cumulative contribution: red for vital few (<=80%), blue for trivial many (>80%)
    cumulative += entry.percent;
    const isVitalFew = cumulative <= 80;
    fill.style.background = isVitalFew ? "var(--danger)" : "var(--accent)";

    bar.appendChild(fill);
    barContainer.appendChild(bar);
    barsWrap.appendChild(barContainer);

    // Create label outside the chart wrapper
    const valueLabel = document.createElement("div");
    valueLabel.className = "bar-label";
    valueLabel.dataset.fullText = `${entry.description} · ${entry.percent.toFixed(1)}%`;
    valueLabel.dataset.itemNumber = `${entry.originalIndex + 1}`; // Use original table position
    valueLabel.dataset.percent = entry.percent.toFixed(1);
    valueLabel.textContent = valueLabel.dataset.fullText;
    labelsWrap.appendChild(valueLabel);
  });
  
  // Reset cumulative for line calculation
  cumulative = 0;
  
  chartWrapper.appendChild(yAxis);
  chartWrapper.appendChild(barsWrap);

  // Create a wrapper for labels that matches the chart wrapper structure
  const labelsWrapper = document.createElement("div");
  labelsWrapper.className = "pareto-labels-wrapper";
  const labelsSpacer = document.createElement("div");
  labelsSpacer.className = "pareto-labels-spacer";
  labelsWrapper.appendChild(labelsSpacer);
  labelsWrapper.appendChild(labelsWrap);

  // Append chart wrapper and labels
  container.appendChild(chartWrapper);
  container.appendChild(labelsWrapper);

  // Use requestAnimationFrame to ensure layout is complete
  requestAnimationFrame(() => {
    const barsWidth = barsWrap.offsetWidth;
    const barContainers = barsWrap.querySelectorAll('.bar-container');
    const points = [];
    cumulative = 0;

    sorted.forEach((entry, index) => {
      cumulative += entry.percent;
      const barContainer = barContainers[index];
      const barRect = barContainer.getBoundingClientRect();
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

    barsWrap.appendChild(svg);
  });
  
  // Create and render legend
  renderLegend();
  
  // Set up responsive label switching
  setupResponsiveLabels(container, labelsWrap);
  
  // Function to update cumulative line on resize
  const updateCumulativeLine = () => {
    const existingSvg = barsWrap.querySelector('.cumulative-line');
    if (existingSvg) {
      existingSvg.remove();
    }
    
    requestAnimationFrame(() => {
      const barsWidth = barsWrap.offsetWidth;
      const barContainers = barsWrap.querySelectorAll('.bar-container');
      const points = [];
      let cumulative = 0;

      sorted.forEach((entry, index) => {
        cumulative += entry.percent;
        const barContainer = barContainers[index];
        const barRect = barContainer.getBoundingClientRect();
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

      barsWrap.appendChild(svg);
    });
  };
  
  // Update cumulative line on window resize (debounced)
  let resizeTimeout;
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateCumulativeLine();
      updateLabelDisplay(container, labelsWrap);
    }, 100);
  };
  
  window.addEventListener('resize', handleResize);
}

function setupResponsiveLabels(container, labelsWrap) {
  updateLabelDisplay(container, labelsWrap);
}

function updateLabelDisplay(container, labelsWrap) {
  // Labels will be rotated via CSS media query, no need to change text
  // This function is kept for potential future use
}

function renderLegend() {
  const legendContainer = document.querySelector('.pareto-legend');
  if (!legendContainer) return;
  
  legendContainer.innerHTML = '';
  
  const legend = document.createElement('div');
  legend.className = 'legend-items';
  
  // Cumulative line legend item
  const lineItem = document.createElement('div');
  lineItem.className = 'legend-item';
  const lineIcon = document.createElement('div');
  lineIcon.className = 'legend-icon legend-line';
  const lineLabel = document.createElement('span');
  lineLabel.textContent = 'Cumulative Contribution';
  lineItem.appendChild(lineIcon);
  lineItem.appendChild(lineLabel);
  
  // Vital few legend item
  const vitalItem = document.createElement('div');
  vitalItem.className = 'legend-item';
  const vitalIcon = document.createElement('div');
  vitalIcon.className = 'legend-icon legend-bar';
  vitalIcon.style.background = 'var(--danger)';
  const vitalLabel = document.createElement('span');
  vitalLabel.textContent = 'Vital Few (≤80%)';
  vitalItem.appendChild(vitalIcon);
  vitalItem.appendChild(vitalLabel);
  
  // Trivial many legend item
  const trivialItem = document.createElement('div');
  trivialItem.className = 'legend-item';
  const trivialIcon = document.createElement('div');
  trivialIcon.className = 'legend-icon legend-bar';
  trivialIcon.style.background = 'var(--accent)';
  const trivialLabel = document.createElement('span');
  trivialLabel.textContent = 'Trivial Many (>80%)';
  trivialItem.appendChild(trivialIcon);
  trivialItem.appendChild(trivialLabel);
  
  legend.appendChild(lineItem);
  legend.appendChild(vitalItem);
  legend.appendChild(trivialItem);
  legendContainer.appendChild(legend);
}

