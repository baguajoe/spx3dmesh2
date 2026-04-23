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

function buildBraidTube({ segments, length, turns, radius, strandRadius }) {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI * 2 * turns;
    const r = radius * (1 - t * 0.55);
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * r,
        (1 - t) * length,
        Math.sin(angle) * r
      )
    );
  }

  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(
    new THREE.TubeGeometry(curve, segments * 2, strandRadius, 10, false),
    new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.78, metalness: 0.02 })
  );
}

export default function BraidGeneratorPanel({ sceneRef, setStatus }) {
  const [segments, setSegments] = useState(36);
  const [length, setLength] = useState(2.4);
  const [turns, setTurns] = useState(7);
  const [radius, setRadius] = useState(0.22);
  const [strandRadius, setStrandRadius] = useState(0.04);
  const [count, setCount] = useState(1);

  const generate = () => {
    const scene = sceneRef?.current;
    if (!scene) return;

    for (let i = 0; i < count; i++) {
      const braid = buildBraidTube({ segments, length, turns, radius, strandRadius });
      braid.name = `SPX_Braid_${i + 1}`;
      braid.position.set((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3);
      braid.castShadow = true;
      braid.receiveShadow = true;
      scene.add(braid);
    }

    setStatus?.(`Generated ${count} braid${count > 1 ? "s" : ""} into scene`);
  };

  return (
    <div className="spx-tool-panel">
      <div className="spx-tool-panel__heading">Braid Generator</div>
      <Slider label="SEGMENTS" value={segments} min={8} max={128} step={1} onChange={setSegments} />
      <Slider label="LENGTH" value={length} min={0.5} max={5} step={0.05} onChange={setLength} />
      <Slider label="TURNS" value={turns} min={1} max={20} step={1} onChange={setTurns} />
      <Slider label="RADIUS" value={radius} min={0.05} max={1} step={0.01} onChange={setRadius} />
      <Slider label="STRAND RADIUS" value={strandRadius} min={0.01} max={0.2} step={0.005} onChange={setStrandRadius} />
      <Slider label="COUNT" value={count} min={1} max={8} step={1} onChange={setCount} />
      <div className="spx-tool-panel__buttonrow">
        <button className="spx-tool-panel__button" onClick={generate}>Generate Braid</button>
      </div>
    </div>
  );
}
