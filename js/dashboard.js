import { stackData, settings, analysisSetup } from './data.js';

// Dashboard calculations and Pareto chart
export function setupDashboard() {
  calculateStack();
}

export function calculateStack() {
  // Ensure default acceptance criteria is set before calculations
  if (!analysisSetup.criticalRequirement.acceptanceCriteria) {
    if (settings.advancedStatisticalMode) {
      analysisSetup.criticalRequirement.acceptanceCriteria = "cpk-1.33";
    } else {
      analysisSetup.criticalRequirement.acceptanceCriteria = "worst-case";
    }
  }
  
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
    const cpk = row.cpk || 1;
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
  const statMeanElement = document.getElementById("stat-mean");
  statMeanElement.textContent = stackMean.toFixed(3);
  // Store sigma for distribution plot
  statMeanElement.setAttribute("data-sigma", stackSigma);
  
  // Show analysis setup values
  const nominalTarget = analysisSetup.criticalRequirement.nominalTarget;
  const lsl = analysisSetup.criticalRequirement.lsl;
  const usl = analysisSetup.criticalRequirement.usl;
  
  const nominalTargetCard = document.getElementById("stat-nominal-target-card");
  const lslCard = document.getElementById("stat-lsl-card");
  const uslCard = document.getElementById("stat-usl-card");
  const specToleranceCard = document.getElementById("stat-spec-tolerance-card");
  
  if (nominalTarget !== null && nominalTarget !== undefined) {
    document.getElementById("stat-nominal-target").textContent = nominalTarget.toFixed(3);
    if (nominalTargetCard) nominalTargetCard.style.display = '';
  } else {
    if (nominalTargetCard) nominalTargetCard.style.display = 'none';
  }
  
  if (lsl !== null && lsl !== undefined) {
    document.getElementById("stat-lsl").textContent = lsl.toFixed(3);
    if (lslCard) lslCard.style.display = '';
  } else {
    if (lslCard) lslCard.style.display = 'none';
  }
  
  if (usl !== null && usl !== undefined) {
    document.getElementById("stat-usl").textContent = usl.toFixed(3);
    if (uslCard) uslCard.style.display = '';
    
    // Calculate and display spec tolerance in +/- format
    if (nominalTarget !== null && nominalTarget !== undefined) {
      const specTolerance = (usl - nominalTarget) === (nominalTarget - lsl) ? (usl - nominalTarget) : null;
      if (specTolerance !== null) {
        document.getElementById("stat-spec-tolerance").textContent = `±${specTolerance.toFixed(3)}`;
        if (specToleranceCard) specToleranceCard.style.display = '';
      } else {
        // Asymmetric tolerance - show range
        const upperTol = usl - nominalTarget;
        const lowerTol = nominalTarget - lsl;
        document.getElementById("stat-spec-tolerance").textContent = `+${upperTol.toFixed(3)} / -${lowerTol.toFixed(3)}`;
        if (specToleranceCard) specToleranceCard.style.display = '';
      }
    } else {
      if (specToleranceCard) specToleranceCard.style.display = 'none';
    }
  } else {
    if (uslCard) uslCard.style.display = 'none';
    if (specToleranceCard) specToleranceCard.style.display = 'none';
  }
  
  // Color code stack mean based on nominal target and spec limits
  // Remove any existing color classes
  statMeanElement.classList.remove('stat-mean-yellow', 'stat-mean-red');
  
  // Check if stack mean is outside spec limits (highest priority - red)
  if (lsl !== null && lsl !== undefined && usl !== null && usl !== undefined) {
    if (stackMean < lsl || stackMean > usl) {
      statMeanElement.classList.add('stat-mean-red');
    }
    // Check if stack mean differs from nominal target (yellow, but only if not red)
    else if (nominalTarget !== null && nominalTarget !== undefined) {
      const tolerance = 0.0001; // Small tolerance for floating point comparison
      if (Math.abs(stackMean - nominalTarget) > tolerance) {
        statMeanElement.classList.add('stat-mean-yellow');
      }
    }
  }
  // If no spec limits, just check against nominal target
  else if (nominalTarget !== null && nominalTarget !== undefined) {
    const tolerance = 0.0001; // Small tolerance for floating point comparison
    if (Math.abs(stackMean - nominalTarget) > tolerance) {
      statMeanElement.classList.add('stat-mean-yellow');
    }
  }
  
  // Calculate achieved Cpk if in advanced mode and we have spec limits
  const showAdvanced = settings.advancedStatisticalMode;
  let achievedCpk = null;
  
  if (showAdvanced && lsl !== null && usl !== undefined && lsl !== undefined && usl !== null && stackSigma > 0) {
    // Cpk = min[(USL - μ) / (3σ), (μ - LSL) / (3σ)]
    const cpkUpper = (usl - stackMean) / (3 * stackSigma);
    const cpkLower = (stackMean - lsl) / (3 * stackSigma);
    achievedCpk = Math.min(cpkUpper, cpkLower);
    
    const achievedCpkCard = document.getElementById("stat-achieved-cpk-card");
    document.getElementById("stat-achieved-cpk").textContent = achievedCpk.toFixed(3);
    if (achievedCpkCard) achievedCpkCard.style.display = '';
    
    // Show Stack Mean - 3σ and Stack Mean + 3σ (minus first, then plus)
    const meanPlus3Sigma = stackMean + range3;
    const meanMinus3Sigma = stackMean - range3;
    document.getElementById("stat-mean-minus-3sigma").textContent = meanMinus3Sigma.toFixed(3);
    document.getElementById("stat-mean-plus-3sigma").textContent = meanPlus3Sigma.toFixed(3);
    document.getElementById("stat-mean-minus-3sigma-card").style.display = '';
    document.getElementById("stat-mean-plus-3sigma-card").style.display = '';
    
    // Update column assignments for advanced mode
    document.getElementById("stat-mean-minus-3sigma-card").setAttribute('data-column', '2');
    document.getElementById("stat-mean-plus-3sigma-card").setAttribute('data-column', '3');
  } else {
    const achievedCpkCard = document.getElementById("stat-achieved-cpk-card");
    if (achievedCpkCard) achievedCpkCard.style.display = 'none';
    document.getElementById("stat-mean-minus-3sigma-card").style.display = 'none';
    document.getElementById("stat-mean-plus-3sigma-card").style.display = 'none';
  }
  
  // Evaluate acceptance criteria (default based on mode if not set or invalid for current mode)
  let acceptanceCriteria = analysisSetup.criticalRequirement.acceptanceCriteria;
  const isAdvancedCriteria = acceptanceCriteria && acceptanceCriteria.startsWith("cpk-");
  const isBasicCriteria = acceptanceCriteria === "worst-case" || acceptanceCriteria === "rss";
  
  if (!acceptanceCriteria || (showAdvanced && !isAdvancedCriteria) || (!showAdvanced && !isBasicCriteria)) {
    // Set default based on current mode
    if (showAdvanced) {
      acceptanceCriteria = "cpk-1.33";
      analysisSetup.criticalRequirement.acceptanceCriteria = "cpk-1.33";
    } else {
      acceptanceCriteria = "worst-case";
      analysisSetup.criticalRequirement.acceptanceCriteria = "worst-case";
    }
  }
  const acceptanceCriteriaCard = document.getElementById("stat-acceptance-criteria-card");
  const acceptanceCriteriaValue = document.getElementById("stat-acceptance-criteria");
  const acceptanceCard = document.getElementById("stat-acceptance-card");
  const acceptanceIndicator = document.getElementById("acceptance-indicator");
  const acceptanceValue = document.getElementById("stat-acceptance");
  
  if (acceptanceCriteria) {
    // Display acceptance criteria text
    let criteriaText = "";
    if (showAdvanced) {
      if (acceptanceCriteria === "cpk-1") {
        criteriaText = "Must have a Cpk of atleast 1";
      } else if (acceptanceCriteria === "cpk-1.33") {
        criteriaText = "Must have a Cpk of atleast 1.33";
      } else if (acceptanceCriteria === "cpk-1.67") {
        criteriaText = "Must have a Cpk of atleast 1.67";
      } else if (acceptanceCriteria === "cpk-2") {
        criteriaText = "Must have a Cpk of atleast 2";
      }
    } else {
      if (acceptanceCriteria === "worst-case") {
        criteriaText = "Worst Case tolerance must be within spec limits";
      } else if (acceptanceCriteria === "rss") {
        criteriaText = "RSS tolerance must be within spec limits";
      }
    }
    
    acceptanceCriteriaValue.textContent = criteriaText;
    if (acceptanceCriteriaCard) acceptanceCriteriaCard.style.display = '';
    
    // Evaluate pass/fail
    let passed = false;
    
    if (showAdvanced) {
      // Advanced mode: Check Cpk requirements
      if (achievedCpk !== null) {
        if (acceptanceCriteria === "cpk-1") {
          passed = achievedCpk >= 1.0;
        } else if (acceptanceCriteria === "cpk-1.33") {
          passed = achievedCpk >= 1.33;
        } else if (acceptanceCriteria === "cpk-1.67") {
          passed = achievedCpk >= 1.67;
        } else if (acceptanceCriteria === "cpk-2") {
          passed = achievedCpk >= 2.0;
        }
      }
    } else {
      // Basic mode: Check if tolerance is within spec limits
      if (lsl !== null && usl !== null && lsl !== undefined && usl !== undefined) {
        if (acceptanceCriteria === "worst-case") {
          const worstCaseUpper = stackMean + worstCase;
          const worstCaseLower = stackMean - worstCase;
          passed = worstCaseUpper <= usl && worstCaseLower >= lsl;
        } else if (acceptanceCriteria === "rss") {
          const rssUpper = stackMean + rssValue;
          const rssLower = stackMean - rssValue;
          passed = rssUpper <= usl && rssLower >= lsl;
        }
      }
    }
    
    acceptanceValue.textContent = passed ? "PASS" : "FAIL";
    acceptanceIndicator.className = `acceptance-indicator ${passed ? 'pass' : 'fail'}`;
    if (acceptanceCard) acceptanceCard.style.display = '';
  } else {
    if (acceptanceCriteriaCard) acceptanceCriteriaCard.style.display = 'none';
    if (acceptanceCard) acceptanceCard.style.display = 'none';
  }
  
  // Show/hide basic vs advanced stats based on advanced statistical mode
  const worstCaseCard = document.getElementById("stat-worst-case-card");
  const rssCard = document.getElementById("stat-rss-card");
  const sigma3Card = document.getElementById("stat-3sigma-card");
  
  // Basic mode boxes for acceptance criteria
  const meanMinusWorstCaseCard = document.getElementById("stat-mean-minus-worst-case-card");
  const meanPlusWorstCaseCard = document.getElementById("stat-mean-plus-worst-case-card");
  const worstCaseTolCard = document.getElementById("stat-worst-case-tol-card");
  const meanMinusRssCard = document.getElementById("stat-mean-minus-rss-card");
  const meanPlusRssCard = document.getElementById("stat-mean-plus-rss-card");
  const rssTolCard = document.getElementById("stat-rss-tol-card");
  
  if (showAdvanced) {
    // Hide basic stats, show advanced stats
    if (worstCaseCard) worstCaseCard.style.display = 'none';
    if (rssCard) rssCard.style.display = 'none';
    if (meanMinusWorstCaseCard) meanMinusWorstCaseCard.style.display = 'none';
    if (meanPlusWorstCaseCard) meanPlusWorstCaseCard.style.display = 'none';
    if (worstCaseTolCard) worstCaseTolCard.style.display = 'none';
    if (meanMinusRssCard) meanMinusRssCard.style.display = 'none';
    if (meanPlusRssCard) meanPlusRssCard.style.display = 'none';
    if (rssTolCard) rssTolCard.style.display = 'none';
    
    document.getElementById("stat-3sigma").textContent = `±${range3.toFixed(3)}`;
    if (sigma3Card) sigma3Card.style.display = '';
  } else {
    // Basic mode: show/hide based on acceptance criteria
    const acceptanceCriteria = analysisSetup.criticalRequirement.acceptanceCriteria;
    
    if (sigma3Card) sigma3Card.style.display = 'none';
    
    if (acceptanceCriteria === "worst-case") {
      // Show worst case breakdown, hide RSS
      if (worstCaseCard) worstCaseCard.style.display = 'none';
      if (rssCard) rssCard.style.display = 'none';
      
      const meanMinusWorstCase = stackMean - worstCase;
      const meanPlusWorstCase = stackMean + worstCase;
      
      document.getElementById("stat-mean-minus-worst-case").textContent = meanMinusWorstCase.toFixed(3);
      document.getElementById("stat-mean-plus-worst-case").textContent = meanPlusWorstCase.toFixed(3);
      document.getElementById("stat-worst-case-tol").textContent = `±${worstCase.toFixed(3)}`;
      
      if (meanMinusWorstCaseCard) meanMinusWorstCaseCard.style.display = '';
      if (meanPlusWorstCaseCard) meanPlusWorstCaseCard.style.display = '';
      if (worstCaseTolCard) worstCaseTolCard.style.display = '';
      
      if (meanMinusRssCard) meanMinusRssCard.style.display = 'none';
      if (meanPlusRssCard) meanPlusRssCard.style.display = 'none';
      if (rssTolCard) rssTolCard.style.display = 'none';
    } else if (acceptanceCriteria === "rss") {
      // Show RSS breakdown, hide worst case
      if (worstCaseCard) worstCaseCard.style.display = 'none';
      if (rssCard) rssCard.style.display = 'none';
      
      const meanMinusRss = stackMean - rssValue;
      const meanPlusRss = stackMean + rssValue;
      
      document.getElementById("stat-mean-minus-rss").textContent = meanMinusRss.toFixed(3);
      document.getElementById("stat-mean-plus-rss").textContent = meanPlusRss.toFixed(3);
      document.getElementById("stat-rss-tol").textContent = `±${rssValue.toFixed(3)}`;
      
      if (meanMinusRssCard) meanMinusRssCard.style.display = '';
      if (meanPlusRssCard) meanPlusRssCard.style.display = '';
      if (rssTolCard) rssTolCard.style.display = '';
      
      if (meanMinusWorstCaseCard) meanMinusWorstCaseCard.style.display = 'none';
      if (meanPlusWorstCaseCard) meanPlusWorstCaseCard.style.display = 'none';
      if (worstCaseTolCard) worstCaseTolCard.style.display = 'none';
    } else {
      // No acceptance criteria: show legacy boxes
      document.getElementById("stat-worst-case").textContent = `±${worstCase.toFixed(3)}`;
      document.getElementById("stat-rss").textContent = `±${rssValue.toFixed(3)}`;
      if (worstCaseCard) worstCaseCard.style.display = '';
      if (rssCard) rssCard.style.display = '';
      
      if (meanMinusWorstCaseCard) meanMinusWorstCaseCard.style.display = 'none';
      if (meanPlusWorstCaseCard) meanPlusWorstCaseCard.style.display = 'none';
      if (worstCaseTolCard) worstCaseTolCard.style.display = 'none';
      if (meanMinusRssCard) meanMinusRssCard.style.display = 'none';
      if (meanPlusRssCard) meanPlusRssCard.style.display = 'none';
      if (rssTolCard) rssTolCard.style.display = 'none';
    }
  }

  renderPareto(stackVariance);
  console.log({ stackMean, worstCase, rss: rssValue, standardDeviation: stackSigma, processRange3Sigma: range3, range6Sigma: range6 });
  
  // Render normal distribution plot in advanced mode
  if (showAdvanced && stackSigma > 0) {
    // Hide all stat boxes in advanced mode - focus on the distribution plot
    const allStatCards = document.querySelectorAll('.stat-card');
    allStatCards.forEach(card => {
      card.style.display = 'none';
    });
    
    // Hide the dashboard container rows
    const statsRows = document.querySelectorAll('.stats-row');
    statsRows.forEach(row => {
      row.style.display = 'none';
    });
    
    renderDistributionPlot(stackMean, stackSigma, lsl, usl, nominalTarget);
    setupDriftToggle();
  } else {
    const plotContainer = document.getElementById("distribution-plot-container");
    if (plotContainer) plotContainer.style.display = "none";
    const statsContainer = document.getElementById("distribution-plot-stats");
    if (statsContainer) statsContainer.style.display = "none";
    
    // Show stat boxes in basic mode (they're shown/hidden individually based on acceptance criteria)
    const statsRows = document.querySelectorAll('.stats-row');
    statsRows.forEach(row => {
      row.style.display = 'flex';
    });
  }
  
  // Force a reflow to ensure all display changes are applied before measuring
  void document.body.offsetHeight;
  
  // Align box widths vertically (same column = same width)
  // Use requestAnimationFrame to ensure DOM is fully updated
  requestAnimationFrame(() => {
    setTimeout(() => {
      alignBoxWidths();
      // Update responsive scaling after width alignment
      updateDashboardScale();
    }, 10);
  });
}

