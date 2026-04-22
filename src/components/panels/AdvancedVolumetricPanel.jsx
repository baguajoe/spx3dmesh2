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

export default function AdvancedVolumetricPanel({ open, onClose, sceneRef, rendererRef, setStatus }) {
  const [godRays, setGodRays] = useState(0.2);
  const [shaftAmount, setShaftAmount] = useState(0.25);
  const [shadowDensity, setShadowDensity] = useState(0.35);
  const [fogNoise, setFogNoise] = useState(0.12);

  const applyAdvancedVol = useCallback(() => {
    const scene = sceneRef?.current;
    const renderer = rendererRef?.current;
    if (!scene || !renderer) return;
    scene.userData.advancedVolumetrics = { godRays, shaftAmount, shadowDensity, fogNoise };
    window.__SPX_ADV_VOLUMETRICS__ = { godRays, shaftAmount, shadowDensity, fogNoise };
    setStatus?.("Advanced volumetrics updated");
  }, [sceneRef, rendererRef, setStatus, godRays, shaftAmount, shadowDensity, fogNoise]);

  useEffect(() => {
    if (!open) return;
    applyAdvancedVol();
  }, [open, applyAdvancedVol]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 60 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">ADV VOLUMETRICS</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <Slider label="GOD RAYS" value={godRays} min={0} max={1} step={0.01} onChange={setGodRays} />
        <Slider label="SHAFT AMOUNT" value={shaftAmount} min={0} max={1} step={0.01} onChange={setShaftAmount} />
        <Slider label="SHADOW DENSITY" value={shadowDensity} min={0} max={1} step={0.01} onChange={setShadowDensity} />
        <Slider label="FOG NOISE" value={fogNoise} min={0} max={1} step={0.01} onChange={setFogNoise} />
        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={applyAdvancedVol}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
