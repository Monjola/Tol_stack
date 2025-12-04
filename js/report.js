import { analysisSetup, stackData, settings } from './data.js';

// Report generation functionality
export function setupReport() {
  const generateReportBtn = document.getElementById("generate-report-btn");
  
  if (!generateReportBtn) return;
  
  generateReportBtn.addEventListener("click", async () => {
    try {
      // Create PDF with Analysis Setup data
      const pdfBlob = await createReportPDF();
      
      // Use File System Access API if available (Chrome, Edge)
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: 'tolerance-analysis-report.pdf',
            types: [{
              description: 'PDF files',
              accept: { 'application/pdf': ['.pdf'] }
            }]
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(pdfBlob);
          await writable.close();
        } catch (err) {
          // User cancelled or error occurred
          if (err.name !== 'AbortError') {
            console.error('Error saving file:', err);
            // Fall back to download
            downloadPDF(pdfBlob, 'tolerance-analysis-report.pdf');
          }
        }
      } else {
        // Fallback for browsers without File System Access API
        downloadPDF(pdfBlob, 'tolerance-analysis-report.pdf');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  });
}

// Create PDF report with Analysis Setup data
async function createReportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;
  const contentWidth = pageWidth - (margin * 2);
  
  // Ocado Technology color scheme
  const ocadoBlue = [0, 102, 153]; // Vibrant cerulean blue
  const ocadoDarkBlue = [0, 51, 102]; // Darker blue
  const ocadoNavy = [0, 34, 68]; // Dark teal/navy
  const ocadoDarkGrey = [51, 51, 51]; // Dark grey
  const ocadoLightGrey = [240, 240, 240]; // Light grey for backgrounds
  
  // Get Analysis Setup data
  const metadata = analysisSetup.metadata || {};
  const criticalRequirement = analysisSetup.criticalRequirement || {};
  const assumptionsContext = analysisSetup.assumptionsContext || {};
  
  // First page - Title and Metadata
  let yPos = margin;
  
  // Analysis Title - Centered, large lettering with Ocado blue
  const title = metadata.title || 'Tolerance Analysis Report';
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  const titleWidth = doc.getTextWidth(title);
  doc.setTextColor(...ocadoNavy);
  doc.text(title, (pageWidth - titleWidth) / 2, yPos + 20);
  yPos += 50;
  
  // Divider line in Ocado blue
  doc.setDrawColor(...ocadoBlue);
  doc.setLineWidth(1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 20;
  
  // Metadata subheadings with Ocado styling - all fields stacked vertically
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ocadoDarkGrey);
  
  const metadataItems = [
    { label: 'Project', value: metadata.project || '—' },
    { label: 'Part/Assembly Nr', value: metadata.partNr || '—' },
    { label: 'Analyst Name/ID', value: metadata.analyst || '—' },
    { label: 'Creation Date', value: metadata.creationDate || '—' }
  ];
  
  // Draw metadata items stacked vertically
  let metadataY = yPos;
  metadataItems.forEach((item) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ocadoDarkBlue);
    doc.text(item.label + ':', margin, metadataY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ocadoDarkGrey);
    const valueLines = doc.splitTextToSize(item.value, contentWidth - 60);
    doc.text(valueLines, margin + 50, metadataY);
    // Move to next line, accounting for multi-line values
    metadataY += Math.max(12, valueLines.length * 5 + 2);
  });
  
  yPos = metadataY + 10;
  
  // Table at bottom of first page with Ocado styling
  const tableStartY = yPos;
  const baseRowHeight = 10;
  const lineHeight = 5; // Approximate line height for text
  
  // Calculate left column width based on longest label text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const labels = ['Critical Feature', 'Nominal Target', 'LSL', 'USL', 'Acceptance Criteria', 'Assumptions Context'];
  let maxLabelWidth = 0;
  labels.forEach(label => {
    const width = doc.getTextWidth(label);
    if (width > maxLabelWidth) {
      maxLabelWidth = width;
    }
  });
  // Add padding (8px on each side = 16px total)
  const tableCol1Width = maxLabelWidth + 16;
  const tableCol2Width = contentWidth - tableCol1Width;
  
  // Table header with Ocado blue background - rounded top corners only
  // Header width matches table width exactly
  doc.setFillColor(...ocadoBlue);
  const radius = 2;
  const x = margin;
  const y = tableStartY;
  const w = contentWidth; // Match table width exactly
  const h = baseRowHeight;
  
  // Draw rectangle with rounded top corners only
  // Method: Draw rounded rect, then cover bottom corners with squares
  doc.roundedRect(x, y, w, h, radius, radius, 'F');
  
  // Cover the bottom rounded corners with blue squares to make them square
  // This effectively removes the bottom corner rounding
  doc.setFillColor(...ocadoBlue);
  // Bottom-left square corner (overwrites the rounded corner)
  doc.rect(x, y + h - radius, radius, radius, 'F');
  // Bottom-right square corner (overwrites the rounded corner)
  doc.rect(x + w - radius, y + h - radius, radius, radius, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255); // White text on blue
  doc.text('Section', margin + 8, tableStartY + 7);
  doc.text('Details', margin + tableCol1Width + 8, tableStartY + 7);
  
  // Critical Requirement section
  let currentY = tableStartY + baseRowHeight;
  
  // Helper function to draw table row with dynamic height
  const borderWidth = 0.5;
  const halfBorder = borderWidth / 2;
  const drawTableRow = (label, value, isBold = false) => {
    // Calculate text height for both label and value
    doc.setFontSize(9);
    const labelLines = doc.splitTextToSize(label, tableCol1Width - 12);
    const valueLines = doc.splitTextToSize(value, tableCol2Width - 12);
    const labelHeight = labelLines.length * lineHeight;
    const valueHeight = valueLines.length * lineHeight;
    const rowHeight = Math.max(baseRowHeight, Math.max(labelHeight, valueHeight) + 4);
    
    // Background for label column (light grey) - fill entire cell area
    doc.setFillColor(...ocadoLightGrey);
    doc.rect(margin, currentY, tableCol1Width, rowHeight, 'F');
    
    // Border in Ocado blue - draw borders inward so outer edge aligns with header
    // Position lines so they grow inward from the edges
    doc.setDrawColor(...ocadoBlue);
    doc.setLineWidth(borderWidth);
    // Left border (at outer edge, grows inward)
    doc.line(margin + halfBorder, currentY, margin + halfBorder, currentY + rowHeight);
    // Right border between columns (at column divider, grows both ways but we only see inward)
    doc.line(margin + tableCol1Width, currentY, margin + tableCol1Width, currentY + rowHeight);
    // Right border (at outer edge, grows inward)
    doc.line(margin + contentWidth - halfBorder, currentY, margin + contentWidth - halfBorder, currentY + rowHeight);
    // Top border (at top edge, grows inward)
    doc.line(margin, currentY + halfBorder, margin + contentWidth, currentY + halfBorder);
    // Bottom border (at bottom edge, grows inward)
    doc.line(margin, currentY + rowHeight - halfBorder, margin + contentWidth, currentY + rowHeight - halfBorder);
    
    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...ocadoDarkBlue);
    doc.text(labelLines, margin + 8, currentY + 7);
    
    // Value
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...ocadoDarkGrey);
    doc.text(valueLines, margin + tableCol1Width + 8, currentY + 7);
    
    currentY += rowHeight;
  };
  
  // Critical Requirement rows - all expand to fit text
  const criticalFeature = criticalRequirement.criticalFeature || '—';
  drawTableRow('Critical Feature', criticalFeature);
  
  const nominalTarget = criticalRequirement.nominalTarget !== null && criticalRequirement.nominalTarget !== undefined 
    ? criticalRequirement.nominalTarget.toFixed(3) 
    : '—';
  drawTableRow('Nominal Target', nominalTarget);
  
  const lsl = criticalRequirement.lsl !== null && criticalRequirement.lsl !== undefined 
    ? criticalRequirement.lsl.toFixed(3) 
    : '—';
  drawTableRow('LSL', lsl);
  
  const usl = criticalRequirement.usl !== null && criticalRequirement.usl !== undefined 
    ? criticalRequirement.usl.toFixed(3) 
    : '—';
  drawTableRow('USL', usl);
  
  let acceptanceCriteriaText = '—';
  const acceptanceCriteria = criticalRequirement.acceptanceCriteria;
  if (acceptanceCriteria) {
    if (acceptanceCriteria.startsWith('cpk-')) {
      const cpkValue = acceptanceCriteria.replace('cpk-', '');
      acceptanceCriteriaText = `Must have a Cpk of atleast ${cpkValue}`;
    } else if (acceptanceCriteria === 'worst-case') {
      acceptanceCriteriaText = 'Worst Case tolerance must be within spec limits';
    } else if (acceptanceCriteria === 'rss') {
      acceptanceCriteriaText = 'RSS tolerance must be within spec limits';
    }
  }
  drawTableRow('Acceptance Criteria', acceptanceCriteriaText);
  
  // Assumptions Context section - expandable row
  const functionalDescription = assumptionsContext.functionalDescription || '—';
  const descriptionLines = doc.splitTextToSize(functionalDescription, tableCol2Width - 12);
  const descriptionHeight = descriptionLines.length * lineHeight;
  const rowHeight = Math.max(baseRowHeight, descriptionHeight + 4);
  
  // Background for label column
  doc.setFillColor(...ocadoLightGrey);
  doc.rect(margin, currentY, tableCol1Width, rowHeight, 'F');
  
  // Border in Ocado blue - draw borders inward so outer edge aligns with header
  doc.setDrawColor(...ocadoBlue);
  doc.setLineWidth(borderWidth);
  // Left border (at outer edge, grows inward)
  doc.line(margin + halfBorder, currentY, margin + halfBorder, currentY + rowHeight);
  // Right border between columns (at column divider)
  doc.line(margin + tableCol1Width, currentY, margin + tableCol1Width, currentY + rowHeight);
  // Right border (at outer edge, grows inward)
  doc.line(margin + contentWidth - halfBorder, currentY, margin + contentWidth - halfBorder, currentY + rowHeight);
  // Top border (at top edge, grows inward)
  doc.line(margin, currentY + halfBorder, margin + contentWidth, currentY + halfBorder);
  // Bottom border (at bottom edge, grows inward)
  doc.line(margin, currentY + rowHeight - halfBorder, margin + contentWidth, currentY + rowHeight - halfBorder);
  
  // Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...ocadoDarkBlue);
  doc.text('Assumptions Context', margin + 8, currentY + 7);
  
  // Value - multi-line text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...ocadoDarkGrey);
  doc.text(descriptionLines, margin + tableCol1Width + 8, currentY + 7);
  
  // Second page - Canvas Image
  console.log('Adding second page to PDF...');
  doc.addPage();
  const pageCount = doc.internal.getNumberOfPages();
  console.log('Second page added. Total pages:', pageCount);
  
  // Verify we're on the second page by checking page number
  if (pageCount < 2) {
    console.error('ERROR: Second page was not created!');
  }
  
  // Add small page title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ocadoNavy);
  const pageTitle = 'Stack Sketch';
  doc.text(pageTitle, margin, margin + 8);
  
  // Add page number at bottom (for debugging)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...ocadoDarkGrey);
  doc.text(`Page 2 of ${pageCount}`, pageWidth - margin - 30, pageHeight - 15);
  
  try {
    console.log('Attempting to get canvas image...');
    // Get canvas image (background + annotations)
    const canvasImage = await getCanvasImage();
    console.log('Canvas image result:', canvasImage ? 'Found' : 'Not found');
    
    if (canvasImage && canvasImage.data) {
      // Calculate image dimensions to fit in upper half of page (reserve lower half for table)
      const maxImageWidth = contentWidth;
      const maxImageHeight = (pageHeight - (margin * 2)) / 2 - 20; // Upper half minus spacing
      
      // Calculate scaling to fit image while maintaining aspect ratio
      const imgAspect = canvasImage.width / canvasImage.height;
      const maxAspect = maxImageWidth / maxImageHeight;
      
      let imgWidth, imgHeight;
      if (imgAspect > maxAspect) {
        // Image is wider - fit to width
        imgWidth = maxImageWidth;
        imgHeight = maxImageWidth / imgAspect;
      } else {
        // Image is taller - fit to height
        imgHeight = maxImageHeight;
        imgWidth = maxImageHeight * imgAspect;
      }
      
      // Center the image horizontally
      const imgX = (pageWidth - imgWidth) / 2;
      const imgY = margin + 12; // Start just below small title
      
      // Add image to PDF
      doc.addImage(canvasImage.data, 'PNG', imgX, imgY, imgWidth, imgHeight);
    } else {
      // No image available - show placeholder text
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...ocadoDarkGrey);
      const placeholderText = 'No drawing image available';
      const textWidth = doc.getTextWidth(placeholderText);
      doc.text(placeholderText, (pageWidth - textWidth) / 2, margin + 40);
    }
    
    // Add Stack Data table in the second half of the page with spacing from image
    const tableStartY = (pageHeight / 2) + 10; // Start in lower half with spacing
    addStackDataTable(doc, stackData, margin, contentWidth, tableStartY, pageHeight, ocadoBlue, ocadoDarkBlue, ocadoNavy, ocadoDarkGrey, ocadoLightGrey);
  } catch (error) {
    console.error('Error adding canvas image to PDF:', error);
    // Still show placeholder if there's an error
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ocadoDarkGrey);
    const errorText = 'Error loading drawing image';
    const textWidth = doc.getTextWidth(errorText);
    doc.text(errorText, (pageWidth - textWidth) / 2, margin + 50);
  }
  
  // Third page - Dashboard / Results
  doc.addPage();
  
  // Add small page title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ocadoNavy);
  doc.text('Analysis Results', margin, margin + 8);
  
  // Get dashboard values from DOM (they're already calculated)
  const dashboardData = getDashboardData();
  
  // Render dashboard on third page
  addDashboardPage(doc, dashboardData, margin, contentWidth, pageWidth, pageHeight, ocadoBlue, ocadoDarkBlue, ocadoNavy, ocadoDarkGrey, ocadoLightGrey);
  
  // Log final page count
  const totalPages = doc.internal.getNumberOfPages();
  console.log('PDF generation complete. Total pages:', totalPages);
  
  // Convert to blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}

