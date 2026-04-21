import React from "react";

export default function QuickExportPanel({ open, onClose, setStatus }) {
  if (!open) return null;

  const act = (fn, label) => {
    try {
      fn?.();
      setStatus?.(label);
    } catch (e) {
      setStatus?.(`Export error: ${e.message}`);
    }
  };

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 320, zIndex: 49 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">QUICK EXPORT</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>

      <div className="spx-float-panel__body">
        <div className="fcam-focal-chips" style={{ display: "grid", gap: 8 }}>
          <button className="fcam-chip fcam-chip--active-gold" onClick={()=>act(window.captureSPXAOVs, "AOV export")}>EXPORT AOVS</button>
          <button className="fcam-chip" onClick={()=>act(()=>window.runSPXDenoise?.(), "Denoised export")}>DENOISE EXPORT</button>
          <button className="fcam-chip" onClick={()=>act(()=>window.captureSPXAOVs?.(), "Beauty export")}>BEAUTY EXPORT</button>
        </div>
      </div>
    </div>
  );
}
