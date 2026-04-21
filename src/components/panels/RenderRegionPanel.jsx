import React, { useEffect, useState, useCallback } from "react";

function Slider({ label, value, min, max, step = 0.01, onChange }) {
  return (
    <div className="spx-slider-wrap">
      <div className="spx-slider-header">
        <span>{label}</span>
        <span className="spx-slider-header__val">{typeof value === "number" ? value.toFixed(step < 0.1 ? 2 : 0) : value}</span>
      </div>
      <input className="spx-slider-input" type="range" min={min} max={max} step={step} value={value} onChange={(e)=>onChange(parseFloat(e.target.value))} />
    </div>
  );
}

export default function RenderRegionPanel({ open, onClose, rendererRef, setStatus }) {
  const [renderScale, setRenderScale] = useState(1.0);
  const [progressive, setProgressive] = useState(true);
  const [paused, setPaused] = useState(false);
  const [rx, setRx] = useState(0.0);
  const [ry, setRy] = useState(0.0);
  const [rw, setRw] = useState(1.0);
  const [rh, setRh] = useState(1.0);

  const applyRegion = useCallback(() => {
    const renderer = rendererRef?.current;
    if (!renderer) return;

    const canvas = renderer.domElement;
    const baseW = canvas.clientWidth || canvas.width || 1280;
    const baseH = canvas.clientHeight || canvas.height || 720;

    renderer.setSize(Math.max(1, Math.floor(baseW * renderScale)), Math.max(1, Math.floor(baseH * renderScale)), false);

    if (renderer.setScissorTest) {
      renderer.setScissorTest(rw < 1 || rh < 1 || rx > 0 || ry > 0);
      renderer.setViewport(
        Math.floor(baseW * rx),
        Math.floor(baseH * ry),
        Math.floor(baseW * rw),
        Math.floor(baseH * rh)
      );
      renderer.setScissor(
        Math.floor(baseW * rx),
        Math.floor(baseH * ry),
        Math.floor(baseW * rw),
        Math.floor(baseH * rh)
      );
    }

    window.__SPX_RENDER_REGION__ = { renderScale, progressive, paused, rx, ry, rw, rh };
    setStatus?.(`Render region updated`);
  }, [rendererRef, setStatus, renderScale, progressive, paused, rx, ry, rw, rh]);

  useEffect(() => {
    if (!open) return;
    applyRegion();
  }, [open, applyRegion]);

  useEffect(() => {
    if (!open) return;
    applyRegion();
  }, [renderScale, progressive, paused, rx, ry, rw, rh, open, applyRegion]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 47 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">RENDER REGION</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>

      <div className="spx-float-panel__body">
        <Slider label="RENDER SCALE" value={renderScale} min={0.25} max={1.5} step={0.05} onChange={setRenderScale} />
        <Slider label="REGION X" value={rx} min={0} max={1} step={0.01} onChange={setRx} />
        <Slider label="REGION Y" value={ry} min={0} max={1} step={0.01} onChange={setRy} />
        <Slider label="REGION W" value={rw} min={0.1} max={1} step={0.01} onChange={setRw} />
        <Slider label="REGION H" value={rh} min={0.1} max={1} step={0.01} onChange={setRh} />

        <div className="spx-slider-wrap">
          <div className="spx-slider-header"><span>PROGRESSIVE</span><span className="spx-slider-header__val">{progressive ? "on" : "off"}</span></div>
          <input type="checkbox" checked={progressive} onChange={(e)=>setProgressive(e.target.checked)} />
        </div>

        <div className="spx-slider-wrap">
          <div className="spx-slider-header"><span>PAUSED</span><span className="spx-slider-header__val">{paused ? "yes" : "no"}</span></div>
          <input type="checkbox" checked={paused} onChange={(e)=>setPaused(e.target.checked)} />
        </div>

        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={applyRegion}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
