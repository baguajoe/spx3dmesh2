import { useState, useRef, useCallback, useEffect } from "react";

const C = {
  bg:"#06060f", panel:"#0d1117", border:"#21262d",
  teal:"#00ffc8", orange:"#FF6600", text:"#dde6ef",
  dim:"#555", grey:"#8fa8bf",
};

const INTERP_COLORS = { linear:"#4488ff", bezier:"#00ffc8", constant:"#FF6600", ease:"#8844ff" };
const CURVE_COLORS  = ["#00ffc8","#FF6600","#8844ff","#ff4444","#44ff88","#4488ff"];

export function GraphEditor({
  objects = [], activeObjId = null, animKeys = {},
  onUpdateKey, onDeleteKey, fps = 24,
}) {
  const [selectedCurve, setSelectedCurve] = useState(null);
  const [selectedKey,   setSelectedKey]   = useState(null);
  const [zoom,          setZoom]          = useState(1.0);
  const [offset,        setOffset]        = useState({ x: 0, y: 0 });
  const [interp,        setInterp]        = useState("bezier");
  const canvasRef = useRef(null);
  const W = 600, H = 250;

  const channels = activeObjId ? Object.keys(animKeys[activeObjId] || {}) : [];

  const toCanvasX = (frame) => ((frame + offset.x) / 120) * W * zoom + W*0.1;
  const toCanvasY = (value) => H*0.5 - (value + offset.y) * H*0.3 * zoom;

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = C.border; ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40*zoom) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40*zoom) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, toCanvasY(0)); ctx.lineTo(W, toCanvasY(0)); ctx.stroke();

    channels.forEach((ch, ci) => {
      const chKeys = Object.entries(animKeys[activeObjId]?.[ch] || {})
        .map(([f,v]) => ({ frame: Number(f), value: v }))
        .sort((a,b) => a.frame - b.frame);
      if (chKeys.length < 2) return;

      ctx.strokeStyle = selectedCurve === ch ? "#ffffff" : CURVE_COLORS[ci%CURVE_COLORS.length];
      ctx.lineWidth   = selectedCurve === ch ? 2 : 1;
      ctx.beginPath();
      chKeys.forEach((k, i) => {
        const x = toCanvasX(k.frame), y = toCanvasY(k.value);
        if (i === 0) ctx.moveTo(x, y);
        else {
          const prev = chKeys[i-1];
          const cpx  = (toCanvasX(prev.frame) + x) / 2;
          ctx.bezierCurveTo(cpx, toCanvasY(prev.value), cpx, y, x, y);
        }
      });
      ctx.stroke();

      chKeys.forEach(k => {
        const x = toCanvasX(k.frame), y = toCanvasY(k.value);
        const sel = selectedKey?.frame === k.frame && selectedKey?.channel === ch;
        ctx.fillStyle = sel ? "#ffffff" : CURVE_COLORS[ci%CURVE_COLORS.length];
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI/4);
        ctx.fillRect(-4,-4,8,8); ctx.restore();
      });
    });

    ctx.fillStyle = C.dim; ctx.font = "9px monospace";
    for (let f = 0; f <= 120; f += 10) {
      const x = toCanvasX(f);
      if (x > 0 && x < W) ctx.fillText(f, x, H-4);
    }
  }, [animKeys, activeObjId, selectedCurve, selectedKey, zoom, offset, channels]);

  const handleCanvasClick = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for (const ch of channels) {
      const chKeys = Object.entries(animKeys[activeObjId]?.[ch] || {});
      for (const [f,v] of chKeys) {
        const x = toCanvasX(Number(f)), y = toCanvasY(v);
        if (Math.abs(mx-x) < 8 && Math.abs(my-y) < 8) {
          setSelectedKey({ frame: Number(f), value: v, channel: ch });
          setSelectedCurve(ch); return;
        }
      }
    }
    setSelectedKey(null);
  }, [channels, animKeys, activeObjId, zoom, offset]);

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.2, Math.min(5, z - e.deltaY * 0.001)));
  };

  return (
    <div className="ge-root">
      <div className="ge-toolbar">
        <span className="ge-title">Graph Editor</span>
        <div className="ge-interp-btns">
          {Object.entries(INTERP_COLORS).map(([type, color]) => (
            <button key={type} onClick={() => setInterp(type)}
              className={`ge-interp-btn${interp===type?" ge-interp-btn--active":""}`}
              style={{ "--interp-color": color }}>
              {type}
            </button>
          ))}
        </div>
        <div className="ge-zoom-btns">
          <button className="ge-zoom-btn" onClick={() => setZoom(z => Math.min(5, z*1.2))}>+</button>
          <button className="ge-zoom-btn" onClick={() => setZoom(z => Math.max(0.2, z/1.2))}>-</button>
          <button className="ge-zoom-btn" onClick={() => { setZoom(1); setOffset({x:0,y:0}); }}>Reset</button>
        </div>
        {selectedKey && (
          <div className="ge-key-info">
            <span className="ge-key-channel">{selectedKey.channel} @ {selectedKey.frame}</span>
            <span className="ge-key-value">= {selectedKey.value?.toFixed(3)}</span>
            <button className="ge-key-del"
              onClick={() => { onDeleteKey?.(activeObjId, selectedKey.channel, selectedKey.frame); setSelectedKey(null); }}>
              Del
            </button>
          </div>
        )}
      </div>

      <div className="ge-channels">
        {channels.map((ch, i) => (
          <button key={ch}
            onClick={() => setSelectedCurve(selectedCurve===ch ? null : ch)}
            className={`ge-channel-btn${selectedCurve===ch?" ge-channel-btn--active":""}`}
            style={{ "--curve-color": CURVE_COLORS[i%CURVE_COLORS.length] }}>
            {ch}
          </button>
        ))}
        {channels.length === 0 && <span className="ge-empty">No keyframes — insert keys on timeline first</span>}
      </div>

      <canvas ref={canvasRef} width={W} height={H}
        className="ge-canvas"
        onClick={handleCanvasClick}
        onWheel={handleWheel} />
    </div>
  );
}

export default GraphEditor;
