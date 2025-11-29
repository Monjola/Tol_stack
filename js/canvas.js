import { annotations, state } from './data.js';

// Canvas setup and drawing functions
export function setupCanvas() {
  const uploadInput = document.getElementById("drawing-upload");
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

  uploadInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  clearBtn.addEventListener("click", () => {
    annotations.length = 0;
    redrawAnnotations();
  });
}

export function resizeCanvas() {
  if (!state.canvas) return;
  const rect = state.canvas.parentElement.getBoundingClientRect();
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
  const strokeColor = "#58a6ff";
  const fillColor = "rgba(88,166,255,0.15)";
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;

  annotations.forEach((entry, index) => {
    if (entry.type === "balloon") {
      drawBalloon(ctx, entry.x, entry.y, index + 1, strokeColor, fillColor);
    } else if (entry.type === "arrow") {
      drawArrow(ctx, entry.start, entry.end, strokeColor);
    }
  });

  if (state.previewEnd && state.start) {
    drawArrow(ctx, state.start, state.previewEnd, "rgba(88,166,255,0.5)");
  }
}

function drawBalloon(ctx, x, y, label, stroke, fill) {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e6edf3";
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

