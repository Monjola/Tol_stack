import { annotations, state } from './data.js';

// Canvas setup and drawing functions
export function setupCanvas() {
  const uploadInput = document.getElementById("drawing-upload");
  const uploadBtn = document.getElementById("canvas-upload-btn");
  const uploadArea = document.getElementById("canvas-upload-area");
  const uploadPlaceholder = document.getElementById("canvas-upload-placeholder");
  const canvasWrapper = document.getElementById("canvas-wrapper");
  const img = document.getElementById("drawing-img");
  const canvas = document.getElementById("drawing-canvas");
  const clearBtn = document.getElementById("clear-annotations");

  state.canvas = canvas;
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerUp);

  // File upload button click
  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      uploadInput.click();
    });
  }

  // File upload via input
  uploadInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    loadImageFromFile(file, img, uploadPlaceholder, canvasWrapper);
  });

  // Drag and drop
  if (uploadArea) {
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.add("drag-over");
    });

    uploadArea.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.remove("drag-over");
    });

    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.remove("drag-over");

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("image/")) {
          loadImageFromFile(file, img, uploadPlaceholder, canvasWrapper);
        }
      }
    });
  }

  // Paste from clipboard
  document.addEventListener("paste", (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          loadImageFromFile(file, img, uploadPlaceholder, canvasWrapper);
        }
        break;
      }
    }
  });

  clearBtn.addEventListener("click", () => {
    annotations.length = 0;
    redrawAnnotations();
  });

  // Remove image button
  const removeImageBtn = document.getElementById("remove-image-btn");
  const removeImageDialog = document.getElementById("remove-image-confirm-dialog");
  const removeImageConfirmBtn = document.getElementById("remove-image-confirm-btn");

  if (removeImageBtn && removeImageDialog && removeImageConfirmBtn) {
    removeImageBtn.addEventListener("click", () => {
      removeImageDialog.showModal();
    });

    removeImageConfirmBtn.addEventListener("click", (e) => {
      e.preventDefault();
      removeImage(img, uploadPlaceholder, canvasWrapper, removeImageBtn);
      removeImageDialog.close();
    });

    // Handle cancel button
    const cancelBtn = removeImageDialog.querySelector('button[value="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        removeImageDialog.close();
      });
    }
  }
}

function removeImage(imgElement, placeholder, wrapper, removeBtn) {
  // Clear image source
  imgElement.src = "";
  
  // Clear annotations
  annotations.length = 0;
  
  // Hide canvas wrapper and show placeholder
  if (wrapper) wrapper.style.display = "none";
  if (placeholder) placeholder.style.display = "flex";
  if (removeBtn) removeBtn.style.display = "none";
  
  // Clear canvas
  if (state.ctx) {
    state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
  }
  
  // Reset file input
  const uploadInput = document.getElementById("drawing-upload");
  if (uploadInput) uploadInput.value = "";
}

function loadImageFromFile(file, imgElement, placeholder, wrapper) {
  const reader = new FileReader();
  reader.onload = () => {
    // Hide placeholder and show canvas wrapper first
    if (placeholder) placeholder.style.display = "none";
    if (wrapper) wrapper.style.display = "block";
    
    // Show remove image button
    const removeBtn = document.getElementById("remove-image-btn");
    if (removeBtn) removeBtn.style.display = "block";
    
    // Set image source
    imgElement.src = reader.result;
    
    // Resize canvas after image loads
    imgElement.onload = () => {
      resizeCanvas();
    };
    
    // If image is already loaded (cached), trigger resize immediately
    if (imgElement.complete) {
      resizeCanvas();
    }
  };
  reader.readAsDataURL(file);
}

export function resizeCanvas() {
  if (!state.canvas) return;
  const canvasWrapper = document.getElementById("canvas-wrapper");
  if (!canvasWrapper || canvasWrapper.style.display === "none") return;
  
  const rect = canvasWrapper.getBoundingClientRect();
  state.canvas.width = rect.width;
  state.canvas.height = rect.height;
  state.canvas.style.width = `${rect.width}px`;
  state.canvas.style.height = `${rect.height}px`;
  state.ctx = state.canvas.getContext("2d");
  redrawAnnotations();
}

export function redrawAnnotations() {
  if (!state.ctx) return;
  const ctx = state.ctx;
  ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
  ctx.lineWidth = 2;
  const strokeColor = "#ff4444"; // Red
  const fillColor = "#ffffff"; // White for balloon fill
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;

  // Count only balloons for numbering
  let balloonCount = 0;
  annotations.forEach((entry) => {
    if (entry.type === "balloon") {
      balloonCount++;
      drawBalloon(ctx, entry.x, entry.y, balloonCount, strokeColor, fillColor);
    } else if (entry.type === "arrow") {
      drawArrow(ctx, entry.start, entry.end, strokeColor);
    }
  });

  if (state.previewEnd && state.start) {
    drawArrow(ctx, state.start, state.previewEnd, "rgba(255,68,68,0.5)"); // Red with transparency
  }
}

function drawBalloon(ctx, x, y, label, stroke, fill) {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = fill; // White fill
  ctx.strokeStyle = stroke; // Red stroke
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#000000"; // Black text
  ctx.font = "14px 'Inter', 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(label), x, y);
  ctx.restore();
}

function drawArrow(ctx, start, end, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = 14;
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function handlePointerDown(event) {
  if (!state.canvas) return;
  const point = getCanvasPoint(event);
  state.drawing = true;
  state.start = point;
  state.previewEnd = null;
}

function handlePointerMove(event) {
  if (!state.drawing || !state.start) return;
  state.previewEnd = getCanvasPoint(event);
  redrawAnnotations();
}

function handlePointerUp(event) {
  if (!state.drawing || !state.start) {
    state.previewEnd = null;
    return;
  }

  const endPoint = getCanvasPoint(event);
  const distance = Math.hypot(endPoint.x - state.start.x, endPoint.y - state.start.y);

  if (distance < 6) {
    annotations.push({ type: "balloon", x: state.start.x, y: state.start.y });
  } else {
    annotations.push({ type: "arrow", start: { ...state.start }, end: endPoint });
  }

  state.drawing = false;
  state.start = null;
  state.previewEnd = null;
  redrawAnnotations();
}

function getCanvasPoint(event) {
  const rect = state.canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

