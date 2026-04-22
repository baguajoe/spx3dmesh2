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

export default function AdvancedSkinShaderPanel({ open, onClose, meshRef, setStatus }) {
  const [epidermalDepth, setEpidermalDepth] = useState(0.3);
  const [oilBreakup, setOilBreakup] = useState(0.2);
  const [poreMask, setPoreMask] = useState(0.25);
  const [redness, setRedness] = useState(0.12);
  const [sssRadius, setSssRadius] = useState(0.35);

  const apply = useCallback(() => {
    const mesh = meshRef?.current;
    if (!mesh?.material) return;
    mesh.material.userData.advancedSkin = { epidermalDepth, oilBreakup, poreMask, redness, sssRadius };
    mesh.material.needsUpdate = true;
    window.__SPX_ADV_SKIN__ = { epidermalDepth, oilBreakup, poreMask, redness, sssRadius };
    setStatus?.("Advanced skin shader updated");
  }, [meshRef, setStatus, epidermalDepth, oilBreakup, poreMask, redness, sssRadius]);

  useEffect(() => {
    if (!open) return;
    apply();
  }, [open, apply]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 61 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">ADV SKIN SHADER</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <Slider label="EPIDERMAL DEPTH" value={epidermalDepth} min={0} max={1} step={0.01} onChange={setEpidermalDepth} />
        <Slider label="OIL BREAKUP" value={oilBreakup} min={0} max={1} step={0.01} onChange={setOilBreakup} />
        <Slider label="PORE MASK" value={poreMask} min={0} max={1} step={0.01} onChange={setPoreMask} />
        <Slider label="REDNESS" value={redness} min={0} max={1} step={0.01} onChange={setRedness} />
        <Slider label="SSS RADIUS" value={sssRadius} min={0} max={1} step={0.01} onChange={setSssRadius} />
        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={apply}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
