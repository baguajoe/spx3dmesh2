import { useState, useRef, useCallback, useEffect } from "react";

const C = {
  bg:     "#06060f", panel: "#0d1117", border: "#21262d",
  teal:   "#00ffc8", orange:"#FF6600", text:   "#dde6ef",
  dim:    "#555",    grey:  "#8fa8bf",
};

// ── Interpolation types ───────────────────────────────────────────────────────
const INTERP_COLORS = { linear:"#4488ff", bezier:"#00ffc8", constant:"#FF6600", ease:"#8844ff" };

export function GraphEditor({
  objects = [], activeObjId = null, animKeys = {},
  onUpdateKey, onDeleteKey, fps = 24,
}) {
  const [selectedCurve, setSelectedCurve] = useState(null);
  const [selectedKey,   setSelectedKey]   = useState(null);
  const [zoom,          setZoom]          = useState(1.0);
  const [offset,        setOffset]        = useState({ x: 0, y: 0 });
  const [interp,        setInterp]        = useState("bezier");
  const [dragging,      setDragging]      = useState(false);
  const [dragStart,     setDragStart]     = useState(null);
  const canvasRef = useRef(null);
  const W = 600, H = 250;

  // ── Get all channels for active object ────────────────────────────────────
  const channels = activeObjId ? Object.keys(animKeys[activeObjId] || {}) : [];
  const allKeys  = channels.flatMap(ch =>
    Object.entries(animKeys[activeObjId]?.[ch] || {}).map(([f,v]) => ({
      frame: Number(f), value: v, channel: ch
    }))
  );

  // ── Frame/value to canvas coords ──────────────────────────────────────────
  const toCanvasX = (frame) => ((frame + offset.x) / 120) * W * zoom + W*0.1;
  const toCanvasY = (value) => H*0.5 - (value + offset.y) * H*0.3 * zoom;
  const fromCanvasX = (x)   => (x - W*0.1) / (W * zoom / 120) - offset.x;
  const fromCanvasY = (y)   => -(y - H*0.5) / (H*0.3*zoom) - offset.y;

  // ── Draw ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx    = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = C.border;
    ctx.lineWidth   = 0.5;
    for (let x = 0; x < W; x += 40*zoom) {
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40*zoom) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
    }

    // Zero line
    ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, toCanvasY(0)); ctx.lineTo(W, toCanvasY(0)); ctx.stroke();

    // Draw curves per channel
    const colors = ["#00ffc8","#FF6600","#8844ff","#ff4444","#44ff88","#4488ff"];
    channels.forEach((ch, ci) => {
      const chKeys = Object.entries(animKeys[activeObjId]?.[ch] || {})
        .map(([f,v]) => ({ frame: Number(f), value: v }))
        .sort((a,b) => a.frame - b.frame);
      if (chKeys.length < 2) return;

      ctx.strokeStyle = selectedCurve === ch ? "#ffffff" : colors[ci%colors.length];
      ctx.lineWidth   = selectedCurve === ch ? 2 : 1;
      ctx.beginPath();

      chKeys.forEach((k, i) => {
        const x = toCanvasX(k.frame);
        const y = toCanvasY(k.value);
        if (i === 0) ctx.moveTo(x, y);
        else {
          // Bezier curve
          const prev = chKeys[i-1];
          const cpx  = (toCanvasX(prev.frame) + x) / 2;
          ctx.bezierCurveTo(cpx, toCanvasY(prev.value), cpx, y, x, y);
        }
      });
      ctx.stroke();

      // Draw keyframe diamonds
      chKeys.forEach(k => {
        const x = toCanvasX(k.frame);
        const y = toCanvasY(k.value);
        const sel = selectedKey?.frame === k.frame && selectedKey?.channel === ch;
        ctx.fillStyle = sel ? "#ffffff" : colors[ci%colors.length];
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI/4);
        ctx.fillRect(-4,-4,8,8);
        ctx.restore();
      });
    });

    // Frame labels
    ctx.fillStyle = C.dim; ctx.font = "9px monospace";
    for (let f = 0; f <= 120; f += 10) {
      const x = toCanvasX(f);
      if (x > 0 && x < W) ctx.fillText(f, x, H-4);
    }
  }, [animKeys, activeObjId, selectedCurve, selectedKey, zoom, offset, channels]);

  // ── Click to select key ───────────────────────────────────────────────────
  const handleCanvasClick = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check if clicking near a key
    for (const ch of channels) {
      const chKeys = Object.entries(animKeys[activeObjId]?.[ch] || {});
      for (const [f,v] of chKeys) {
        const x = toCanvasX(Number(f));
        const y = toCanvasY(v);
        if (Math.abs(mx-x) < 8 && Math.abs(my-y) < 8) {
          setSelectedKey({ frame: Number(f), value: v, channel: ch });
          setSelectedCurve(ch);
          return;
        }
      }
    }
    setSelectedKey(null);
  }, [channels, animKeys, activeObjId, zoom, offset]);

  // ── Scroll to zoom ────────────────────────────────────────────────────────
  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.2, Math.min(5, z - e.deltaY * 0.001)));
  };

  return (
    <div style={{background:C.panel,borderTop:`1px solid ${C.border}`,
      fontFamily:"JetBrains Mono,monospace",flexShrink:0}}>

      {/* Toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 10px",
        borderBottom:`1px solid ${C.border}`}}>
        <span style={{color:C.teal,fontSize:9,fontWeight:700,textTransform:"uppercase"}}>
          Graph Editor
        </span>
        <div style={{display:"flex",gap:3}}>
          {Object.entries(INTERP_COLORS).map(([type,color])=>(
            <button key={type} onClick={()=>setInterp(type)}
              style={{padding:"2px 6px",border:"none",borderRadius:3,cursor:"pointer",
                fontSize:8,fontWeight:700,
                background:interp===type?color:"#1a1f2e",
                color:interp===type?"#06060f":C.dim}}>
              {type}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:3,marginLeft:"auto"}}>
          <button onClick={()=>setZoom(z=>Math.min(5,z*1.2))}
            style={{padding:"2px 6px",background:"#1a1f2e",border:"none",
              color:C.dim,borderRadius:3,cursor:"pointer",fontSize:9}}>+</button>
          <button onClick={()=>setZoom(z=>Math.max(0.2,z/1.2))}
            style={{padding:"2px 6px",background:"#1a1f2e",border:"none",
              color:C.dim,borderRadius:3,cursor:"pointer",fontSize:9}}>-</button>
          <button onClick={()=>{setZoom(1);setOffset({x:0,y:0});}}
            style={{padding:"2px 6px",background:"#1a1f2e",border:"none",
              color:C.dim,borderRadius:3,cursor:"pointer",fontSize:9}}>Reset</button>
        </div>
        {selectedKey && (
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{color:C.grey,fontSize:8}}>{selectedKey.channel} @ {selectedKey.frame}</span>
            <span style={{color:C.teal,fontSize:8}}>= {selectedKey.value?.toFixed(3)}</span>
            <button onClick={()=>{ onDeleteKey?.(activeObjId,selectedKey.channel,selectedKey.frame); setSelectedKey(null); }}
              style={{padding:"2px 5px",background:"#FF6600",border:"none",color:"#fff",
                borderRadius:3,cursor:"pointer",fontSize:8}}>Del</button>
          </div>
        )}
      </div>

      {/* Channel list */}
      <div style={{display:"flex",gap:4,padding:"4px 10px",borderBottom:`1px solid ${C.border}`,flexWrap:"wrap"}}>
        {channels.map((ch,i)=>{
          const colors=["#00ffc8","#FF6600","#8844ff","#ff4444","#44ff88","#4488ff"];
          return (
            <button key={ch} onClick={()=>setSelectedCurve(selectedCurve===ch?null:ch)}
              style={{padding:"2px 6px",border:`1px solid ${colors[i%colors.length]}44`,
                borderRadius:3,cursor:"pointer",fontSize:8,
                background:selectedCurve===ch?colors[i%colors.length]+"33":"transparent",
                color:colors[i%colors.length]}}>
              {ch}
            </button>
          );
        })}
        {channels.length === 0 && (
          <span style={{color:C.dim,fontSize:8}}>No keyframes — insert keys on timeline first</span>
        )}
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} width={W} height={H}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        style={{display:"block",width:"100%",height:H,cursor:"crosshair"}}/>
    </div>
  );
}

export default GraphEditor;