function updateDashboardScale() {
  const container = document.querySelector('.dashboard-container');
  if (!container) return;
  
  // Temporarily remove transform and set width to auto to get natural size
  const savedTransform = container.style.transform;
  const savedWidth = container.style.width;
  container.style.transform = 'scale(1)';
  container.style.width = 'auto';
  
  // Force a reflow to get accurate measurements
  void container.offsetWidth;
  
  // Get the actual rendered width of the container (natural size)
  const naturalWidth = container.getBoundingClientRect().width;
  const viewportWidth = window.innerWidth;
  const padding = 32; // Account for page padding
  const availableWidth = viewportWidth - padding;
  
  if (naturalWidth > availableWidth) {
    const scale = availableWidth / naturalWidth;
    container.style.transform = `scale(${scale})`;
    container.style.width = `${naturalWidth}px`;
    // Adjust height to account for scaling (prevent layout shift)
    const naturalHeight = container.getBoundingClientRect().height;
    container.style.marginBottom = `${(1 - scale) * naturalHeight}px`;
  } else {
    container.style.transform = 'scale(1)';
    container.style.width = 'auto';
    container.style.marginBottom = '0';
  }
}

// Update scale on window resize
window.addEventListener('resize', () => {
  updateDashboardScale();
  // Redraw distribution plot on resize
  if (settings.advancedStatisticalMode) {
    const stackMean = parseFloat(document.getElementById("stat-mean").textContent) || 0;
    const stackSigma = parseFloat(document.getElementById("stat-mean").getAttribute("data-sigma")) || 0;
    const lsl = analysisSetup.criticalRequirement.lsl;
    const usl = analysisSetup.criticalRequirement.usl;
    const nominalTarget = analysisSetup.criticalRequirement.nominalTarget;
    if (stackSigma > 0) {
      renderDistributionPlot(stackMean, stackSigma, lsl, usl, nominalTarget);
    }
  }
});

