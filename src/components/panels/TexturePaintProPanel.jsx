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

export default function TexturePaintProPanel({ open, onClose, meshRef, setStatus }) {
  const [stencilScale, setStencilScale] = useState(1.0);
  const [projectionPaint, setProjectionPaint] = useState(0.4);
  const [cloneStrength, setCloneStrength] = useState(0.25);
  const [smearStrength, setSmearStrength] = useState(0.18);
  const [fillOpacity, setFillOpacity] = useState(0.55);

  const apply = useCallback(() => {
    const mesh = meshRef?.current;
    if (!mesh) return;
    mesh.userData.texturePaintPro = { stencilScale, projectionPaint, cloneStrength, smearStrength, fillOpacity };
    window.__SPX_TEXPAINT_PRO__ = { stencilScale, projectionPaint, cloneStrength, smearStrength, fillOpacity };
    setStatus?.("Texture paint pro updated");
  }, [meshRef, setStatus, stencilScale, projectionPaint, cloneStrength, smearStrength, fillOpacity]);

  useEffect(() => {
    if (!open) return;
    apply();
  }, [open, apply]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 63 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">TEXTURE PAINT PRO</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <Slider label="STENCIL SCALE" value={stencilScale} min={0.1} max={5} step={0.01} onChange={setStencilScale} />
        <Slider label="PROJECTION PAINT" value={projectionPaint} min={0} max={1} step={0.01} onChange={setProjectionPaint} />
        <Slider label="CLONE STRENGTH" value={cloneStrength} min={0} max={1} step={0.01} onChange={setCloneStrength} />
        <Slider label="SMEAR STRENGTH" value={smearStrength} min={0} max={1} step={0.01} onChange={setSmearStrength} />
        <Slider label="FILL OPACITY" value={fillOpacity} min={0} max={1} step={0.01} onChange={setFillOpacity} />
        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={apply}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
