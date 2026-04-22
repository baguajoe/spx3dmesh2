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

export default function GeometryNodeStylePanel({ open, onClose, meshRef, setStatus }) {
  const [mode, setMode] = useState("scatter");
  const [density, setDensity] = useState(0.35);
  const [randomness, setRandomness] = useState(0.4);
  const [alignToNormal, setAlignToNormal] = useState(true);
  const [scaleJitter, setScaleJitter] = useState(0.2);

  const apply = useCallback(() => {
    const mesh = meshRef?.current;
    if (!mesh) return;
    mesh.userData.geometryNodeStyle = { mode, density, randomness, alignToNormal, scaleJitter };
    window.__SPX_GEONODE_STYLE__ = { mode, density, randomness, alignToNormal, scaleJitter };
    setStatus?.("Geometry node style updated");
  }, [meshRef, setStatus, mode, density, randomness, alignToNormal, scaleJitter]);

  useEffect(() => {
    if (!open) return;
    apply();
  }, [open, apply]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 73 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">GEONODE STYLE</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <div className="spx-slider-wrap">
          <div className="spx-slider-header"><span>MODE</span><span className="spx-slider-header__val">{mode}</span></div>
          <select className="spx-slider-input" value={mode} onChange={(e)=>setMode(e.target.value)}>
            <option value="scatter">scatter</option>
            <option value="array">array</option>
            <option value="curve">curve</option>
            <option value="instancer">instancer</option>
          </select>
        </div>
        <Slider label="DENSITY" value={density} min={0} max={1} step={0.01} onChange={setDensity} />
        <Slider label="RANDOMNESS" value={randomness} min={0} max={1} step={0.01} onChange={setRandomness} />
        <Slider label="SCALE JITTER" value={scaleJitter} min={0} max={1} step={0.01} onChange={setScaleJitter} />
        <div className="spx-slider-wrap">
          <div className="spx-slider-header"><span>ALIGN TO NORMAL</span><span className="spx-slider-header__val">{alignToNormal ? "on" : "off"}</span></div>
          <input type="checkbox" checked={alignToNormal} onChange={(e)=>setAlignToNormal(e.target.checked)} />
        </div>
        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={apply}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
