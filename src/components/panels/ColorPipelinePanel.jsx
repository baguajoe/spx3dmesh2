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

export default function ColorPipelinePanel({ open, onClose, rendererRef, setStatus }) {
  const [toneMap, setToneMap] = useState("ACES");
  const [lookPreset, setLookPreset] = useState("neutral");
  const [gammaLift, setGammaLift] = useState(1.0);
  const [highlightRoll, setHighlightRoll] = useState(0.85);
  const [shadowLift, setShadowLift] = useState(0.04);

  const applyColorPipeline = useCallback(() => {
    const renderer = rendererRef?.current;
    const canvas = renderer?.domElement;
    if (!renderer || !canvas || !window.THREE) return;

    const THREE = window.THREE;

    if (toneMap === "ACES") renderer.toneMapping = THREE.ACESFilmicToneMapping;
    else if (toneMap === "Reinhard") renderer.toneMapping = THREE.ReinhardToneMapping;
    else if (toneMap === "Cineon") renderer.toneMapping = THREE.CineonToneMapping;
    else if (toneMap === "Neutral") renderer.toneMapping = THREE.NeutralToneMapping || THREE.NoToneMapping;
    else renderer.toneMapping = THREE.NoToneMapping;

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    let filter = `brightness(${1 + shadowLift}) contrast(${1 + (highlightRoll - 0.75)}) saturate(1)`;

    if (lookPreset === "warm_film") {
      filter += " sepia(0.18) saturate(1.08)";
    } else if (lookPreset === "cool_night") {
      filter += " hue-rotate(12deg) saturate(0.94)";
    } else if (lookPreset === "teal_orange") {
      filter += " saturate(1.14) contrast(1.08)";
    } else if (lookPreset === "silver_screen") {
      filter += " grayscale(0.18) contrast(1.14)";
    }

    canvas.style.filter = filter;

    window.__SPX_COLOR_PIPELINE__ = {
      toneMap,
      lookPreset,
      gammaLift,
      highlightRoll,
      shadowLift
    };

    setStatus?.(`Color pipeline: ${toneMap} / ${lookPreset}`);
  }, [rendererRef, setStatus, toneMap, lookPreset, gammaLift, highlightRoll, shadowLift]);

  useEffect(() => {
    if (!open) return;
    applyColorPipeline();
  }, [open, applyColorPipeline]);

  useEffect(() => {
    if (!open) return;
    applyColorPipeline();
  }, [toneMap, lookPreset, gammaLift, highlightRoll, shadowLift, open, applyColorPipeline]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 42 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">COLOR PIPELINE</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>

      <div className="spx-float-panel__body">
        <div className="spx-slider-wrap">
          <div className="spx-slider-header">
            <span>TONE MAPPING</span>
            <span className="spx-slider-header__val">{toneMap}</span>
          </div>
          <select className="spx-slider-input" value={toneMap} onChange={(e)=>setToneMap(e.target.value)}>
            <option value="ACES">ACES</option>
            <option value="Reinhard">Reinhard</option>
            <option value="Cineon">Cineon</option>
            <option value="Neutral">Neutral</option>
            <option value="None">None</option>
          </select>
        </div>

        <div className="spx-slider-wrap">
          <div className="spx-slider-header">
            <span>LOOK PRESET</span>
            <span className="spx-slider-header__val">{lookPreset}</span>
          </div>
          <select className="spx-slider-input" value={lookPreset} onChange={(e)=>setLookPreset(e.target.value)}>
            <option value="neutral">neutral</option>
            <option value="warm_film">warm film</option>
            <option value="cool_night">cool night</option>
            <option value="teal_orange">teal orange</option>
            <option value="silver_screen">silver screen</option>
          </select>
        </div>

        <Slider label="GAMMA LIFT" value={gammaLift} min={0.7} max={1.4} step={0.01} onChange={setGammaLift} />
        <Slider label="HIGHLIGHT ROLLOFF" value={highlightRoll} min={0.4} max={1.2} step={0.01} onChange={setHighlightRoll} />
        <Slider label="SHADOW LIFT" value={shadowLift} min={0} max={0.25} step={0.01} onChange={setShadowLift} />

        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={applyColorPipeline}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
