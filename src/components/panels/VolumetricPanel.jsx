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

export default function VolumetricPanel({ open, onClose, sceneRef, rendererRef, setStatus }) {
  const [mode, setMode] = useState("exp2");
  const [density, setDensity] = useState(0.018);
  const [nearVal, setNearVal] = useState(8);
  const [farVal, setFarVal] = useState(60);
  const [atmosphere, setAtmosphere] = useState("#b8c7d8");
  const [clearTint, setClearTint] = useState("#11151c");

  const applyVolumetrics = useCallback(() => {
    const scene = sceneRef?.current;
    const renderer = rendererRef?.current;
    const THREE = window.THREE;
    if (!scene || !renderer || !THREE) return;

    const fogColor = new THREE.Color(atmosphere);

    if (mode === "exp2") {
      scene.fog = new THREE.FogExp2(fogColor, density);
    } else if (mode === "linear") {
      scene.fog = new THREE.Fog(fogColor, nearVal, farVal);
    } else {
      scene.fog = null;
    }

    renderer.setClearColor(clearTint, 1);

    window.__SPX_VOLUMETRICS__ = {
      mode, density, nearVal, farVal, atmosphere, clearTint
    };

    setStatus?.(`Volumetrics: ${mode}`);
  }, [sceneRef, rendererRef, setStatus, mode, density, nearVal, farVal, atmosphere, clearTint]);

  useEffect(() => {
    if (!open) return;
    applyVolumetrics();
  }, [open, applyVolumetrics]);

  useEffect(() => {
    if (!open) return;
    applyVolumetrics();
  }, [mode, density, nearVal, farVal, atmosphere, clearTint, open, applyVolumetrics]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 43 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">VOLUMETRICS</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>

      <div className="spx-float-panel__body">
        <div className="spx-slider-wrap">
          <div className="spx-slider-header">
            <span>FOG MODE</span>
            <span className="spx-slider-header__val">{mode}</span>
          </div>
          <select className="spx-slider-input" value={mode} onChange={(e)=>setMode(e.target.value)}>
            <option value="exp2">exp2</option>
            <option value="linear">linear</option>
            <option value="off">off</option>
          </select>
        </div>

        <Slider label="DENSITY" value={density} min={0.001} max={0.08} step={0.001} onChange={setDensity} />
        <Slider label="NEAR" value={nearVal} min={1} max={80} step={1} onChange={setNearVal} />
        <Slider label="FAR" value={farVal} min={5} max={200} step={1} onChange={setFarVal} />

        <div className="spx-slider-wrap">
          <div className="spx-slider-header">
            <span>ATMOSPHERE</span>
            <span className="spx-slider-header__val">{atmosphere}</span>
          </div>
          <input className="spx-slider-input" type="color" value={atmosphere} onChange={(e)=>setAtmosphere(e.target.value)} />
        </div>

        <div className="spx-slider-wrap">
          <div className="spx-slider-header">
            <span>CLEAR TINT</span>
            <span className="spx-slider-header__val">{clearTint}</span>
          </div>
          <input className="spx-slider-input" type="color" value={clearTint} onChange={(e)=>setClearTint(e.target.value)} />
        </div>

        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={applyVolumetrics}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