// Setup process drift toggle event listener (called when plot is first rendered)
function setupDriftToggle() {
  const driftToggle = document.getElementById("process-drift-toggle");
  if (driftToggle && !driftToggle.hasAttribute("data-listener-attached")) {
    driftToggle.setAttribute("data-listener-attached", "true");
    driftToggle.addEventListener("change", () => {
      if (settings.advancedStatisticalMode) {
        const stackMean = parseFloat(document.getElementById("stat-mean").textContent) || 0;
        const stackSigma = parseFloat(document.getElementById("stat-mean").getAttribute("data-sigma")) || 0;
        const lsl = analysisSetup.criticalRequirement.lsl;
        const usl = analysisSetup.criticalRequirement.usl;
        const nominalTarget = analysisSetup.criticalRequirement.nominalTarget;
        if (stackSigma > 0) {
          renderDistributionPlot(stackMean, stackSigma, lsl, usl, nominalTarget);
        }
      }
    });
  }
}

function renderDistributionPlot(mean, sigma, lsl, usl, nominal) {
  const canvas = document.getElementById("distribution-plot");
  const container = document.getElementById("distribution-plot-container");
  
  if (!canvas || !container) return;
  
  // Show container and stats container
  container.style.display = "block";
  const statsContainer = document.getElementById("distribution-plot-stats");
  if (statsContainer) statsContainer.style.display = "block";
  
  // Check if process drift toggle is enabled
  const driftToggle = document.getElementById("process-drift-toggle");
  const applyDrift = driftToggle && driftToggle.checked;
  
  // Calculate shifted mean if drift is enabled
  let displayMean = mean;
  let shiftDirection = null;
  if (applyDrift && sigma > 0) {
    const shift = 1.5 * sigma;
    // Determine which spec limit is closer
    if (lsl !== null && lsl !== undefined && usl !== null && usl !== undefined) {
      const distanceToLSL = mean - lsl;
      const distanceToUSL = usl - mean;
      if (distanceToLSL < distanceToUSL) {
        displayMean = mean - shift;
        shiftDirection = 'LSL';
      } else {
        displayMean = mean + shift;
        shiftDirection = 'USL';
      }
    } else if (lsl !== null && lsl !== undefined) {
      displayMean = mean - shift;
      shiftDirection = 'LSL';
    } else if (usl !== null && usl !== undefined) {
      displayMean = mean + shift;
      shiftDirection = 'USL';
    }
  }
  
  // Calculate Cpk for display (will be calculated after we determine closest spec limit)
  let achievedCpk = null;
  let cpkNumerator = null;
  let cpkDenominator = null;
  let closestSpecLabel = null;
  
  // Get container dimensions for responsive sizing - make it larger in advanced mode
  const containerWidth = container.clientWidth || 800;
  const canvasWidth = Math.min(containerWidth - 32, 1200); // Larger width for advanced mode
  const extraTopSpace = 60; // Space for Cpk text above the graph
  const extraBottomSpace = 80; // Space for statistics below the graph
  const canvasHeight = 500 + extraTopSpace + extraBottomSpace; // Taller to accommodate text above and below
  
  // Get device pixel ratio for crisp rendering on high-DPI displays
  const dpr = window.devicePixelRatio || 1;
  
  // Set canvas internal resolution (scaled by device pixel ratio)
  canvas.width = canvasWidth * dpr;
  canvas.height = canvasHeight * dpr;
  
  // Set canvas display size (CSS pixels)
  canvas.style.width = canvasWidth + 'px';
  canvas.style.height = canvasHeight + 'px';
  
  // Scale the drawing context to match the device pixel ratio
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  
  // Clear canvas (using CSS pixel dimensions, not internal resolution)
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  // Calculate plot bounds - add extra space at top for Cpk text and bottom for statistics
  const padding = { top: 40 + extraTopSpace, right: 40, bottom: 60 + extraBottomSpace, left: 60 };
  const plotWidth = canvasWidth - padding.left - padding.right;
  const plotHeight = canvasHeight - padding.top - padding.bottom;
  
  // Determine x-axis range (show displayMean ± 4σ or include LSL/USL if wider)
  let xMin = displayMean - 4 * sigma;
  let xMax = displayMean + 4 * sigma;
  
  if (lsl !== null && lsl !== undefined) {
    xMin = Math.min(xMin, lsl - 0.5 * sigma);
  }
  if (usl !== null && usl !== undefined) {
    xMax = Math.max(xMax, usl + 0.5 * sigma);
  }
  if (nominal !== null && nominal !== undefined) {
    xMin = Math.min(xMin, nominal - 2 * sigma);
    xMax = Math.max(xMax, nominal + 2 * sigma);
  }
  
  // Add some padding
  const xRange = xMax - xMin;
  xMin -= xRange * 0.1;
  xMax += xRange * 0.1;
  
  // Scale functions
  const scaleX = (value) => padding.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  const scaleY = (value) => padding.top + plotHeight - (value * plotHeight);
  
  // Normal distribution PDF: f(x) = (1 / (σ * √(2π))) * e^(-0.5 * ((x - μ) / σ)²)
  const normalPDF = (x) => {
    const coefficient = 1 / (sigma * Math.sqrt(2 * Math.PI));
    const exponent = -0.5 * Math.pow((x - displayMean) / sigma, 2);
    return coefficient * Math.exp(exponent);
  };
  
  // Find maximum PDF value for scaling
  const maxPDF = normalPDF(displayMean);
  
  // Draw grid lines
  ctx.strokeStyle = "rgba(139, 148, 158, 0.2)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const x = padding.left + (i / 10) * plotWidth;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();
  }
  
  // Draw normal distribution curve
  ctx.strokeStyle = "#58a6ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const numPoints = 200;
  for (let i = 0; i <= numPoints; i++) {
    const x = xMin + (i / numPoints) * (xMax - xMin);
    const y = normalPDF(x) / maxPDF; // Normalize to 0-1
    const plotX = scaleX(x);
    const plotY = scaleY(y);
    
    if (i === 0) {
      ctx.moveTo(plotX, plotY);
    } else {
      ctx.lineTo(plotX, plotY);
    }
  }
  ctx.stroke();
  
  // Fill area under curve
  ctx.fillStyle = "rgba(88, 166, 255, 0.1)";
  ctx.lineTo(scaleX(xMax), padding.top + plotHeight);
  ctx.lineTo(scaleX(xMin), padding.top + plotHeight);
  ctx.closePath();
  ctx.fill();
  
  // Draw vertical lines
  const lineHeight = plotHeight;
  
  // Collect all markers with their positions for overlap detection
  const markers = [];
  
  // Stack Mean line (blue) - full height with label and value at top
  if (displayMean !== null && displayMean !== undefined) {
    const meanX = scaleX(displayMean);
    ctx.strokeStyle = "#58a6ff";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(meanX, padding.top);
    ctx.lineTo(meanX, padding.top + lineHeight);
    ctx.stroke();
    
    // Add "Mean" label and value at the top
    ctx.fillStyle = "#58a6ff";
    ctx.font = "12px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Mean", meanX, padding.top - 25);
    ctx.fillText(displayMean.toFixed(2), meanX, padding.top - 10);
  }
  
  // Mean - 3σ line (partial height, crosses x-axis)
  let meanMinus3SigmaX = null;
  let meanPlus3SigmaX = null;
  if (displayMean !== null && displayMean !== undefined && sigma > 0) {
    const meanMinus3Sigma = displayMean - 3 * sigma;
    meanMinus3SigmaX = scaleX(meanMinus3Sigma);
    ctx.strokeStyle = "#58a6ff";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    // Start from x-axis, go up a bit
    ctx.moveTo(meanMinus3SigmaX, padding.top + plotHeight);
    ctx.lineTo(meanMinus3SigmaX, padding.top + plotHeight - 40);
    ctx.stroke();
    
    markers.push({ x: meanMinus3SigmaX, label: "-3σ", value: meanMinus3Sigma.toFixed(2), color: "#58a6ff", isSpecLimit: false });
  }
  
  // Mean + 3σ line (partial height, crosses x-axis)
  if (displayMean !== null && displayMean !== undefined && sigma > 0) {
    const meanPlus3Sigma = displayMean + 3 * sigma;
    meanPlus3SigmaX = scaleX(meanPlus3Sigma);
    ctx.strokeStyle = "#58a6ff";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    // Start from x-axis, go up a bit
    ctx.moveTo(meanPlus3SigmaX, padding.top + plotHeight);
    ctx.lineTo(meanPlus3SigmaX, padding.top + plotHeight - 40);
    ctx.stroke();
    
    markers.push({ x: meanPlus3SigmaX, label: "+3σ", value: meanPlus3Sigma.toFixed(2), color: "#58a6ff", isSpecLimit: false });
  }
  
  // Draw horizontal double-sided arrow between mean and 3σ on the side closer to spec limit
  if (displayMean !== null && displayMean !== undefined && sigma > 0 && meanMinus3SigmaX !== null && meanPlus3SigmaX !== null) {
    const meanX = scaleX(displayMean);
    const distance3Sigma = 3 * sigma;
    const arrowY = padding.top + plotHeight - 60; // Position arrow above the partial lines
    
    // Determine which side is closer to a spec limit
    let drawOnLeft = false;
    if (lsl !== null && lsl !== undefined && usl !== null && usl !== undefined) {
      const distanceToLSL = Math.abs(mean - 3 * sigma - lsl);
      const distanceToUSL = Math.abs(mean + 3 * sigma - usl);
      drawOnLeft = distanceToLSL < distanceToUSL;
    } else if (lsl !== null && lsl !== undefined) {
      drawOnLeft = true; // Only LSL exists, draw on left
    } else if (usl !== null && usl !== undefined) {
      drawOnLeft = false; // Only USL exists, draw on right
    } else {
      drawOnLeft = false; // Default to right if no spec limits
    }
    
    let arrowStartX, arrowEndX;
    if (drawOnLeft) {
      arrowStartX = meanMinus3SigmaX;
      arrowEndX = meanX;
    } else {
      arrowStartX = meanX;
      arrowEndX = meanPlus3SigmaX;
    }
    
    // Draw horizontal line
    ctx.strokeStyle = "#58a6ff";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(arrowStartX, arrowY);
    ctx.lineTo(arrowEndX, arrowY);
    ctx.stroke();
    
    // Draw arrowhead on left side
    const arrowSize = 6;
    ctx.beginPath();
    ctx.moveTo(arrowStartX, arrowY);
    ctx.lineTo(arrowStartX + arrowSize, arrowY - arrowSize);
    ctx.lineTo(arrowStartX + arrowSize, arrowY + arrowSize);
    ctx.closePath();
    ctx.fillStyle = "#58a6ff";
    ctx.fill();
    
    // Draw arrowhead on right side
    ctx.beginPath();
    ctx.moveTo(arrowEndX, arrowY);
    ctx.lineTo(arrowEndX - arrowSize, arrowY - arrowSize);
    ctx.lineTo(arrowEndX - arrowSize, arrowY + arrowSize);
    ctx.closePath();
    ctx.fill();
    
    // Draw distance value above the arrow
    const midX = (arrowStartX + arrowEndX) / 2;
    ctx.fillStyle = "#58a6ff";
    ctx.font = "11px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(distance3Sigma.toFixed(2), midX, arrowY - 8);
  }
  
  // Draw horizontal double-sided arrow between mean and closest spec limit
  if (displayMean !== null && displayMean !== undefined) {
    const meanX = scaleX(displayMean);
    let closestSpecX = null;
    let closestSpecDistance = null;
    let closestSpecColor = null;
    
    // Determine which spec limit is closer to displayMean and calculate Cpk values
    if (lsl !== null && lsl !== undefined && usl !== null && usl !== undefined && sigma > 0) {
      const distanceToLSL = Math.abs(displayMean - lsl);
      const distanceToUSL = Math.abs(displayMean - usl);
      if (distanceToLSL < distanceToUSL) {
        closestSpecX = scaleX(lsl);
        closestSpecDistance = distanceToLSL;
        closestSpecColor = "#ff7b72";
        closestSpecLabel = "LSL";
        cpkNumerator = displayMean - lsl;
        cpkDenominator = 3 * sigma;
        achievedCpk = cpkNumerator / cpkDenominator;
      } else {
        closestSpecX = scaleX(usl);
        closestSpecDistance = distanceToUSL;
        closestSpecColor = "#ff7b72";
        closestSpecLabel = "USL";
        cpkNumerator = usl - displayMean;
        cpkDenominator = 3 * sigma;
        achievedCpk = cpkNumerator / cpkDenominator;
      }
    } else if (lsl !== null && lsl !== undefined && sigma > 0) {
      closestSpecX = scaleX(lsl);
      closestSpecDistance = Math.abs(displayMean - lsl);
      closestSpecColor = "#ff7b72";
      closestSpecLabel = "LSL";
      cpkNumerator = displayMean - lsl;
      cpkDenominator = 3 * sigma;
      achievedCpk = cpkNumerator / cpkDenominator;
    } else if (usl !== null && usl !== undefined && sigma > 0) {
      closestSpecX = scaleX(usl);
      closestSpecDistance = Math.abs(displayMean - usl);
      closestSpecColor = "#ff7b72";
      closestSpecLabel = "USL";
      cpkNumerator = usl - displayMean;
      cpkDenominator = 3 * sigma;
      achievedCpk = cpkNumerator / cpkDenominator;
    }
    
    if (closestSpecX !== null && closestSpecDistance !== null) {
      const arrowY = padding.top + plotHeight - 100; // Higher up than the 3σ arrow
      const arrowStartX = Math.min(meanX, closestSpecX);
      const arrowEndX = Math.max(meanX, closestSpecX);
      
      // Draw horizontal line
      ctx.strokeStyle = closestSpecColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(arrowStartX, arrowY);
      ctx.lineTo(arrowEndX, arrowY);
      ctx.stroke();
      
      // Draw arrowhead on left side
      const arrowSize = 6;
      ctx.beginPath();
      ctx.moveTo(arrowStartX, arrowY);
      ctx.lineTo(arrowStartX + arrowSize, arrowY - arrowSize);
      ctx.lineTo(arrowStartX + arrowSize, arrowY + arrowSize);
      ctx.closePath();
      ctx.fillStyle = closestSpecColor;
      ctx.fill();
      
      // Draw arrowhead on right side
      ctx.beginPath();
      ctx.moveTo(arrowEndX, arrowY);
      ctx.lineTo(arrowEndX - arrowSize, arrowY - arrowSize);
      ctx.lineTo(arrowEndX - arrowSize, arrowY + arrowSize);
      ctx.closePath();
      ctx.fill();
      
      // Draw distance value above the arrow
      const midX = (arrowStartX + arrowEndX) / 2;
      ctx.fillStyle = closestSpecColor;
      ctx.font = "11px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(closestSpecDistance.toFixed(2), midX, arrowY - 8);
    }
  }
  
  // LSL line (red) - draw line first
  if (lsl !== null && lsl !== undefined) {
    const lslX = scaleX(lsl);
    ctx.strokeStyle = "#ff7b72";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(lslX, padding.top);
    ctx.lineTo(lslX, padding.top + lineHeight);
    ctx.stroke();
    
    markers.push({ x: lslX, label: "LSL", value: lsl.toFixed(2), color: "#ff7b72", isSpecLimit: true });
  }
  
  // USL line (red) - draw line first
  if (usl !== null && usl !== undefined) {
    const uslX = scaleX(usl);
    ctx.strokeStyle = "#ff7b72";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(uslX, padding.top);
    ctx.lineTo(uslX, padding.top + lineHeight);
    ctx.stroke();
    
    markers.push({ x: uslX, label: "USL", value: usl.toFixed(2), color: "#ff7b72", isSpecLimit: true });
  }
  
  // Add Nominal to markers if it exists
  if (nominal !== null && nominal !== undefined && nominal >= xMin && nominal <= xMax) {
    const nominalX = scaleX(nominal);
    // Draw a vertical line for nominal (partial height, crosses x-axis)
    ctx.strokeStyle = "#f2cc60";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    // Start from x-axis, go up a bit
    ctx.moveTo(nominalX, padding.top + plotHeight);
    ctx.lineTo(nominalX, padding.top + plotHeight - 40);
    ctx.stroke();
    
    markers.push({ x: nominalX, label: "Nominal", value: nominal.toFixed(2), color: "#f2cc60", isSpecLimit: false });
  }
  
  // Sort markers by x position
  markers.sort((a, b) => a.x - b.x);
  
  // Draw x-axis
  ctx.strokeStyle = "#e6edf3";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + plotHeight);
  ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
  ctx.stroke();
  
  // Draw all marker labels underneath x-axis
  const labelYBase = padding.top + lineHeight + 20;
  const valueYBase = padding.top + lineHeight + 35;
  
  markers.forEach((marker) => {
    ctx.fillStyle = marker.color;
    ctx.font = "12px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(marker.label, marker.x, labelYBase);
    ctx.fillText(marker.value, marker.x, valueYBase);
  });
  
  // Draw y-axis label
  ctx.save();
  ctx.translate(15, padding.top + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#8b949e";
  ctx.font = "12px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Probability Density", 0, 0);
  ctx.restore();
  
  // Draw Cpk calculation above the graph (top right)
  if (achievedCpk !== null && cpkNumerator !== null && cpkDenominator !== null && closestSpecLabel !== null) {
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    
    // Calculate original Cpk (without drift) for color determination
    let originalCpk = null;
    if (lsl !== null && lsl !== undefined && usl !== null && usl !== undefined && sigma > 0) {
      const cpkUpper = (usl - mean) / (3 * sigma);
      const cpkLower = (mean - lsl) / (3 * sigma);
      originalCpk = Math.min(cpkUpper, cpkLower);
    } else if (lsl !== null && lsl !== undefined && sigma > 0) {
      originalCpk = (mean - lsl) / (3 * sigma);
    } else if (usl !== null && usl !== undefined && sigma > 0) {
      originalCpk = (usl - mean) / (3 * sigma);
    }
    
    // Get acceptance criteria and determine if original Cpk meets it (for color)
    const acceptanceCriteria = analysisSetup.criticalRequirement.acceptanceCriteria;
    let requiredCpk = null;
    let meetsCriteria = false;
    
    if (acceptanceCriteria && acceptanceCriteria.startsWith("cpk-") && originalCpk !== null) {
      const cpkValue = parseFloat(acceptanceCriteria.replace("cpk-", ""));
      requiredCpk = cpkValue;
      meetsCriteria = originalCpk >= cpkValue;
    }
    
    // Use the same values shown on the arrows
    const cpkValueText = achievedCpk.toFixed(3);
    // Only show parentheses when drift is NOT enabled
    const criteriaText = (!applyDrift && requiredCpk !== null) 
      ? (meetsCriteria ? ` (>${requiredCpk})` : ` (<${requiredCpk})`)
      : "";
    const cpkText = `Cpk = ${cpkNumerator.toFixed(2)} / ${cpkDenominator.toFixed(2)} = ${cpkValueText}${criteriaText}`;
    const cpkLabel = applyDrift ? `(Distance to ${closestSpecLabel} / 3σ, with 1.5σ drift)` : `(Distance to ${closestSpecLabel} / 3σ)`;
    
    // Position above the plot area, further up than the mean value
    const textX = padding.left + plotWidth - 15;
    const textY = padding.top - 50; // Above the mean value which is at padding.top - 25
    
    // Draw main Cpk formula text with color based on original (non-shifted) Cpk
    ctx.font = "bold 13px 'Inter', sans-serif";
    ctx.fillStyle = meetsCriteria ? "#3fb950" : "#ff7b72"; // Green if passes, red if fails (based on original Cpk)
    ctx.fillText(cpkText, textX, textY);
    
    // Draw explanation label below
    ctx.font = "10px 'Inter', sans-serif";
    ctx.fillStyle = "#8b949e";
    ctx.fillText(cpkLabel, textX, textY + 18);
  }
  
  // Calculate additional statistics
  let cp = null;
  let dpmo = null;
  let percentOutOfSpec = null;
  
  if (lsl !== null && lsl !== undefined && usl !== null && usl !== undefined && sigma > 0) {
    // Cp = (USL - LSL) / (6 * sigma)
    cp = (usl - lsl) / (6 * sigma);
    
    // Calculate percentage out of spec using normal distribution
    // P(X < LSL) + P(X > USL) = Φ((LSL - μ)/σ) + (1 - Φ((USL - μ)/σ))
    // Using error function approximation: Φ(z) = 0.5 * (1 + erf(z/√2))
    const erf = (x) => {
      // Approximation of error function
      const a1 =  0.254829592;
      const a2 = -0.284496736;
      const a3 =  1.421413741;
      const a4 = -1.453152027;
      const a5 =  1.061405429;
      const p  =  0.3275911;
      
      const sign = x < 0 ? -1 : 1;
      x = Math.abs(x);
      
      const t = 1.0 / (1.0 + p * x);
      const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
      
      return sign * y;
    };
    
    const phi = (z) => 0.5 * (1 + erf(z / Math.sqrt(2)));
    
    // Calculate percentage out of spec (without shift)
    const zLSL = (lsl - mean) / sigma;
    const zUSL = (usl - mean) / sigma;
    
    const probBelowLSL = phi(zLSL);
    const probAboveUSL = 1 - phi(zUSL);
    const probOutOfSpec = probBelowLSL + probAboveUSL;
    percentOutOfSpec = probOutOfSpec * 100;
    
    // DPMO calculation with 1.5 sigma shift (long-term process variation)
    // Shift mean by 1.5σ toward the worst-case spec limit
    const shift = 1.5 * sigma;
    let shiftedMean;
    
    // Determine which spec limit is closer (worst case)
    const distanceToLSL = mean - lsl;
    const distanceToUSL = usl - mean;
    
    if (distanceToLSL < distanceToUSL) {
      // LSL is closer, shift mean toward LSL (decrease mean)
      shiftedMean = mean - shift;
    } else {
      // USL is closer, shift mean toward USL (increase mean)
      shiftedMean = mean + shift;
    }
    
    // Calculate probability of defect with shifted mean
    const zLSL_shifted = (lsl - shiftedMean) / sigma;
    const zUSL_shifted = (usl - shiftedMean) / sigma;
    
    const probBelowLSL_shifted = phi(zLSL_shifted);
    const probAboveUSL_shifted = 1 - phi(zUSL_shifted);
    const probOutOfSpec_shifted = probBelowLSL_shifted + probAboveUSL_shifted;
    
    // DPMO = (Probability of defect with 1.5σ shift) * 1,000,000
    dpmo = probOutOfSpec_shifted * 1000000;
  }
  
  // Display statistics below the plot container (outside canvas)
  if (statsContainer) {
    statsContainer.innerHTML = "";
    
    // Calculate original Cpk (without drift) for color determination
    let originalCpk = null;
    if (lsl !== null && lsl !== undefined && usl !== null && usl !== undefined && sigma > 0) {
      const cpkUpper = (usl - mean) / (3 * sigma);
      const cpkLower = (mean - lsl) / (3 * sigma);
      originalCpk = Math.min(cpkUpper, cpkLower);
    } else if (lsl !== null && lsl !== undefined && sigma > 0) {
      originalCpk = (mean - lsl) / (3 * sigma);
    } else if (usl !== null && usl !== undefined && sigma > 0) {
      originalCpk = (usl - mean) / (3 * sigma);
    }
    
    // Get acceptance criteria and determine if original Cpk meets it (for color)
    const acceptanceCriteria = analysisSetup.criticalRequirement.acceptanceCriteria;
    let requiredCpk = null;
    let meetsCriteria = false;
    
    if (acceptanceCriteria && acceptanceCriteria.startsWith("cpk-") && originalCpk !== null) {
      const cpkValue = parseFloat(acceptanceCriteria.replace("cpk-", ""));
      requiredCpk = cpkValue;
      meetsCriteria = originalCpk >= cpkValue;
    }
    
    const stats = [];
    if (cp !== null) stats.push({ text: `Cp: ${cp.toFixed(3)}`, color: "var(--muted)", bold: false });
    if (achievedCpk !== null) {
      // Only show parentheses when drift is NOT enabled
      const criteriaText = (!applyDrift && requiredCpk !== null) 
        ? (meetsCriteria ? ` (>${requiredCpk})` : ` (<${requiredCpk})`)
        : "";
      stats.push({ 
        text: `Cpk: ${achievedCpk.toFixed(3)}${criteriaText}`, 
        color: meetsCriteria ? "var(--success)" : "var(--danger)", 
        bold: true 
      });
    }
    if (dpmo !== null) stats.push({ text: `DPMO: ${dpmo.toFixed(0)}`, color: "var(--muted)", bold: false });
    if (sigma > 0) stats.push({ text: `Standard Deviation: ${sigma.toFixed(3)}`, color: "var(--muted)", bold: false });
    if (lsl !== null && lsl !== undefined) stats.push({ text: `LSL: ${lsl.toFixed(2)}`, color: "var(--muted)", bold: false });
    if (usl !== null && usl !== undefined) stats.push({ text: `USL: ${usl.toFixed(2)}`, color: "var(--muted)", bold: false });
    if (nominal !== null && nominal !== undefined) stats.push({ text: `Nominal: ${nominal.toFixed(2)}`, color: "var(--muted)", bold: false });
    if (displayMean !== null && displayMean !== undefined) {
      const meanText = applyDrift 
        ? `Mean (with 1.5σ drift): ${displayMean.toFixed(2)}`
        : `Mean: ${displayMean.toFixed(2)}`;
      stats.push({ text: meanText, color: "var(--muted)", bold: false });
    }
    
    // Create a div for each statistic on its own row
    stats.forEach((stat) => {
      const statDiv = document.createElement("div");
      statDiv.textContent = stat.text;
      statDiv.style.color = stat.color;
      statDiv.style.fontSize = "0.875rem";
      statDiv.style.marginBottom = "0.25rem";
      if (stat.bold) {
        statDiv.style.fontWeight = "bold";
      }
      statsContainer.appendChild(statDiv);
    });
  }
}

