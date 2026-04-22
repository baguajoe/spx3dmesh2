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

export default function PainterlyNPRPanel({ open, onClose, setStatus }) {
  const [brushStroke, setBrushStroke] = useState(0.25);
  const [watercolorDiffusion, setWatercolorDiffusion] = useState(0.2);
  const [inkBleed, setInkBleed] = useState(0.12);
  const [shadowShape, setShadowShape] = useState(0.45);

  const apply = useCallback(() => {
    window.__SPX_PAINTERLY_NPR__ = { brushStroke, watercolorDiffusion, inkBleed, shadowShape };
    setStatus?.("Painterly NPR updated");
  }, [setStatus, brushStroke, watercolorDiffusion, inkBleed, shadowShape]);

  useEffect(() => {
    if (!open) return;
    apply();
  }, [open, apply]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 62 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">PAINTERLY NPR</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <Slider label="BRUSH STROKE" value={brushStroke} min={0} max={1} step={0.01} onChange={setBrushStroke} />
        <Slider label="WATERCOLOR" value={watercolorDiffusion} min={0} max={1} step={0.01} onChange={setWatercolorDiffusion} />
        <Slider label="INK BLEED" value={inkBleed} min={0} max={1} step={0.01} onChange={setInkBleed} />
        <Slider label="SHADOW SHAPE" value={shadowShape} min={0} max={1} step={0.01} onChange={setShadowShape} />
        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={apply}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
