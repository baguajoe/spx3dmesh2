import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createPaintCanvas,
  applyPaintTextureToMesh,
  clearPaintCanvas,
  paintDot,
  paintStroke,
  exportPaintTexture,
} from "../../mesh/materials/TexturePaint.js";

export default function TexturePaintPanel({ open = false, onClose, meshRef = null }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [brushColor, setBrushColor] = useState("#ff5500");
  const [brushSize, setBrushSize] = useState(24);
  const [eraseMode, setEraseMode] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);

  const paintState = useMemo(() => createPaintCanvas(1024, "#ffffff"), []);

  useEffect(() => {
    stateRef.current = paintState;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(paintState.canvas, 0, 0, canvas.width, canvas.height);
  }, [paintState, open]);

  const syncPreview = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(paintState.canvas, 0, 0, canvasRef.current.width, canvasRef.current.height);
    if (meshRef?.current) {
      applyPaintTextureToMesh(meshRef.current, paintState.canvas);
    }
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * paintState.canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * paintState.canvas.height;
    return { x, y };
  };

  const handleMouseDown = (e) => {
    const p = getPos(e);
    paintDot(paintState.ctx, p.x, p.y, brushSize, brushColor, eraseMode);
    setLastPoint(p);
    setIsPainting(true);
    syncPreview();
  };

  const handleMouseMove = (e) => {
    if (!isPainting || !lastPoint) return;
    const p = getPos(e);
    paintStroke(paintState.ctx, lastPoint, p, brushSize, brushColor, eraseMode);
    setLastPoint(p);
    syncPreview();
  };

  const stopPaint = () => {
    setIsPainting(false);
    setLastPoint(null);
  };

  const handleClear = () => {
    clearPaintCanvas(paintState.ctx, "#ffffff");
    syncPreview();
  };

  const handleExport = () => {
    exportPaintTexture(paintState.canvas, "spx-painted-texture.png");
  };

  const handleApply = () => {
    if (meshRef?.current) {
      applyPaintTextureToMesh(meshRef.current, paintState.canvas);
    }
  };

  if (!open) return null;

  return (
    <div className="paint-panel-float">
      <div className="paint-panel">
        <div className="paint-panel-header">
          <div>
            <strong>Texture Paint</strong>
            <span className="paint-panel-sub"> live mesh texture painting</span>
          </div>
          <div className="paint-header-actions">
            <button className="paint-btn" type="button" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="paint-toolbar">
          <label className="paint-field">
            <span>Color</span>
            <input
              className="paint-input paint-color"
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
            />
          </label>

          <label className="paint-field">
            <span>Brush</span>
            <input
              className="paint-input"
              type="range"
              min="1"
              max="128"
              step="1"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
            />
          </label>

          <button
            className={`paint-btn ${eraseMode ? "is-active" : ""}`}
            type="button"
            onClick={() => setEraseMode((v) => !v)}
          >
            Erase
          </button>

          <button className="paint-btn" type="button" onClick={handleApply}>
            Apply
          </button>

          <button className="paint-btn" type="button" onClick={handleClear}>
            Clear
          </button>

          <button className="paint-btn" type="button" onClick={handleExport}>
            Export
          </button>
        </div>

        <div className="paint-canvas-wrap">
          <canvas
            ref={canvasRef}
            className="paint-canvas"
            width={512}
            height={512}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopPaint}
            onMouseLeave={stopPaint}
          />
        </div>
      </div>
    </div>
  );
}