function alignBoxWidths() {
  // Wait for layout to settle, then measure and align
  requestAnimationFrame(() => {
    setTimeout(() => {
    // First, align rows 1 and 2 columns
    for (let col = 1; col <= 4; col++) {
      const row1Box = document.querySelector(`.stats-row:first-of-type .stat-card[data-column="${col}"]`);
      const row2Boxes = document.querySelectorAll(`.stats-row:nth-of-type(2) .stat-card[data-column="${col}"]`);
      
      let maxWidth = 0;
      const boxesToResize = [];
      
      // Check row 1 box
      if (row1Box && row1Box.offsetParent !== null) {
        const oldWidth = row1Box.style.width;
        row1Box.style.width = 'auto';
        const width = row1Box.getBoundingClientRect().width;
        row1Box.style.width = oldWidth;
        maxWidth = Math.max(maxWidth, width);
        boxesToResize.push(row1Box);
      }
      
      // Check row 2 boxes
      row2Boxes.forEach(box => {
        if (box && box.offsetParent !== null) {
          const oldWidth = box.style.width;
          box.style.width = 'auto';
          const width = box.getBoundingClientRect().width;
          box.style.width = oldWidth;
          maxWidth = Math.max(maxWidth, width);
          boxesToResize.push(box);
        }
      });
      
      // Set all visible boxes in this column to the max width
      if (maxWidth > 0) {
        boxesToResize.forEach(box => {
          box.style.width = maxWidth + 'px';
        });
      }
    }
    
    // Force a reflow to ensure widths are applied before measuring combined widths
    void document.body.offsetHeight;
    
    // Now align row 3 boxes to combined widths from row 2
    const acceptanceCriteriaCard = document.getElementById("stat-acceptance-criteria-card");
    const achievedCpkCard = document.getElementById("stat-achieved-cpk-card");
    const acceptanceCard = document.getElementById("stat-acceptance-card");
    const showAdvanced = settings.advancedStatisticalMode;
    let acceptanceCriteria = analysisSetup.criticalRequirement.acceptanceCriteria;
    // Default based on mode if not set
    if (!acceptanceCriteria) {
      if (showAdvanced) {
        acceptanceCriteria = "cpk-1.33";
      } else {
        acceptanceCriteria = "worst-case";
      }
    }
    
    if (showAdvanced) {
      // Advanced mode: Acceptance Criteria = Stack Mean + Stack Mean - 3σ (combined width)
      if (acceptanceCriteriaCard && acceptanceCriteriaCard.offsetParent !== null) {
        const stackMeanBox = document.querySelector('.stats-row:nth-of-type(2) .stat-card[data-column="1"]');
        const stackMeanMinus3SigmaBox = document.querySelector('.stats-row:nth-of-type(2) .stat-card[data-column="2"]');
        
        let combinedWidth = 0;
        if (stackMeanBox && stackMeanBox.offsetParent !== null && stackMeanMinus3SigmaBox && stackMeanMinus3SigmaBox.offsetParent !== null) {
          const meanRect = stackMeanBox.getBoundingClientRect();
          const minus3SigmaRect = stackMeanMinus3SigmaBox.getBoundingClientRect();
          // Calculate from left edge of first box to right edge of second box
          combinedWidth = minus3SigmaRect.right - meanRect.left;
        } else if (stackMeanBox && stackMeanBox.offsetParent !== null) {
          combinedWidth = stackMeanBox.getBoundingClientRect().width;
        }
        
        if (combinedWidth > 0) {
          acceptanceCriteriaCard.style.width = combinedWidth + 'px';
        }
      }
      
      // Achieved Cpk = Stack Mean + 3σ width
      if (achievedCpkCard && achievedCpkCard.offsetParent !== null) {
        const stackMeanPlus3SigmaBox = document.querySelector('.stats-row:nth-of-type(2) .stat-card[data-column="3"]');
        
        if (stackMeanPlus3SigmaBox && stackMeanPlus3SigmaBox.offsetParent !== null) {
          const width = stackMeanPlus3SigmaBox.getBoundingClientRect().width;
          achievedCpkCard.style.width = width + 'px';
        }
      }
      
      // Pass/Fail = Process Range width and height
      if (acceptanceCard && acceptanceCard.offsetParent !== null) {
        const processRangeBox = document.querySelector('.stats-row:nth-of-type(2) .stat-card[data-column="4"]');
        
        if (processRangeBox && processRangeBox.offsetParent !== null) {
          const width = processRangeBox.getBoundingClientRect().width;
          const height = processRangeBox.getBoundingClientRect().height;
          acceptanceCard.style.width = width + 'px';
          acceptanceCard.style.height = height + 'px';
        }
      }
    } else {
      // Basic mode
      if (acceptanceCriteria === "worst-case" || acceptanceCriteria === "rss") {
        // Acceptance Criteria = Stack Mean (col 1) + Stack Mean - Worst Case/RSS (col 2) + Stack Mean + Worst Case/RSS (col 3) combined width
        if (acceptanceCriteriaCard && acceptanceCriteriaCard.offsetParent !== null) {
          const stackMeanBox = document.querySelector('.stats-row:nth-of-type(2) .stat-card[data-column="1"]');
          const col2Box = acceptanceCriteria === "worst-case" 
            ? document.getElementById("stat-mean-minus-worst-case-card")
            : document.getElementById("stat-mean-minus-rss-card");
          const col3Box = acceptanceCriteria === "worst-case"
            ? document.getElementById("stat-mean-plus-worst-case-card")
            : document.getElementById("stat-mean-plus-rss-card");
          
          let combinedWidth = 0;
          if (stackMeanBox && stackMeanBox.offsetParent !== null && 
              col2Box && col2Box.offsetParent !== null && 
              col3Box && col3Box.offsetParent !== null) {
            const meanRect = stackMeanBox.getBoundingClientRect();
            const col3Rect = col3Box.getBoundingClientRect();
            // Calculate from left edge of first box to right edge of third box
            combinedWidth = col3Rect.right - meanRect.left;
          } else if (stackMeanBox && stackMeanBox.offsetParent !== null && col2Box && col2Box.offsetParent !== null) {
            const meanRect = stackMeanBox.getBoundingClientRect();
            const col2Rect = col2Box.getBoundingClientRect();
            combinedWidth = col2Rect.right - meanRect.left;
          } else if (stackMeanBox && stackMeanBox.offsetParent !== null) {
            combinedWidth = stackMeanBox.getBoundingClientRect().width;
          }
          
          if (combinedWidth > 0) {
            acceptanceCriteriaCard.style.width = combinedWidth + 'px';
          }
        }
        
        // Pass/Fail = Worst Case Tol/RSS Tol (col 4) width, and same height as Acceptance Criteria
        if (acceptanceCard && acceptanceCard.offsetParent !== null) {
          const col4Box = acceptanceCriteria === "worst-case"
            ? document.getElementById("stat-worst-case-tol-card")
            : document.getElementById("stat-rss-tol-card");
          
          if (col4Box && col4Box.offsetParent !== null) {
            const rect = col4Box.getBoundingClientRect();
            acceptanceCard.style.width = rect.width + 'px';
            
            // Match height with Acceptance Criteria box
            if (acceptanceCriteriaCard && acceptanceCriteriaCard.offsetParent !== null) {
              const acceptanceRect = acceptanceCriteriaCard.getBoundingClientRect();
              acceptanceCard.style.height = acceptanceRect.height + 'px';
            } else {
              acceptanceCard.style.height = rect.height + 'px';
            }
          }
        }
      }
      
      // After width alignment, update scale
      updateDashboardScale();
    }
    }, 50);
  });
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
    const cpk = row.cpk || 1;
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

