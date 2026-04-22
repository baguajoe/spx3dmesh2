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

export default function PhysicsFrameworkPanel({ open, onClose, meshRef, setStatus }) {
  const [bodyType, setBodyType] = useState("rigid");
  const [mass, setMass] = useState(1.0);
  const [bounce, setBounce] = useState(0.25);
  const [friction, setFriction] = useState(0.45);
  const [damping, setDamping] = useState(0.08);

  const applyPhysics = useCallback(() => {
    const mesh = meshRef?.current;
    if (!mesh) return;
    mesh.userData.physics = { bodyType, mass, bounce, friction, damping };
    window.__SPX_PHYSICS__ = { bodyType, mass, bounce, friction, damping };
    setStatus?.("Physics values updated");
  }, [meshRef, setStatus, bodyType, mass, bounce, friction, damping]);

  useEffect(() => {
    if (!open) return;
    applyPhysics();
  }, [open, applyPhysics]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 57 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">PHYSICS FRAMEWORK</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <div className="spx-slider-wrap">
          <div className="spx-slider-header"><span>BODY TYPE</span><span className="spx-slider-header__val">{bodyType}</span></div>
          <select className="spx-slider-input" value={bodyType} onChange={(e)=>setBodyType(e.target.value)}>
            <option value="rigid">rigid</option>
            <option value="soft">soft</option>
            <option value="cloth">cloth</option>
          </select>
        </div>
        <Slider label="MASS" value={mass} min={0.1} max={50} step={0.1} onChange={setMass} />
        <Slider label="BOUNCE" value={bounce} min={0} max={1} step={0.01} onChange={setBounce} />
        <Slider label="FRICTION" value={friction} min={0} max={1} step={0.01} onChange={setFriction} />
        <Slider label="DAMPING" value={damping} min={0} max={1} step={0.01} onChange={setDamping} />
        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={applyPhysics}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