// Get dashboard data from DOM elements
function getDashboardData() {
  // Get values from DOM elements that are already populated
  const getElementText = (id) => {
    const el = document.getElementById(id);
    return el ? el.textContent : '—';
  };
  
  const isElementVisible = (id) => {
    const el = document.getElementById(id);
    if (!el) return false;
    // Check both inline style and computed style
    if (el.style.display === 'none') return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  };
  
  // Get sigma from data attribute
  const statMeanEl = document.getElementById('stat-mean');
  const sigma = statMeanEl ? parseFloat(statMeanEl.getAttribute('data-sigma')) || 0 : 0;
  
  // Get distribution plot stats (advanced mode)
  const distributionStats = getDistributionPlotStats();
  
  return {
    // Specification limits
    nominalTarget: getElementText('stat-nominal-target'),
    nominalTargetVisible: isElementVisible('stat-nominal-target-card'),
    lsl: getElementText('stat-lsl'),
    lslVisible: isElementVisible('stat-lsl-card'),
    usl: getElementText('stat-usl'),
    uslVisible: isElementVisible('stat-usl-card'),
    specTolerance: getElementText('stat-spec-tolerance'),
    specToleranceVisible: isElementVisible('stat-spec-tolerance-card'),
    
    // Stack results
    stackMean: getElementText('stat-mean'),
    sigma: sigma,
    
    // Advanced mode stats
    meanMinus3Sigma: getElementText('stat-mean-minus-3sigma'),
    meanMinus3SigmaVisible: isElementVisible('stat-mean-minus-3sigma-card'),
    meanPlus3Sigma: getElementText('stat-mean-plus-3sigma'),
    meanPlus3SigmaVisible: isElementVisible('stat-mean-plus-3sigma-card'),
    processRange: getElementText('stat-3sigma'),
    processRangeVisible: isElementVisible('stat-3sigma-card'),
    
    // Basic mode - Worst case
    meanMinusWorstCase: getElementText('stat-mean-minus-worst-case'),
    meanMinusWorstCaseVisible: isElementVisible('stat-mean-minus-worst-case-card'),
    meanPlusWorstCase: getElementText('stat-mean-plus-worst-case'),
    meanPlusWorstCaseVisible: isElementVisible('stat-mean-plus-worst-case-card'),
    worstCaseTol: getElementText('stat-worst-case-tol'),
    worstCaseTolVisible: isElementVisible('stat-worst-case-tol-card'),
    
    // Basic mode - RSS
    meanMinusRss: getElementText('stat-mean-minus-rss'),
    meanMinusRssVisible: isElementVisible('stat-mean-minus-rss-card'),
    meanPlusRss: getElementText('stat-mean-plus-rss'),
    meanPlusRssVisible: isElementVisible('stat-mean-plus-rss-card'),
    rssTol: getElementText('stat-rss-tol'),
    rssTolVisible: isElementVisible('stat-rss-tol-card'),
    
    // Legacy boxes
    worstCase: getElementText('stat-worst-case'),
    worstCaseVisible: isElementVisible('stat-worst-case-card'),
    rss: getElementText('stat-rss'),
    rssVisible: isElementVisible('stat-rss-card'),
    
    // Acceptance criteria
    acceptanceCriteria: getElementText('stat-acceptance-criteria'),
    acceptanceCriteriaVisible: isElementVisible('stat-acceptance-criteria-card'),
    achievedCpk: getElementText('stat-achieved-cpk'),
    achievedCpkVisible: isElementVisible('stat-achieved-cpk-card'),
    acceptance: getElementText('stat-acceptance'),
    acceptanceVisible: isElementVisible('stat-acceptance-card'),
    
    // Distribution plot stats (advanced mode)
    distributionStats: distributionStats,
    distributionStatsVisible: isElementVisible('distribution-plot-stats'),
    
    // Distribution plot image (advanced mode)
    distributionPlotImage: getDistributionPlotImage(),
    distributionPlotVisible: isElementVisible('distribution-plot-container'),
    
    // Get Pareto data
    paretoData: getParetoData()
  };
}

