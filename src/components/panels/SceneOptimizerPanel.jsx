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

export default function SceneOptimizerPanel({ open, onClose, meshRef, rendererRef, setStatus }) {
  const [lodTarget, setLodTarget] = useState(0.6);
  const [textureMax, setTextureMax] = useState(2048);
  const [triangleCount, setTriangleCount] = useState(0);

  const analyze = useCallback(() => {
    const mesh = meshRef?.current;
    const renderer = rendererRef?.current;
    let tris = 0;
    if (mesh?.geometry?.attributes?.position) {
      const count = mesh.geometry.attributes.position.count || 0;
      tris = Math.floor(count / 3);
    } else if (renderer?.info?.render?.triangles) {
      tris = renderer.info.render.triangles;
    }
    setTriangleCount(tris);
    window.__SPX_OPTIMIZER__ = { lodTarget, textureMax, triangleCount: tris };
    setStatus?.(`Optimizer analyzed: ${tris} tris`);
  }, [meshRef, rendererRef, setStatus, lodTarget, textureMax]);

  useEffect(() => {
    if (!open) return;
    analyze();
  }, [open, analyze]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 360, zIndex: 59 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">SCENE OPTIMIZER</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <div className="spx-slider-wrap">
          <div className="spx-slider-header"><span>TRIANGLES</span><span className="spx-slider-header__val">{triangleCount}</span></div>
        </div>
        <Slider label="LOD TARGET" value={lodTarget} min={0.1} max={1} step={0.01} onChange={setLodTarget} />
        <Slider label="TEXTURE MAX" value={textureMax} min={256} max={4096} step={256} onChange={setTextureMax} />
        <div className="fcam-focal-chips" style={{ marginTop: 12 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={analyze}>ANALYZE</button>
        </div>
      </div>
    </div>
  );
}
