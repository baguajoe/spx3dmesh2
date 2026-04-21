import React, { useState, useCallback, useEffect } from "react";

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

export default function MaterialNodePanel({ open, onClose, meshRef, setStatus }) {
  const [triplanarScale, setTriplanarScale] = useState(1.0);
  const [aoInfluence, setAoInfluence] = useState(0.4);
  const [curvatureInfluence, setCurvatureInfluence] = useState(0.25);
  const [gradientRamp, setGradientRamp] = useState(0.5);
  const [layerBlend, setLayerBlend] = useState(0.5);

  const applyNodes = useCallback(() => {
    const mesh = meshRef?.current;
    if (!mesh || !mesh.material) return;
    mesh.material.userData.triplanarScale = triplanarScale;
    mesh.material.userData.aoInfluence = aoInfluence;
    mesh.material.userData.curvatureInfluence = curvatureInfluence;
    mesh.material.userData.gradientRamp = gradientRamp;
    mesh.material.userData.layerBlend = layerBlend;
    mesh.material.needsUpdate = true;
    setStatus?.("Material node values updated");
  }, [meshRef, setStatus, triplanarScale, aoInfluence, curvatureInfluence, gradientRamp, layerBlend]);

  useEffect(() => {
    if (!open) return;
    applyNodes();
  }, [open, applyNodes]);

  useEffect(() => {
    if (!open) return;
    applyNodes();
  }, [triplanarScale, aoInfluence, curvatureInfluence, gradientRamp, layerBlend, open, applyNodes]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 46 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">MATERIAL NODES</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>

      <div className="spx-float-panel__body">
        <Slider label="TRIPLANAR SCALE" value={triplanarScale} min={0.1} max={8} step={0.01} onChange={setTriplanarScale} />
        <Slider label="AO INFLUENCE" value={aoInfluence} min={0} max={1} step={0.01} onChange={setAoInfluence} />
        <Slider label="CURVATURE" value={curvatureInfluence} min={0} max={1} step={0.01} onChange={setCurvatureInfluence} />
        <Slider label="GRADIENT RAMP" value={gradientRamp} min={0} max={1} step={0.01} onChange={setGradientRamp} />
        <Slider label="LAYER BLEND" value={layerBlend} min={0} max={1} step={0.01} onChange={setLayerBlend} />

        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={applyNodes}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
