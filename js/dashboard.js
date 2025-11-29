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
  
  const containerWidth = container.scrollWidth;
  const viewportWidth = window.innerWidth;
  const padding = 32; // Account for page padding
  
  if (containerWidth > viewportWidth - padding) {
    const scale = (viewportWidth - padding) / containerWidth;
    container.style.transform = `scale(${scale})`;
    container.style.width = `${containerWidth}px`;
    // Adjust height to account for scaling
    container.style.marginBottom = `${(1 - scale) * container.scrollHeight}px`;
  } else {
    container.style.transform = 'scale(1)';
    container.style.width = '100%';
    container.style.marginBottom = '0';
  }
}

// Update scale on window resize
window.addEventListener('resize', () => {
  updateDashboardScale();
});

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

