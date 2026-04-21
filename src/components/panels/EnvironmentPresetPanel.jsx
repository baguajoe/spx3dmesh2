import React, { useEffect, useState, useCallback } from "react";

export default function EnvironmentPresetPanel({ open, onClose, sceneRef, rendererRef, setStatus }) {
  const [preset, setPreset] = useState("studio");

  const applyPreset = useCallback((name) => {
    const scene = sceneRef?.current;
    const renderer = rendererRef?.current;
    const THREE = window.THREE;
    if (!scene || !renderer || !THREE) return;

    if (name === "studio") {
      scene.background = new THREE.Color("#1a1d24");
      renderer.setClearColor("#1a1d24", 1);
    } else if (name === "sunset") {
      scene.background = new THREE.Color("#7f5a4a");
      renderer.setClearColor("#7f5a4a", 1);
    } else if (name === "night") {
      scene.background = new THREE.Color("#0d1320");
      renderer.setClearColor("#0d1320", 1);
    } else if (name === "overcast") {
      scene.background = new THREE.Color("#aeb7c4");
      renderer.setClearColor("#aeb7c4", 1);
    } else if (name === "fantasy") {
      scene.background = new THREE.Color("#4d4b7d");
      renderer.setClearColor("#4d4b7d", 1);
    }

    setPreset(name);
    window.__SPX_ENV_PRESET__ = { preset: name };
    setStatus?.(`Environment preset: ${name}`);
  }, [sceneRef, rendererRef, setStatus]);

  useEffect(() => {
    if (!open) return;
    applyPreset(preset);
  }, [open, preset, applyPreset]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 320, zIndex: 54 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">ENVIRONMENT PRESETS</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>
      <div className="spx-float-panel__body">
        <div className="fcam-focal-chips">
          {[
            ["studio","STUDIO"],
            ["sunset","SUNSET"],
            ["night","NIGHT"],
            ["overcast","OVERCAST"],
            ["fantasy","FANTASY"]
          ].map(([id,label]) => (
            <button key={id} className={`fcam-chip${preset===id ? " fcam-chip--active-gold" : ""}`} onClick={()=>applyPreset(id)}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