// Get distribution plot as image data URL
function getDistributionPlotImage() {
  const canvas = document.getElementById('distribution-plot');
  if (!canvas) return null;
  
  const container = document.getElementById('distribution-plot-container');
  if (!container || window.getComputedStyle(container).display === 'none') return null;
  
  try {
    return {
      data: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height
    };
  } catch (e) {
    console.error('Error capturing distribution plot:', e);
    return null;
  }
}

// Get distribution plot statistics
function getDistributionPlotStats() {
  const container = document.getElementById('distribution-plot-stats');
  if (!container) return [];
  
  const stats = [];
  const statDivs = container.querySelectorAll('div');
  statDivs.forEach(div => {
    stats.push({
      text: div.textContent,
      bold: div.style.fontWeight === 'bold'
    });
  });
  return stats;
}

// Get Pareto chart data
function getParetoData() {
  const labels = document.querySelectorAll('.bar-label');
  const data = [];
  labels.forEach(label => {
    // Extract description from the fullText (format is "Description · X.X%")
    const fullText = label.dataset.fullText || label.textContent || '';
    const description = fullText.split(' · ')[0] || fullText;
    
    data.push({
      description: description,
      fullText: fullText,
      itemNumber: label.dataset.itemNumber || '?',
      percent: parseFloat(label.dataset.percent) || 0
    });
  });
  return data;
}

