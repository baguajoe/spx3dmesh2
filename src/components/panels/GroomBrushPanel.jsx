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

export default function GroomBrushPanel({ open, onClose, meshRef, setStatus }) {
  const [brushType, setBrushType] = useState("comb");
  const [strength, setStrength] = useState(0.5);
  const [radius, setRadius] = useState(0.4);
  const [clump, setClump] = useState(0.25);
  const [frizz, setFrizz] = useState(0.15);

  const apply = useCallback(() => {
    const mesh = meshRef?.current;
    if (!mesh) return;
    mesh.userData.groomBrush = { brushType, strength, radius, clump, frizz };
    window.__SPX_GROOM_BRUSH__ = { brushType, strength, radius, clump, frizz };
    setStatus?.("Groom brush settings updated");
  }, [meshRef, setStatus, brushType, strength, radius, clump, frizz]);

  useEffect(() => {
    if (!open) return;
    apply();
  }, [open, apply]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 72 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">GROOM BRUSH</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <div className="spx-slider-wrap">
          <div className="spx-slider-header"><span>BRUSH TYPE</span><span className="spx-slider-header__val">{brushType}</span></div>
          <select className="spx-slider-input" value={brushType} onChange={(e)=>setBrushType(e.target.value)}>
            <option value="comb">comb</option>
            <option value="clump">clump</option>
            <option value="smooth">smooth</option>
            <option value="frizz">frizz</option>
          </select>
        </div>
        <Slider label="STRENGTH" value={strength} min={0} max={1} step={0.01} onChange={setStrength} />
        <Slider label="RADIUS" value={radius} min={0.05} max={2} step={0.01} onChange={setRadius} />
        <Slider label="CLUMP" value={clump} min={0} max={1} step={0.01} onChange={setClump} />
        <Slider label="FRIZZ" value={frizz} min={0} max={1} step={0.01} onChange={setFrizz} />
        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={apply}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
