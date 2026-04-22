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

export default function RiggingToolsPanel({ open, onClose, meshRef, setStatus }) {
  const [ikFkBlend, setIkFkBlend] = useState(0.5);
  const [controlSize, setControlSize] = useState(1.0);
  const [constraintMode, setConstraintMode] = useState("parent");
  const [mirrorPoses, setMirrorPoses] = useState(true);

  const applyRigTools = useCallback(() => {
    const mesh = meshRef?.current;
    if (!mesh) return;
    mesh.userData.rigTools = { ikFkBlend, controlSize, constraintMode, mirrorPoses };
    window.__SPX_RIG_TOOLS__ = { ikFkBlend, controlSize, constraintMode, mirrorPoses };
    setStatus?.("Rigging helpers updated");
  }, [meshRef, setStatus, ikFkBlend, controlSize, constraintMode, mirrorPoses]);

  useEffect(() => {
    if (!open) return;
    applyRigTools();
  }, [open, applyRigTools]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 58 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">RIGGING TOOLS</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <Slider label="IK / FK BLEND" value={ikFkBlend} min={0} max={1} step={0.01} onChange={setIkFkBlend} />
        <Slider label="CONTROL SIZE" value={controlSize} min={0.2} max={5} step={0.1} onChange={setControlSize} />
        <div className="spx-slider-wrap">
          <div className="spx-slider-header"><span>CONSTRAINT</span><span className="spx-slider-header__val">{constraintMode}</span></div>
          <select className="spx-slider-input" value={constraintMode} onChange={(e)=>setConstraintMode(e.target.value)}>
            <option value="parent">parent</option>
            <option value="orient">orient</option>
            <option value="aim">aim</option>
          </select>
        </div>
        <div className="spx-slider-wrap">
          <div className="spx-slider-header"><span>MIRROR POSES</span><span className="spx-slider-header__val">{mirrorPoses ? "on" : "off"}</span></div>
          <input type="checkbox" checked={mirrorPoses} onChange={(e)=>setMirrorPoses(e.target.checked)} />
        </div>
        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={applyRigTools}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
