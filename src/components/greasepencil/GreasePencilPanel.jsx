import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  createLayer, createStroke, addStrokeToFrame,
  buildStrokeMesh, getStrokesAtFrame, clearFrame, duplicateFrame,
} from "../../mesh/GreasePencil.js";

export default function GreasePencilPanel({ open, onClose, sceneRef, setStatus }) {
  const canvasRef = useRef(null);
  const [layers,      setLayers]      = useState([createLayer("GP_Layer_1")]);
  const [activeLayer, setActiveLayer] = useState(0);
  const [frame,       setFrame]       = useState(1);
  const [color,       setColor]       = useState("#00ffc8");
  const [thickness,   setThickness]   = useState(3);
  const [tool,        setTool]        = useState("draw");
  const [onionSkin,   setOnionSkin]   = useState(true);
  const drawing = useRef(false);
  const pts = useRef([]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const layer = layers[activeLayer];
    if (!layer) return;
    if (onionSkin) {
      const prev = getStrokesAtFrame(layer, frame - 1);
      prev.forEach(str => {
        if (str.points.length < 2) return;
        ctx.strokeStyle = "rgba(0,255,200,0.2)"; ctx.lineWidth = str.thickness || 2;
        ctx.beginPath(); ctx.moveTo(str.points[0].x * W, str.points[0].y * H);
        str.points.slice(1).forEach(p => ctx.lineTo(p.x * W, p.y * H)); ctx.stroke();
      });
    }
    const strokes = getStrokesAtFrame(layer, frame);
    strokes.forEach(str => {
      if (str.points.length < 2) return;
      ctx.strokeStyle = str.color || "#fff"; ctx.lineWidth = str.thickness || 2;
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(str.points[0].x * W, str.points[0].y * H);
      str.points.slice(1).forEach(p => ctx.lineTo(p.x * W, p.y * H)); ctx.stroke();
    });
  }, [layers, activeLayer, frame, onionSkin]);

  useEffect(() => { redraw(); }, [redraw]);

  const getXY = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const onMouseDown = (e) => { drawing.current = true; pts.current = [getXY(e, canvasRef.current)]; };
  const onMouseMove = (e) => {
    if (!drawing.current) return;
    pts.current.push(getXY(e, canvasRef.current));
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const p = pts.current;
    if (p.length >= 2) {
      ctx.strokeStyle = color; ctx.lineWidth = thickness;
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p[p.length-2].x*W, p[p.length-2].y*H);
      ctx.lineTo(p[p.length-1].x*W, p[p.length-1].y*H);
      ctx.stroke();
    }
  };
  const onMouseUp = () => {
    if (!drawing.current || pts.current.length < 2) { drawing.current = false; return; }
    drawing.current = false;
    const stroke = createStroke(pts.current.map(p => ({x:p.x,y:p.y,z:0})), color, thickness);
    setLayers(prev => {
      const next = prev.map((l,i) => i === activeLayer ? {...l} : l);
      addStrokeToFrame(next[activeLayer], frame, stroke);
      return next;
    });
    pts.current = [];
    setTimeout(redraw, 10);
    setStatus("Stroke added — frame " + frame);
  };

  const addLayer = () => {
    setLayers(prev => [...prev, createLayer("GP_Layer_" + (prev.length + 1))]);
    setActiveLayer(layers.length);
  };

  const clearCurrent = () => {
    setLayers(prev => { const next = [...prev]; clearFrame(next[activeLayer], frame); return next; });
    setTimeout(redraw, 10);
  };

  const dupFrame = () => {
    setLayers(prev => { const next = [...prev]; duplicateFrame(next[activeLayer], frame, frame + 1); return next; });
    setFrame(f => f + 1);
  };

  const sendToScene = () => {
    if (!sceneRef?.current) { setStatus("No scene — open a 3D file first"); return; }
    layers.forEach(layer => {
      const strokes = getStrokesAtFrame(layer, frame);
      strokes.forEach(str => {
        const mesh = buildStrokeMesh(str);
        if (mesh) sceneRef.current.add(mesh);
      });
    });
    setStatus("SPX Sketch strokes sent to 3D scene");
  };

  if (!open) return null;
  return (
    <div className="gp-overlay" onClick={onClose}>
      <div className="gp-panel" onClick={e => e.stopPropagation()}>
        <div className="gp-header">
          <span className="gp-logo">SPX</span>
          <strong className="gp-title">SPX Sketch</strong>
          <span className="gp-subtitle">2D annotation in 3D space</span>
          <button className="gp-close" onClick={onClose}>✕</button>
        </div>

        <div className="gp-body">
          <div>
            <div className="gp-label">Tool</div>
            <div className="gp-row">
              {["draw","erase"].map(t => (
                <button key={t} className={`gp-btn${tool===t?" gp-btn--active":""}`}
                  onClick={() => setTool(t)}>
                  {t === "draw" ? "✏️ Draw" : "⬜ Erase"}
                </button>
              ))}
              <label className="gp-btn">
                <input type="checkbox" checked={onionSkin}
                  onChange={e => setOnionSkin(e.target.checked)}
                  className="gp-checkbox" />
                Onion Skin
              </label>
            </div>
          </div>

          <div className="gp-row">
            <div>
              <div className="gp-label">Color</div>
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="gp-color-input" />
            </div>
            <div className="gp-thickness">
              <div className="gp-label">Thickness: {thickness}px</div>
              <input type="range" min={1} max={20} value={thickness}
                onChange={e => setThickness(Number(e.target.value))}
                className="gp-slider" />
            </div>
          </div>

          <div>
            <div className="gp-label">Draw (Frame {frame})</div>
            <canvas ref={canvasRef} width={420} height={280}
              className="gp-canvas"
              onMouseDown={onMouseDown} onMouseMove={onMouseMove}
              onMouseUp={onMouseUp} onMouseLeave={onMouseUp} />
          </div>

          <div>
            <div className="gp-label">Frame</div>
            <div className="gp-row">
              <button className="gp-btn" onClick={() => setFrame(f => Math.max(1, f-1))}>◀</button>
              <span className="gp-frame-num">{frame}</span>
              <button className="gp-btn" onClick={() => setFrame(f => f+1)}>▶</button>
              <button className="gp-btn" onClick={dupFrame}>⊕ Dup Frame</button>
              <button className="gp-btn" onClick={clearCurrent}>🗑 Clear</button>
            </div>
          </div>

          <div>
            <div className="gp-label">Layers</div>
            {layers.map((l, i) => (
              <div key={i}
                className={`gp-layer${i===activeLayer?" gp-layer--active":""}`}
                onClick={() => setActiveLayer(i)}>
                {l.name}
              </div>
            ))}
            <button className="gp-btn" onClick={addLayer}>+ Add Layer</button>
          </div>

          <div>
            <div className="gp-label">Actions</div>
            <div className="gp-row">
              <button className="gp-btn gp-btn--active" onClick={sendToScene}>📤 Send to 3D Scene</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
