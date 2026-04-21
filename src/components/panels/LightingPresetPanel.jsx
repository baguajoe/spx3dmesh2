import React, { useState, useCallback, useEffect } from "react";

export default function LightingPresetPanel({ open, onClose, sceneRef, setStatus }) {
  const [preset, setPreset] = useState("portrait");

  const applyLightingPreset = useCallback((name) => {
    const scene = sceneRef?.current;
    const THREE = window.THREE;
    if (!scene || !THREE) return;

    scene.traverse(obj => {
      if (obj.isLight) scene.remove(obj);
    });

    const addDir = (color, intensity, x, y, z) => {
      const l = new THREE.DirectionalLight(color, intensity);
      l.position.set(x, y, z);
      scene.add(l);
    };

    const addAmb = (color, intensity) => {
      const l = new THREE.AmbientLight(color, intensity);
      scene.add(l);
    };

    if (name === "portrait") {
      addAmb("#cfd6e6", 0.45);
      addDir("#fff2dd", 1.2, 4, 6, 4);
      addDir("#b7d2ff", 0.45, -3, 2, -3);
    } else if (name === "sunset_rim") {
      addAmb("#5e4f4a", 0.25);
      addDir("#ffb16a", 1.45, -5, 3, 2);
      addDir("#7fb7ff", 0.35, 4, 2, -3);
    } else if (name === "overcast") {
      addAmb("#d8dde8", 0.9);
      addDir("#dfe6f2", 0.45, 1, 6, 1);
    } else if (name === "horror") {
      addAmb("#202531", 0.08);
      addDir("#9bbcff", 0.28, 0, 5, -4);
      addDir("#7aff98", 0.12, -2, 0.5, 1);
    } else if (name === "neon") {
      addAmb("#171a24", 0.12);
      addDir("#00e5ff", 0.8, -4, 3, 2);
      addDir("#ff4db8", 0.75, 4, 2, -2);
    }

    setPreset(name);
    setStatus?.(`Lighting preset: ${name}`);
  }, [sceneRef, setStatus]);

  useEffect(() => {
    if (!open) return;
    applyLightingPreset(preset);
  }, [open, preset, applyLightingPreset]);

  if (!open) return null;

  return (
    <div className="spx-float-panel fcam-panel" style={{ right: 20, top: 110, width: 340, zIndex: 45 }}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot fcam-dot" />
        <span className="spx-float-panel__title fcam-title">LIGHTING PRESETS</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>×</button>}
      </div>

      <div className="spx-float-panel__body">
        <div className="fcam-focal-chips">
          {[
            ["portrait","PORTRAIT"],
            ["sunset_rim","SUNSET"],
            ["overcast","OVERCAST"],
            ["horror","HORROR"],
            ["neon","NEON"]
          ].map(([id,label]) => (
            <button key={id} className={`fcam-chip${preset===id ? " fcam-chip--active-gold" : ""}`} onClick={()=>applyLightingPreset(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
