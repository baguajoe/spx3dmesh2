import React, { useState, useCallback, useEffect } from "react";

const PRESETS = [
  ["neutral","NEUTRAL","contrast(1) saturate(1)"],
  ["kodak_warm","KODAK WARM","sepia(0.12) saturate(1.08) contrast(1.04)"],
  ["teal_orange","TEAL/ORANGE","saturate(1.14) contrast(1.08)"],
  ["cool_steel","COOL STEEL","hue-rotate(10deg) saturate(0.92) contrast(1.04)"],
  ["silver_screen","SILVER","grayscale(0.25) contrast(1.12)"],
  ["neon_night","NEON NIGHT","saturate(1.25) contrast(1.1) hue-rotate(8deg)"]
];

export default function FilmLUTPackPanel({ open, onClose, rendererRef, setStatus }) {
  const [preset, setPreset] = useState("neutral");

  const applyPreset = useCallback((id) => {
    const canvas = rendererRef?.current?.domElement;
    if (!canvas) return;
    const found = PRESETS.find(p => p[0] === id);
    if (!found) return;
    canvas.style.filter = found[2];
    setPreset(id);
    window.__SPX_FILM_LUT_PACK__ = { preset: id, filter: found[2] };
    setStatus?.(`Film LUT: ${id}`);
  }, [rendererRef, setStatus]);

  useEffect(() => {
    if (!open) return;
    applyPreset(preset);
  }, [open, preset, applyPreset]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 320, zIndex: 70 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">FILM LUT PACK</span>
        <button className="spx-float-panel__close" onClick={onClose}>×</button>
      </div>
      <div className="spx-float-panel__body">
        <div className="fcam-focal-chips">
          {PRESETS.map(([id,label]) => (
            <button key={id} className={`fcam-chip${preset===id ? " fcam-chip--active-gold" : ""}`} onClick={()=>applyPreset(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
