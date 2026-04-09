
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  createLayer, createStroke, addStrokeToFrame,
  buildStrokeMesh, getStrokesAtFrame, clearFrame, duplicateFrame,
} from "../../mesh/GreasePencil.js";

const s = {
  overlay: { position:"fixed",inset:0,zIndex:8600,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"stretch",justifyContent:"flex-end" },
  panel: { width:480,background:"#0d1117",borderLeft:"1px solid #21262d",display:"flex",flexDirection:"column",overflow:"hidden" },
  header: { display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderBottom:"1px solid #21262d",flexShrink:0 },
  logo: { background:"#00ffc8",color:"#000",fontSize:10,fontWeight:800,padding:"2px 6px",borderRadius:4 },
  body: { flex:1,overflow:"auto",padding:14,display:"flex",flexDirection:"column",gap:12 },
  label: { fontSize:10,color:"#6b7280",letterSpacing:1,textTransform:"uppercase",marginBottom:4 },
  btn: { padding:"5px 12px",borderRadius:6,border:"1px solid #21262d",background:"#1a1a2e",color:"#e0e0e0",cursor:"pointer",fontSize:11 },
  btnActive: { padding:"5px 12px",borderRadius:6,border:"1px solid #00ffc8",background:"rgba(0,255,200,0.1)",color:"#00ffc8",cursor:"pointer",fontSize:11 },
  row: { display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" },
  canvas: { width:"100%",borderRadius:8,border:"1px solid #21262d",background:"#06060f",cursor:"crosshair",display:"block" },
  close: { marginLeft:"auto",padding:"4px 10px",border:"1px solid #21262d",borderRadius:6,background:"transparent",color:"#6b7280",cursor:"pointer" },
};

export default function GreasePencilPanel({ open, onClose, sceneRef, setStatus }) {
  const canvasRef = useRef(null);
  const [layers, setLayers] = useState([createLayer("GP_Layer_1")]);
  const [activeLayer, setActiveLayer] = useState(0);
  const [frame, setFrame] = useState(1);
  const [color, setColor] = useState("#00ffc8");
  const [thickness, setThickness] = useState(3);
  const [tool, setTool] = useState("draw");
  const [onionSkin, setOnionSkin] = useState(true);
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

  const onMouseDown = (e) => {
    drawing.current = true;
    pts.current = [getXY(e, canvasRef.current)];
  };
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
    setStatus("Grease Pencil strokes sent to 3D scene");
  };

  if (!open) return null;
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={s.logo}>SPX</span>
          <strong style={{color:"#e0e0e0"}}>Grease Pencil</strong>
          <span style={{color:"#6b7280",fontSize:12}}>2D annotation in 3D space</span>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>
        <div style={s.body}>
          {/* Tools */}
          <div>
            <div style={s.label}>Tool</div>
            <div style={s.row}>
              {["draw","erase"].map(t => (
                <button key={t} style={tool===t?s.btnActive:s.btn} onClick={() => setTool(t)}>
                  {t === "draw" ? "✏️ Draw" : "⬜ Erase"}
                </button>
              ))}
              <label style={s.btn}>
                <input type="checkbox" checked={onionSkin} onChange={e => setOnionSkin(e.target.checked)} style={{marginRight:4}} />
                Onion Skin
              </label>
            </div>
          </div>

          {/* Color + thickness */}
          <div style={s.row}>
            <div>
              <div style={s.label}>Color</div>
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                style={{width:40,height:32,borderRadius:6,border:"1px solid #21262d",background:"none",cursor:"pointer"}} />
            </div>
            <div style={{flex:1}}>
              <div style={s.label}>Thickness: {thickness}px</div>
              <input type="range" min={1} max={20} value={thickness} onChange={e => setThickness(Number(e.target.value))}
                style={{width:"100%",accentColor:"#00ffc8"}} />
            </div>
          </div>

          {/* Canvas */}
          <div>
            <div style={s.label}>Draw (Frame {frame})</div>
            <canvas ref={canvasRef} width={420} height={280} style={s.canvas}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} />
          </div>

          {/* Frame controls */}
          <div>
            <div style={s.label}>Frame</div>
            <div style={s.row}>
              <button style={s.btn} onClick={() => setFrame(f => Math.max(1, f-1))}>◀</button>
              <span style={{color:"#e0e0e0",minWidth:40,textAlign:"center"}}>{frame}</span>
              <button style={s.btn} onClick={() => setFrame(f => f+1)}>▶</button>
              <button style={s.btn} onClick={dupFrame}>⊕ Dup Frame</button>
              <button style={s.btn} onClick={clearCurrent}>🗑 Clear</button>
            </div>
          </div>

          {/* Layers */}
          <div>
            <div style={s.label}>Layers</div>
            {layers.map((l, i) => (
              <div key={i} onClick={() => setActiveLayer(i)}
                style={{...{padding:"6px 10px",borderRadius:6,marginBottom:4,cursor:"pointer",border:"1px solid",
                  borderColor: i===activeLayer?"#00ffc8":"#21262d",
                  background: i===activeLayer?"rgba(0,255,200,0.07)":"transparent",
                  color: i===activeLayer?"#00ffc8":"#e0e0e0",fontSize:12}}}>
                {l.name}
              </div>
            ))}
            <button style={s.btn} onClick={addLayer}>+ Add Layer</button>
          </div>

          {/* Actions */}
          <div>
            <div style={s.label}>Actions</div>
            <div style={s.row}>
              <button style={s.btnActive} onClick={sendToScene}>📤 Send to 3D Scene</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
