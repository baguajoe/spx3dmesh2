import React, { useEffect, useState, useCallback } from "react";

export default function LUTPanel({ open, onClose, rendererRef, setStatus }) {
  const [preset, setPreset] = useState("neutral");

  const applyLUT = useCallback((name) => {
    const canvas = rendererRef?.current?.domElement;
    if (!canvas) return;

    let filter = "";
    if (name === "neutral") filter = "contrast(1) saturate(1)";
    else if (name === "warm_film") filter = "sepia(0.18) saturate(1.08) contrast(1.04)";
    else if (name === "cool_teal") filter = "hue-rotate(12deg) saturate(1.06)";
    else if (name === "silver_screen") filter = "grayscale(0.35) contrast(1.12)";
    else if (name === "neon_punch") filter = "saturate(1.25) contrast(1.1)";

    canvas.style.filter = filter;
    setPreset(name);
    window.__SPX_LUT__ = { preset: name, filter };
    setStatus?.(`LUT preset: ${name}`);
  }, [rendererRef, setStatus]);

  useEffect(() => {
    if (!open) return;
    applyLUT(preset);
  }, [open, preset, applyLUT]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 320, zIndex: 53 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">LUT LOOKS</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>
      <div className="spx-float-panel__body">
        <div className="fcam-focal-chips">
          {[
            ["neutral","NEUTRAL"],
            ["warm_film","WARM"],
            ["cool_teal","COOL"],
            ["silver_screen","SILVER"],
            ["neon_punch","NEON"]
          ].map(([id,label]) => (
            <button key={id} className={`fcam-chip${preset===id ? " fcam-chip--active-gold" : ""}`} onClick={()=>applyLUT(id)}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