// Add dashboard page to PDF
function addDashboardPage(doc, data, margin, contentWidth, pageWidth, pageHeight, ocadoBlue, ocadoDarkBlue, ocadoNavy, ocadoDarkGrey, ocadoLightGrey) {
  let yPos = margin + 15;
  const cardWidth = (contentWidth - 9) / 4; // 4 cards per row with gaps
  const cardHeight = 22;
  const cardGap = 3;
  
  // Helper to draw a stat card with dynamic width
  const drawStatCard = (label, value, x, y, highlight = false, wide = false) => {
    const cWidth = wide ? cardWidth * 2 + cardGap : cardWidth;
    
    // Card background
    doc.setFillColor(...ocadoLightGrey);
    doc.roundedRect(x, y, cWidth, cardHeight, 2, 2, 'F');
    
    // Card border
    doc.setDrawColor(...ocadoBlue);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, cWidth, cardHeight, 2, 2, 'S');
    
    // Label
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ocadoDarkGrey);
    const labelText = doc.splitTextToSize(label, cWidth - 6)[0];
    doc.text(labelText, x + 3, y + 6);
    
    // Value - truncate if needed
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    if (highlight) {
      if (value === 'PASS') {
        doc.setTextColor(34, 139, 34); // Green
      } else if (value === 'FAIL') {
        doc.setTextColor(220, 20, 60); // Red
      } else {
        doc.setTextColor(...ocadoNavy);
      }
    } else {
      doc.setTextColor(...ocadoNavy);
    }
    const valueText = doc.splitTextToSize(String(value), cWidth - 6)[0];
    doc.text(valueText, x + 3, y + 16);
    
    return wide ? 2 : 1; // Return how many columns this card takes
  };
  
  // Check if we're in advanced mode (distribution plot visible)
  const isAdvancedMode = data.distributionPlotVisible && data.distributionPlotImage && data.distributionPlotImage.data;
  
  let col = 0;
  
  if (isAdvancedMode) {
    // ADVANCED MODE: Show distribution plot at top, then stats, then pareto
    
    // Distribution Plot
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ocadoDarkBlue);
    doc.text('Normal Distribution', margin, yPos);
    yPos += 5;
    
    // Calculate image dimensions to fit - make it larger since no cards above
    const maxPlotWidth = contentWidth;
    const maxPlotHeight = 90;
    
    const plotAspect = data.distributionPlotImage.width / data.distributionPlotImage.height;
    let plotWidth, plotHeight;
    
    if (plotAspect > maxPlotWidth / maxPlotHeight) {
      plotWidth = maxPlotWidth;
      plotHeight = maxPlotWidth / plotAspect;
    } else {
      plotHeight = maxPlotHeight;
      plotWidth = maxPlotHeight * plotAspect;
    }
    
    // Center the plot
    const plotX = margin + (contentWidth - plotWidth) / 2;
    
    try {
      doc.addImage(data.distributionPlotImage.data, 'PNG', plotX, yPos, plotWidth, plotHeight);
      yPos += plotHeight + 5;
    } catch (e) {
      console.error('Error adding distribution plot to PDF:', e);
    }
    
    // Distribution Statistics - compact row below graph
    if (data.distributionStatsVisible && data.distributionStats && data.distributionStats.length > 0) {
      doc.setFontSize(6);
      let statsX = margin;
      const statsPerRow = 4;
      let statsCol = 0;
      const statWidth = (contentWidth) / statsPerRow;
      
      data.distributionStats.forEach((stat, index) => {
        if (stat.bold) {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        doc.setTextColor(...ocadoDarkGrey);
        
        const truncatedText = stat.text.length > 28 ? stat.text.substring(0, 28) + '...' : stat.text;
        doc.text(truncatedText, statsX, yPos + 4);
        
        statsCol++;
        if (statsCol >= statsPerRow) {
          statsCol = 0;
          statsX = margin;
          yPos += 6;
        } else {
          statsX += statWidth;
        }
      });
      
      if (statsCol > 0) yPos += 6;
      yPos += 5;
    }
    
  } else {
    // BASIC MODE: Show cards layout
    
    // Section 1: Specification Limits
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ocadoDarkBlue);
    doc.text('Specification Limits', margin, yPos);
    yPos += 5;
    
    const hasNominal = data.nominalTargetVisible || (data.nominalTarget && data.nominalTarget !== '—');
    const hasLsl = data.lslVisible || (data.lsl && data.lsl !== '—');
    const hasUsl = data.uslVisible || (data.usl && data.usl !== '—');
    const hasSpecTol = data.specToleranceVisible || (data.specTolerance && data.specTolerance !== '—');
    
    if (hasNominal) {
      drawStatCard('Nominal Target', data.nominalTarget, margin + col * (cardWidth + cardGap), yPos);
      col++;
    }
    if (hasLsl) {
      drawStatCard('LSL', data.lsl, margin + col * (cardWidth + cardGap), yPos);
      col++;
    }
    if (hasUsl) {
      drawStatCard('USL', data.usl, margin + col * (cardWidth + cardGap), yPos);
      col++;
    }
    if (hasSpecTol) {
      drawStatCard('Spec Tolerance', data.specTolerance, margin + col * (cardWidth + cardGap), yPos);
      col++;
    }
    
    if (col > 0) yPos += cardHeight + 10;
    
    // Section 2: Analysis Results
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ocadoDarkBlue);
    doc.text('Analysis Results', margin, yPos);
    yPos += 5;
    
    col = 0;
    drawStatCard('Stack Mean', data.stackMean, margin + col * (cardWidth + cardGap), yPos);
    col++;
    
    // Basic mode - Worst case
    if (data.meanMinusWorstCaseVisible) {
      drawStatCard('Mean - Worst Case', data.meanMinusWorstCase, margin + col * (cardWidth + cardGap), yPos);
      col++;
    }
    if (data.meanPlusWorstCaseVisible) {
      drawStatCard('Mean + Worst Case', data.meanPlusWorstCase, margin + col * (cardWidth + cardGap), yPos);
      col++;
    }
    if (data.worstCaseTolVisible) {
      drawStatCard('Worst Case Tol', data.worstCaseTol, margin + col * (cardWidth + cardGap), yPos);
      col++;
    }
    
    // Basic mode - RSS
    if (data.meanMinusRssVisible) {
      drawStatCard('Mean - RSS', data.meanMinusRss, margin + col * (cardWidth + cardGap), yPos);
      col++;
    }
    if (data.meanPlusRssVisible) {
      drawStatCard('Mean + RSS', data.meanPlusRss, margin + col * (cardWidth + cardGap), yPos);
      col++;
    }
    if (data.rssTolVisible) {
      drawStatCard('RSS Tol', data.rssTol, margin + col * (cardWidth + cardGap), yPos);
      col++;
    }
    
    // Legacy boxes
    if (data.worstCaseVisible) {
      drawStatCard('Worst Case', data.worstCase, margin + col * (cardWidth + cardGap), yPos);
      col++;
    }
    if (data.rssVisible) {
      drawStatCard('RSS', data.rss, margin + col * (cardWidth + cardGap), yPos);
      col++;
    }
    
    yPos += cardHeight + 10;
    
    // Section 3: Acceptance Criteria
    if (data.acceptanceCriteriaVisible || data.acceptanceVisible) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...ocadoDarkBlue);
      doc.text('Acceptance', margin, yPos);
      yPos += 5;
      
      col = 0;
      if (data.acceptanceCriteriaVisible) {
        col += drawStatCard('Acceptance Criteria', data.acceptanceCriteria, margin + col * (cardWidth + cardGap), yPos, false, true);
      }
      if (data.achievedCpkVisible) {
        drawStatCard('Achieved Cpk', data.achievedCpk, margin + col * (cardWidth + cardGap), yPos);
        col++;
      }
      if (data.acceptanceVisible) {
        drawStatCard('Result', data.acceptance, margin + col * (cardWidth + cardGap), yPos, true);
        col++;
      }
      
      yPos += cardHeight + 10;
    }
  }
  
  // Section 4: Pareto Chart (Vertical Bars)
  if (data.paretoData && data.paretoData.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ocadoDarkBlue);
    doc.text('Pareto Contributions', margin, yPos);
    yPos += 8;
    
    // Calculate dimensions for vertical bar chart
    const numBars = data.paretoData.length;
    const chartWidth = contentWidth;
    const maxBarHeight = 50; // Maximum bar height
    const barWidth = Math.min(15, (chartWidth - 20) / numBars - 2); // Bar width, max 15
    const barGap = Math.max(2, ((chartWidth - 20) - (barWidth * numBars)) / (numBars + 1));
    const chartStartX = margin + barGap;
    const chartBaseY = yPos + maxBarHeight; // Y position of bar bottoms
    
    let cumulative = 0;
    
    // Draw bars
    data.paretoData.forEach((item, index) => {
      cumulative += item.percent;
      const isVitalFew = cumulative <= 80;
      
      const barX = chartStartX + index * (barWidth + barGap);
      const barHeight = (item.percent / 100) * maxBarHeight;
      const barY = chartBaseY - barHeight;
      
      // Bar fill
      if (isVitalFew) {
        doc.setFillColor(220, 53, 69); // Red for vital few
      } else {
        doc.setFillColor(88, 166, 255); // Blue for trivial many
      }
      doc.rect(barX, barY, barWidth, barHeight, 'F');
      
      // Percentage on top of bar
      doc.setFontSize(5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...ocadoDarkGrey);
      const percentText = `${item.percent.toFixed(0)}%`;
      const percentWidth = doc.getTextWidth(percentText);
      doc.text(percentText, barX + (barWidth - percentWidth) / 2, barY - 2);
      
      // Item number below bar
      doc.setFontSize(5);
      doc.setFont('helvetica', 'bold');
      const numText = item.itemNumber;
      const numWidth = doc.getTextWidth(numText);
      doc.text(numText, barX + (barWidth - numWidth) / 2, chartBaseY + 5);
      
      // Description below item number (rotated or truncated)
      doc.setFontSize(4);
      doc.setFont('helvetica', 'normal');
      const descWords = item.description.split(' ');
      const shortDesc = descWords.length > 2 ? descWords.slice(0, 2).join(' ') + '...' : item.description;
      const descWidth = doc.getTextWidth(shortDesc);
      doc.text(shortDesc, barX + (barWidth - descWidth) / 2, chartBaseY + 9);
    });
    
    yPos = chartBaseY + 15;
    
    // Add legend
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(220, 53, 69);
    doc.rect(margin, yPos, 8, 5, 'F');
    doc.setTextColor(...ocadoDarkGrey);
    doc.text('Vital Few (<=80%)', margin + 10, yPos + 4);
    
    doc.setFillColor(88, 166, 255);
    doc.rect(margin + 55, yPos, 8, 5, 'F');
    doc.text('Trivial Many (>80%)', margin + 65, yPos + 4);
  }
}

