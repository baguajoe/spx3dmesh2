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

export default function HairCardLODPanel({ meshRef, sceneRef, setStatus }) {
  const [lod0, setLod0] = useState(10);
  const [lod1, setLod1] = useState(30);
  const [lod2, setLod2] = useState(60);
  const [opacityStep, setOpacityStep] = useState(0.1);

  const applyLOD = () => {
    const scene = sceneRef?.current;
    const mesh = meshRef?.current;
    if (!scene || !mesh?.isMesh) {
      setStatus?.("Select a mesh first");
      return;
    }

    const lod = new THREE.LOD();
    lod.name = `SPX_LOD_${mesh.name || "Mesh"}`;

    const clone0 = mesh.clone();
    const clone1 = mesh.clone();
    const clone2 = mesh.clone();

    if (clone0.material?.clone) clone0.material = clone0.material.clone();
    if (clone1.material?.clone) clone1.material = clone1.material.clone();
    if (clone2.material?.clone) clone2.material = clone2.material.clone();

    if (clone1.material) {
      clone1.material.opacity = Math.max(0.1, 1 - opacityStep);
      clone1.material.transparent = true;
    }
    if (clone2.material) {
      clone2.material.opacity = Math.max(0.1, 1 - opacityStep * 2);
      clone2.material.transparent = true;
    }

    lod.addLevel(clone0, lod0);
    lod.addLevel(clone1, lod1);
    lod.addLevel(clone2, lod2);

    lod.position.copy(mesh.position);
    lod.rotation.copy(mesh.rotation);
    lod.scale.copy(mesh.scale);

    scene.add(lod);

    setStatus?.("LOD object added to scene");
  };

  return (
    <div className="spx-tool-panel">
      <div className="spx-tool-panel__heading">Hair Card LOD</div>
      <Slider label="LOD0 DISTANCE" value={lod0} min={1} max={50} step={1} onChange={setLod0} />
      <Slider label="LOD1 DISTANCE" value={lod1} min={5} max={100} step={1} onChange={setLod1} />
      <Slider label="LOD2 DISTANCE" value={lod2} min={10} max={200} step={1} onChange={setLod2} />
      <Slider label="OPACITY STEP" value={opacityStep} min={0.05} max={0.4} step={0.01} onChange={setOpacityStep} />

      <div className="spx-tool-panel__buttonrow">
        <button className="spx-tool-panel__button" onClick={applyLOD}>Build LOD</button>
      </div>
    </div>
  );
}
