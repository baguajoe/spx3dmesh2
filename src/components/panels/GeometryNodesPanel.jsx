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

export default function GeometryNodesPanel({ open, onClose, meshRef, setStatus }) {
  const [scatterCount, setScatterCount] = useState(25);
  const [arrayCount, setArrayCount] = useState(4);
  const [randomScale, setRandomScale] = useState(0.2);
  const [offsetX, setOffsetX] = useState(1.0);
  const [curveMode, setCurveMode] = useState("array");

  const applyNodes = useCallback(() => {
    const mesh = meshRef?.current;
    if (!mesh) return;
    mesh.userData.geometryNodes = { scatterCount, arrayCount, randomScale, offsetX, curveMode };
    setStatus?.("Geometry nodes values updated");
    window.__SPX_GEONODES__ = { scatterCount, arrayCount, randomScale, offsetX, curveMode };
  }, [meshRef, setStatus, scatterCount, arrayCount, randomScale, offsetX, curveMode]);

  useEffect(() => {
    if (!open) return;
    applyNodes();
  }, [open, applyNodes]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 56 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">GEOMETRY NODES</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <div className="spx-slider-wrap">
          <div className="spx-slider-header"><span>MODE</span><span className="spx-slider-header__val">{curveMode}</span></div>
          <select className="spx-slider-input" value={curveMode} onChange={(e)=>setCurveMode(e.target.value)}>
            <option value="array">array</option>
            <option value="scatter">scatter</option>
            <option value="curve">curve</option>
          </select>
        </div>
        <Slider label="SCATTER COUNT" value={scatterCount} min={1} max={500} step={1} onChange={setScatterCount} />
        <Slider label="ARRAY COUNT" value={arrayCount} min={1} max={50} step={1} onChange={setArrayCount} />
        <Slider label="RANDOM SCALE" value={randomScale} min={0} max={1} step={0.01} onChange={setRandomScale} />
        <Slider label="OFFSET X" value={offsetX} min={0} max={10} step={0.1} onChange={setOffsetX} />
        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={applyNodes}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
