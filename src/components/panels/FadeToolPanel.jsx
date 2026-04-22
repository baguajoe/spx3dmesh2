import React, { useState } from "react";
import * as THREE from "three";
import "../../styles/spx-tool-panels.css";

function Slider({ label, value, min, max, step = 0.01, onChange }) {
  return (
    <div className="spx-tool-panel__row">
      <div className="spx-tool-panel__rowhead">
        <span>{label}</span>
        <span>{typeof value === "number" ? value.toFixed(step < 0.1 ? 2 : 0) : value}</span>
      </div>
      <input
        className="spx-tool-panel__input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export default function FadeToolPanel({ meshRef, setStatus }) {
  const [fadeStrength, setFadeStrength] = useState(0.5);
  const [blend, setBlend] = useState(0.4);
  const [lineSharpness, setLineSharpness] = useState(0.7);

  const applyFade = () => {
    const mesh = meshRef?.current;
    if (!mesh?.geometry?.attributes?.position) {
      setStatus?.("Select a mesh first");
      return;
    }

    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const colors = [];
    geo.computeBoundingBox();
    const minY = geo.boundingBox.min.y;
    const maxY = geo.boundingBox.max.y;
    const height = Math.max(0.0001, maxY - minY);

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = (y - minY) / height;
      const fade = Math.max(
        0,
        Math.min(1, Math.pow(t, Math.max(0.05, lineSharpness)) * fadeStrength + (1 - fadeStrength) * blend)
      );
      colors.push(fade, fade, fade);
    }

    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => {
        m.vertexColors = true;
        m.needsUpdate = true;
      });
    } else if (mesh.material) {
      mesh.material.vertexColors = true;
      mesh.material.needsUpdate = true;
      mesh.material.userData = mesh.material.userData || {};
      mesh.material.userData.hairFade = { fadeStrength, blend, lineSharpness };
    }

    setStatus?.("Fade gradient applied to selected mesh");
  };

  return (
    <div className="spx-tool-panel">
      <div className="spx-tool-panel__heading">Fade Tool</div>
      <Slider label="FADE STRENGTH" value={fadeStrength} min={0} max={1} step={0.01} onChange={setFadeStrength} />
      <Slider label="BLEND" value={blend} min={0} max={1} step={0.01} onChange={setBlend} />
      <Slider label="LINE SHARPNESS" value={lineSharpness} min={0.05} max={2} step={0.01} onChange={setLineSharpness} />
      <div className="spx-tool-panel__buttonrow">
        <button className="spx-tool-panel__button" onClick={applyFade}>Apply Fade</button>
      </div>
    </div>
  );
}
