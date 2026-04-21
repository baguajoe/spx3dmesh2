import React, { useEffect, useState, useCallback } from "react";

function Slider({ label, value, min, max, step = 0.01, onChange }) {
  return (
    <div className="spx-slider-wrap">
      <div className="spx-slider-header">
        <span>{label}</span>
        <span className="spx-slider-header__val">
          {typeof value === "number" ? value.toFixed(step < 0.1 ? 2 : 0) : value}
        </span>
      </div>
      <input
        className="spx-slider-input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export default function CompositorPanel({ open, onClose, rendererRef, setStatus }) {
  const [exposure, setExposure] = useState(1.1);
  const [contrast, setContrast] = useState(1.05);
  const [saturation, setSaturation] = useState(1.02);
  const [hue, setHue] = useState(0);
  const [sepia, setSepia] = useState(0);
  const [blur, setBlur] = useState(0);
  const [vignette, setVignette] = useState(0.12);

  const applyCompositor = useCallback(() => {
    const renderer = rendererRef?.current;
    const canvas = renderer?.domElement;
    if (!renderer || !canvas) return;

    renderer.toneMappingExposure = exposure;

    canvas.style.filter = [
      `contrast(${contrast})`,
      `saturate(${saturation})`,
      `hue-rotate(${hue}deg)`,
      `sepia(${sepia})`,
      `blur(${blur}px)`
    ].join(" ");

    const wrap = canvas.parentElement;
    if (wrap) {
      wrap.style.boxShadow = `inset 0 0 ${Math.round(120 * vignette)}px rgba(0,0,0,${Math.min(0.9, vignette)})`;
    }

    window.__SPX_COMPOSITOR__ = {
      exposure, contrast, saturation, hue, sepia, blur, vignette
    };

    setStatus?.("Compositor updated");
  }, [rendererRef, setStatus, exposure, contrast, saturation, hue, sepia, blur, vignette]);

  useEffect(() => {
    if (!open) return;
    applyCompositor();
  }, [open, applyCompositor]);

  useEffect(() => {
    if (!open) return;
    applyCompositor();
  }, [exposure, contrast, saturation, hue, sepia, blur, vignette, open, applyCompositor]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 41 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">COMPOSITOR</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>

      <div className="spx-float-panel__body">
        <Slider label="EXPOSURE" value={exposure} min={0.2} max={3} step={0.01} onChange={setExposure} />
        <Slider label="CONTRAST" value={contrast} min={0.2} max={2.5} step={0.01} onChange={setContrast} />
        <Slider label="SATURATION" value={saturation} min={0} max={2.5} step={0.01} onChange={setSaturation} />
        <Slider label="HUE ROTATE" value={hue} min={-180} max={180} step={1} onChange={setHue} />
        <Slider label="SEPIA" value={sepia} min={0} max={1} step={0.01} onChange={setSepia} />
        <Slider label="BLUR" value={blur} min={0} max={8} step={0.1} onChange={setBlur} />
        <Slider label="VIGNETTE" value={vignette} min={0} max={0.8} step={0.01} onChange={setVignette} />

        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={applyCompositor}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
