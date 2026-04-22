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

export default function MetaHumanSkinPanel({ open, onClose, meshRef, setStatus }) {
  const [melanin, setMelanin] = useState(0.45);
  const [undertone, setUndertone] = useState(0.35);
  const [roughnessBreakup, setRoughnessBreakup] = useState(0.2);
  const [microNormal, setMicroNormal] = useState(0.25);
  const [cheekRedness, setCheekRedness] = useState(0.1);
  const [foreheadOil, setForeheadOil] = useState(0.15);

  const apply = useCallback(() => {
    const mesh = meshRef?.current;
    if (!mesh?.material) return;
    mesh.material.userData.metaHumanSkin = {
      melanin, undertone, roughnessBreakup, microNormal, cheekRedness, foreheadOil
    };
    mesh.material.needsUpdate = true;
    window.__SPX_METAHUMAN_SKIN__ = {
      melanin, undertone, roughnessBreakup, microNormal, cheekRedness, foreheadOil
    };
    setStatus?.("MetaHuman-style skin updated");
  }, [meshRef, setStatus, melanin, undertone, roughnessBreakup, microNormal, cheekRedness, foreheadOil]);

  useEffect(() => {
    if (!open) return;
    apply();
  }, [open, apply]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 71 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">ADV SKIN TUNING</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <Slider label="MELANIN" value={melanin} min={0} max={1} step={0.01} onChange={setMelanin} />
        <Slider label="UNDERTONE" value={undertone} min={0} max={1} step={0.01} onChange={setUndertone} />
        <Slider label="ROUGHNESS BREAKUP" value={roughnessBreakup} min={0} max={1} step={0.01} onChange={setRoughnessBreakup} />
        <Slider label="MICRO NORMAL" value={microNormal} min={0} max={1} step={0.01} onChange={setMicroNormal} />
        <Slider label="CHEEK REDNESS" value={cheekRedness} min={0} max={1} step={0.01} onChange={setCheekRedness} />
        <Slider label="FOREHEAD OIL" value={foreheadOil} min={0} max={1} step={0.01} onChange={setForeheadOil} />
        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={apply}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