// Get canvas image (background + annotations) as data URL
async function getCanvasImage() {
  const imgElement = document.getElementById("drawing-img");
  const canvasElement = document.getElementById("drawing-canvas");
  const canvasWrapper = document.getElementById("canvas-wrapper");
  
  // Check if canvas wrapper is visible (image exists)
  if (!canvasWrapper || !imgElement) {
    return null;
  }
  
  // Check if wrapper is hidden (could be "none" string or false)
  const isHidden = canvasWrapper.style.display === "none" || 
                   window.getComputedStyle(canvasWrapper).display === "none";
  
  if (isHidden || !imgElement.src || imgElement.src === "") {
    return null;
  }
  
  // Create a temporary canvas to combine background image and annotations
  return new Promise((resolve, reject) => {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    
    // Load the background image
    const bgImg = new Image();
    bgImg.crossOrigin = "anonymous";
    
    bgImg.onload = () => {
      try {
        // Set temp canvas size to match background image natural size
        tempCanvas.width = bgImg.naturalWidth;
        tempCanvas.height = bgImg.naturalHeight;
        
        // Draw background image at full natural size
        tempCtx.drawImage(bgImg, 0, 0);
        
        // Draw annotations from the annotation canvas if it exists and has content
        if (canvasElement && canvasElement.width > 0 && canvasElement.height > 0) {
          // Simple approach: scale canvas to match image natural size
          // Both canvas and image fill the same wrapper, so we can scale proportionally
          const canvasWidth = canvasElement.width;
          const canvasHeight = canvasElement.height;
          
          // Calculate scale to fit canvas to image natural size while maintaining aspect ratio
          const canvasAspect = canvasWidth / canvasHeight;
          const imgAspect = bgImg.naturalWidth / bgImg.naturalHeight;
          
          let scale, drawWidth, drawHeight, offsetX, offsetY;
          
          if (canvasAspect > imgAspect) {
            // Canvas is wider - fit to image height
            scale = bgImg.naturalHeight / canvasHeight;
            drawHeight = bgImg.naturalHeight;
            drawWidth = canvasWidth * scale;
            offsetX = (bgImg.naturalWidth - drawWidth) / 2;
            offsetY = 0;
          } else {
            // Canvas is taller - fit to image width
            scale = bgImg.naturalWidth / canvasWidth;
            drawWidth = bgImg.naturalWidth;
            drawHeight = canvasHeight * scale;
            offsetX = 0;
            offsetY = (bgImg.naturalHeight - drawHeight) / 2;
          }
          
          console.log('Annotation scaling:', {
            canvasSize: `${canvasWidth}x${canvasHeight}`,
            imgNaturalSize: `${bgImg.naturalWidth}x${bgImg.naturalHeight}`,
            scale,
            drawSize: `${drawWidth}x${drawHeight}`,
            offset: `${offsetX}, ${offsetY}`
          });
          
          // Draw canvas scaled to match image
          tempCtx.save();
          tempCtx.translate(offsetX, offsetY);
          tempCtx.scale(scale, scale);
          tempCtx.drawImage(canvasElement, 0, 0);
          tempCtx.restore();
        }
        
        // Convert to data URL
        const dataURL = tempCanvas.toDataURL("image/png");
        resolve({
          data: dataURL,
          width: tempCanvas.width,
          height: tempCanvas.height
        });
      } catch (error) {
        console.error('Error processing canvas image:', error);
        reject(error);
      }
    };
    
    bgImg.onerror = (error) => {
      console.error('Error loading background image:', error);
      resolve(null);
    };
    
    bgImg.src = imgElement.src;
  });
}

