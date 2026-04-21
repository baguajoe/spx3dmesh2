import React, { useEffect, useState, useCallback } from "react";

function Slider({ label, value, min, max, step = 1, onChange }) {
  return (
    <div className="spx-slider-wrap">
      <div className="spx-slider-header">
        <span>{label}</span>
        <span className="spx-slider-header__val">{typeof value === "number" ? value.toFixed(step < 1 ? 2 : 0) : value}</span>
      </div>
      <input className="spx-slider-input" type="range" min={min} max={max} step={step} value={value} onChange={(e)=>onChange(parseFloat(e.target.value))} />
    </div>
  );
}

export default function RenderPresetPanel({ open, onClose, rendererRef, setStatus }) {
  const [preset, setPreset] = useState("standard");
  const [samples, setSamples] = useState(32);
  const [shadowQuality, setShadowQuality] = useState(1024);
  const [reflectionDepth, setReflectionDepth] = useState(2);
  const [giDepth, setGiDepth] = useState(2);
  const [denoiseDefault, setDenoiseDefault] = useState(true);
  const [exposure, setExposure] = useState(1.1);

  const loadPreset = useCallback((name) => {
    setPreset(name);
    if (name === "preview") {
      setSamples(8); setShadowQuality(512); setReflectionDepth(1); setGiDepth(1); setDenoiseDefault(false); setExposure(1.0);
    } else if (name === "standard") {
      setSamples(32); setShadowQuality(1024); setReflectionDepth(2); setGiDepth(2); setDenoiseDefault(true); setExposure(1.1);
    } else if (name === "high") {
      setSamples(96); setShadowQuality(2048); setReflectionDepth(3); setGiDepth(3); setDenoiseDefault(true); setExposure(1.1);
    } else if (name === "film") {
      setSamples(192); setShadowQuality(4096); setReflectionDepth(4); setGiDepth(4); setDenoiseDefault(true); setExposure(1.15);
    } else if (name === "pathtrace") {
      setSamples(384); setShadowQuality(4096); setReflectionDepth(6); setGiDepth(5); setDenoiseDefault(true); setExposure(1.12);
    }
  }, []);

  const applyPreset = useCallback(() => {
    const renderer = rendererRef?.current;
    if (!renderer) return;

    renderer.toneMappingExposure = exposure;
    if (renderer.shadowMap) {
      renderer.shadowMap.enabled = true;
    }

    window.__SPX_RENDER_PRESET__ = {
      preset, samples, shadowQuality, reflectionDepth, giDepth, denoiseDefault, exposure
    };

    setStatus?.(`Render preset: ${preset}`);
  }, [rendererRef, setStatus, preset, samples, shadowQuality, reflectionDepth, giDepth, denoiseDefault, exposure]);

  useEffect(() => {
    if (!open) return;
    applyPreset();
  }, [open, applyPreset]);

  useEffect(() => {
    if (!open) return;
    applyPreset();
  }, [preset, samples, shadowQuality, reflectionDepth, giDepth, denoiseDefault, exposure, open, applyPreset]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 44 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">RENDER PRESETS</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>

      <div className="spx-float-panel__body">
        <div className="fcam-focal-chips" style={{ marginBottom: 12 }}>
          {[
            ["preview","PREVIEW"],
            ["standard","STANDARD"],
            ["high","HIGH"],
            ["film","FILM"],
            ["pathtrace","PATHTRACE"]
          ].map(([id,label]) => (
            <button key={id} className={`fcam-chip${preset===id ? " fcam-chip--active-gold" : ""}`} onClick={()=>loadPreset(id)}>{label}</button>
          ))}
        </div>

        <Slider label="SAMPLES" value={samples} min={1} max={512} step={1} onChange={setSamples} />
        <Slider label="SHADOW QUALITY" value={shadowQuality} min={256} max={4096} step={256} onChange={setShadowQuality} />
        <Slider label="REFLECTION DEPTH" value={reflectionDepth} min={1} max={8} step={1} onChange={setReflectionDepth} />
        <Slider label="GI DEPTH" value={giDepth} min={1} max={8} step={1} onChange={setGiDepth} />
        <Slider label="EXPOSURE" value={exposure} min={0.5} max={2} step={0.01} onChange={setExposure} />

        <div className="spx-slider-wrap">
          <div className="spx-slider-header">
            <span>DENOISE DEFAULT</span>
            <span className="spx-slider-header__val">{denoiseDefault ? "on" : "off"}</span>
          </div>
          <input type="checkbox" checked={denoiseDefault} onChange={(e)=>setDenoiseDefault(e.target.checked)} />
        </div>

        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={applyPreset}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
