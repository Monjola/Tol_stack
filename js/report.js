import { analysisSetup } from './data.js';

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
  
  // Add page title - this should always be visible
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ocadoNavy);
  const pageTitle = 'Drawing with Annotations';
  const pageTitleWidth = doc.getTextWidth(pageTitle);
  doc.text(pageTitle, (pageWidth - pageTitleWidth) / 2, margin + 15);
  
  // Add a divider line below title
  doc.setDrawColor(...ocadoBlue);
  doc.setLineWidth(1);
  doc.line(margin, margin + 25, pageWidth - margin, margin + 25);
  
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
      // Calculate image dimensions to fit on page
      const maxImageWidth = contentWidth;
      const maxImageHeight = pageHeight - (margin * 2) - 20; // Leave space for title
      
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
      const imgY = margin + 35; // Start below title
      
      // Add image to PDF
      doc.addImage(canvasImage.data, 'PNG', imgX, imgY, imgWidth, imgHeight);
    } else {
      // No image available - show placeholder text
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...ocadoDarkGrey);
      const placeholderText = 'No drawing image available';
      const textWidth = doc.getTextWidth(placeholderText);
      doc.text(placeholderText, (pageWidth - textWidth) / 2, margin + 50);
    }
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
  
  // Log final page count
  const totalPages = doc.internal.getNumberOfPages();
  console.log('PDF generation complete. Total pages:', totalPages);
  
  // Convert to blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
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