// Add Stack Data table to PDF
function addStackDataTable(doc, stackData, margin, contentWidth, startY, pageHeight, ocadoBlue, ocadoDarkBlue, ocadoNavy, ocadoDarkGrey, ocadoLightGrey) {
  // Compact sizing to fit in half page
  const rowHeight = 6;
  const headerHeight = 8;
  const fontSize = 6;
  
  // Start directly at the provided Y position (no title)
  let currentY = startY;
  
  // Determine which columns to show based on settings
  const showToleranceType = settings.showToleranceType;
  const showCpk = settings.advancedStatisticalMode;
  const showFloatShifted = settings.showFloatShifted;
  
  // Build columns array based on settings (no Notes or Source columns)
  const columns = [
    { key: 'itemNr', header: '#', width: 10 },
    { key: 'partNr', header: 'Part Nr', width: 25 },
    { key: 'description', header: 'Description', width: 50 },
    { key: 'nominal', header: 'Nominal', width: 22 },
    { key: 'direction', header: 'Dir', width: 12 }
  ];
  
  if (showToleranceType) {
    columns.push({ key: 'tolType', header: 'Type', width: 18 });
  }
  
  columns.push({ key: 'tol', header: 'Tol (±)', width: 22 });
  
  if (showCpk) {
    columns.push({ key: 'cpk', header: 'Cpk', width: 15 });
  }
  
  if (showFloatShifted) {
    columns.push({ key: 'floatShifted', header: 'Float', width: 15 });
  }
  
  // Calculate total width and adjust description column to fill remaining space
  const totalFixedWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const descCol = columns.find(c => c.key === 'description');
  if (descCol && totalFixedWidth < contentWidth) {
    descCol.width += contentWidth - totalFixedWidth;
  }
  
  // Helper function to draw header
  const drawHeader = (y) => {
    doc.setFillColor(...ocadoBlue);
    doc.rect(margin, y, contentWidth, headerHeight, 'F');
    
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    
    let xPos = margin + 2;
    columns.forEach(col => {
      doc.text(col.header, xPos, y + 6);
      xPos += col.width;
    });
  };
  
  // Draw initial header
  drawHeader(currentY);
  currentY += headerHeight;
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  
  stackData.forEach((row, index) => {
    // Check if we need a new page
    if (currentY + rowHeight > pageHeight - margin - 10) {
      doc.addPage();
      currentY = margin + 10;
      drawHeader(currentY);
      currentY += headerHeight;
    }
    
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(...ocadoLightGrey);
      doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    }
    
    // Row border
    doc.setDrawColor(...ocadoBlue);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY, margin + contentWidth, currentY);
    
    // Row data
    doc.setTextColor(...ocadoDarkGrey);
    let xPos = margin + 2;
    
    columns.forEach(col => {
      let value = '';
      switch (col.key) {
        case 'itemNr':
          value = String(index + 1);
          break;
        case 'partNr':
          value = (row.partNr || '—').substring(0, 12);
          break;
        case 'description':
          const desc = row.description || '—';
          value = doc.splitTextToSize(desc, col.width - 2)[0];
          break;
        case 'nominal':
          value = row.nominal != null ? row.nominal.toFixed(3) : '—';
          break;
        case 'direction':
          value = row.direction || '+';
          break;
        case 'tolType':
          value = (row.tolType || 'Linear').substring(0, 6);
          break;
        case 'tol':
          value = row.tol != null ? row.tol.toFixed(3) : '—';
          break;
        case 'cpk':
          value = row.cpk != null ? row.cpk.toFixed(2) : '—';
          break;
        case 'floatShifted':
          value = row.floatShifted ? 'Yes' : 'No';
          break;
      }
      doc.text(value, xPos, currentY + 4.5);
      xPos += col.width;
    });
    
    currentY += rowHeight;
  });
  
  // Bottom border
  doc.setDrawColor(...ocadoBlue);
  doc.setLineWidth(0.2);
  doc.line(margin, currentY, margin + contentWidth, currentY);
}

// Download PDF as fallback
function downloadPDF(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

